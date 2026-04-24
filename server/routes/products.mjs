import express from 'express'
import { ObjectId } from 'mongodb'
import { validateObjectId } from '../middleware/validators.mjs'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import { getSupabaseClient } from '../config/storage.mjs'
import { getPathFromUrl, deleteSupabaseFolder, deleteProductFolders, sanitizeFolderName, BUCKET_NAME } from '../utils/supabase.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

// Get all products
router.get('/', asyncHandler(async (req, res) => {
  logger.request(req, 'Fetching all products')
  
  const products = req.app.locals.collections.products
  const allProducts = await products.find({}).toArray()
  
  const normalized = allProducts.map(p => ({
    ...p,
    _id: p._id.toString(),
    createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
  }))
  
  logger.success(`Retrieved ${normalized.length} products`, { requestId: req.requestId, count: normalized.length })
  return res.json(normalized)
}))

// Get product by ID
router.get('/:id', 
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Fetching product: ${req.params.id}`)
    
    const products = req.app.locals.collections.products
    const product = await products.findOne({ _id: new ObjectId(req.params.id) })
    
    if (!product) {
      logger.warn('Product not found', { requestId: req.requestId, productId: req.params.id })
      return res.status(404).json({ error: 'Product not found' })
    }
    
    logger.success(`Product found: ${product.name}`, { requestId: req.requestId, productId: req.params.id })
    return res.json({
      ...product,
      _id: product._id.toString(),
      createdAt: product.createdAt ? new Date(product.createdAt) : new Date()
    })
  })
)

// Create product
router.post('/', asyncHandler(async (req, res) => {
  logger.request(req, `Creating product: ${req.body.name}`)
  
  const productData = {
    ...req.body,
    createdAt: new Date()
  }
  
  const products = req.app.locals.collections.products
  const result = await products.insertOne(productData)
  
  logger.success(`Product created: ${productData.name}`, { 
    requestId: req.requestId, 
    productId: result.insertedId.toString() 
  })
  
  return res.json({ ...productData, _id: result.insertedId.toString() })
}))

// Update product
router.put('/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const { _id, ...updates } = req.body
    const supabase = getSupabaseClient()
    
    logger.request(req, `Updating product: ${req.params.id}`)
    logger.debug('Product update data', { 
      requestId: req.requestId, 
      productId: req.params.id,
      hasVariants: !!updates.variants,
      variantCount: updates.variants?.length
    })
    
    const products = req.app.locals.collections.products
    const existingProduct = await products.findOne({ _id: new ObjectId(req.params.id) })
    
    if (!existingProduct) {
      logger.warn('Product not found for update', { requestId: req.requestId, productId: req.params.id })
      return res.status(404).json({ error: 'Product not found' })
    }
    
    logger.debug(`Existing product: ${existingProduct.name}`, { 
      requestId: req.requestId,
      existingVariantCount: existingProduct.variants?.length
    })
    
    // Handle asset cleanup
    if (supabase) {
      // 1. Handle main image replacement
      if (updates.image && existingProduct.image && updates.image !== existingProduct.image) {
        const oldPath = getPathFromUrl(existingProduct.image)
        if (oldPath) {
          logger.info(`Deleting old main image: ${oldPath}`, { requestId: req.requestId })
          await supabase.storage.from(BUCKET_NAME).remove([oldPath])
        }
      }
      
      // 2. Handle additional images removal
      if (updates.images && Array.isArray(updates.images) && existingProduct.images && Array.isArray(existingProduct.images)) {
        const newImagesSet = new Set(updates.images)
        const imagesToDelete = existingProduct.images.filter(img => !newImagesSet.has(img))
        
        if (imagesToDelete.length > 0) {
          const pathsToDelete = imagesToDelete.map(url => getPathFromUrl(url)).filter(Boolean)
          if (pathsToDelete.length > 0) {
            logger.info(`Deleting ${pathsToDelete.length} removed additional images`, { requestId: req.requestId })
            await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete)
          }
        }
      }
      
      // 3. Handle AR model replacement
      if (updates.arModelUrl && existingProduct.arModelUrl && updates.arModelUrl !== existingProduct.arModelUrl) {
        const oldModelPath = getPathFromUrl(existingProduct.arModelUrl)
        if (oldModelPath) {
          logger.info(`Deleting old AR model: ${oldModelPath}`, { requestId: req.requestId })
          await supabase.storage.from(BUCKET_NAME).remove([oldModelPath])
        }
      }
      
      // 4. Handle variant asset cleanup
      if (updates.variants && Array.isArray(updates.variants) && existingProduct.variants && Array.isArray(existingProduct.variants)) {
        logger.debug('Checking variant changes for cleanup', { requestId: req.requestId })
        
        const newVariantsMap = new Map(updates.variants.map(v => [v.id, v]))
        
        for (const oldVariant of existingProduct.variants) {
          const newVariant = newVariantsMap.get(oldVariant.id)
          
          if (!newVariant) {
            // Variant was deleted
            logger.info(`Variant deleted: "${oldVariant.name}" (ID: ${oldVariant.id})`, { requestId: req.requestId })
            
            // Delete specific files by URL
            const assetsToPurge = []
            if (oldVariant.imageUrl) assetsToPurge.push(getPathFromUrl(oldVariant.imageUrl))
            if (oldVariant.arModelUrl) assetsToPurge.push(getPathFromUrl(oldVariant.arModelUrl))
            
            const filteredAssets = assetsToPurge.filter(Boolean)
            if (filteredAssets.length > 0) {
              logger.info(`Purging ${filteredAssets.length} variant assets`, { 
                requestId: req.requestId,
                variant: oldVariant.name,
                assets: filteredAssets
              })
              const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(filteredAssets)
              if (removeError) {
                logger.error('Error removing variant assets', removeError, { requestId: req.requestId })
              }
            }
            
            // Purge folders (both old and new structures)
            const productFolder = sanitizeFolderName(existingProduct.name)
            const vName = sanitizeFolderName(oldVariant.name)
            
            // Try new structure: product/variant/
            await deleteSupabaseFolder(supabase, `${productFolder}/${vName}`)
            
            // Try old structure: product/variants/variant/
            await deleteSupabaseFolder(supabase, `${productFolder}/variants/${vName}`)
          } else {
            // Variant still exists, check for asset updates
            const assetsToRemove = []
            
            if (newVariant.imageUrl !== oldVariant.imageUrl && oldVariant.imageUrl) {
              assetsToRemove.push(getPathFromUrl(oldVariant.imageUrl))
            }
            
            if (newVariant.arModelUrl !== oldVariant.arModelUrl && oldVariant.arModelUrl) {
              assetsToRemove.push(getPathFromUrl(oldVariant.arModelUrl))
            }
            
            const filteredAssets = assetsToRemove.filter(Boolean)
            if (filteredAssets.length > 0) {
              logger.info(`Deleting updated variant assets for "${oldVariant.name}"`, {
                requestId: req.requestId,
                assets: filteredAssets
              })
              await supabase.storage.from(BUCKET_NAME).remove(filteredAssets)
            }
          }
        }
      }
    }
    
    // Update product in database
    await products.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    )
    
    const updated = await products.findOne({ _id: new ObjectId(req.params.id) })
    
    logger.success(`Product updated: ${updated.name}`, { 
      requestId: req.requestId,
      productId: req.params.id,
      updatedVariantCount: updated.variants?.length
    })
    
    return res.json({ ...updated, _id: updated._id.toString() })
  })
)

// Delete product
router.delete('/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Deleting product: ${req.params.id}`)
    
    const products = req.app.locals.collections.products
    const product = await products.findOne({ _id: new ObjectId(req.params.id) })
    
    if (!product) {
      logger.warn('Product not found for deletion', { requestId: req.requestId, productId: req.params.id })
      return res.status(404).json({ error: 'Product not found' })
    }
    
    // Delete from database
    await products.deleteOne({ _id: new ObjectId(req.params.id) })
    
    // Delete product folders
    const supabase = getSupabaseClient()
    if (product.name && supabase) {
      logger.info(`Deleting folders for product: ${product.name}`, { requestId: req.requestId })
      await deleteProductFolders(supabase, product.name)
    }
    
    logger.success(`Product deleted: ${product.name}`, { requestId: req.requestId, productId: req.params.id })
    return res.json({ success: true })
  })
)

export default router
