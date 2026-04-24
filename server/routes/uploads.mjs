import express from 'express'
import multer from 'multer'
import { validateFileUpload, validateImageFile, validateModelFile } from '../middleware/validators.mjs'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import { getSupabaseClient, BUCKET_NAME } from '../config/storage.mjs'
import { sanitizeFolderName, sanitizeFileName, getPathFromUrl, deleteSupabaseFolder } from '../utils/supabase.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

// Memory storage for uploads
const memoryStorage = multer.memoryStorage()

const uploadModelToSupabase = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

const uploadImageToSupabase = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// Upload image endpoint
router.post('/image',
  uploadImageToSupabase.single('file'),
  validateFileUpload,
  validateImageFile,
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      logger.error('Supabase not configured', null, { requestId: req.requestId })
      return res.status(500).json({ error: 'Storage not configured' })
    }
    
    const productFolder = sanitizeFolderName(req.body.productName || req.query.productName)
    const variantName = req.body.variantName || req.query.variantName
    const fileName = `${Date.now()}-${sanitizeFileName(req.file.originalname)}`
    
    const vName = sanitizeFolderName(variantName || 'main')
    const typeFolder = 'images'
    const folderPath = `${productFolder}/${vName}/${typeFolder}`
    const filePath = `${folderPath}/${fileName}`
    
    logger.info(`Uploading image: ${filePath}`, { 
      requestId: req.requestId,
      product: productFolder,
      variant: vName,
      size: req.file.size,
      type: req.file.mimetype
    })
    
    // Delete existing files in this variant's images folder first
    logger.debug(`Deleting existing images in: ${folderPath}`, { requestId: req.requestId })
    await deleteSupabaseFolder(supabase, folderPath)
    
    // Upload new image
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      })
    
    if (error) {
      logger.error('Image upload failed', error, { requestId: req.requestId, filePath })
      throw error
    }
    
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)
    
    const url = publicUrlData.publicUrl
    logger.success(`Image uploaded successfully: ${fileName}`, { requestId: req.requestId, url })
    
    return res.json({ url })
  })
)

// Upload additional image endpoint
router.post('/additional-image',
  uploadImageToSupabase.single('file'),
  validateFileUpload,
  validateImageFile,
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      logger.error('Supabase not configured', null, { requestId: req.requestId })
      return res.status(500).json({ error: 'Storage not configured' })
    }
    
    const productFolder = sanitizeFolderName(req.body.productName || req.query.productName)
    const fileName = `${Date.now()}-${sanitizeFileName(req.file.originalname)}`
    const filePath = `${productFolder}/additional-images/${fileName}`
    
    logger.info(`Uploading additional image: ${filePath}`, {
      requestId: req.requestId,
      product: productFolder,
      size: req.file.size,
      type: req.file.mimetype
    })
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      })
    
    if (error) {
      logger.error('Additional image upload failed', error, { requestId: req.requestId, filePath })
      throw error
    }
    
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)
    
    const url = publicUrlData.publicUrl
    logger.success(`Additional image uploaded: ${fileName}`, { requestId: req.requestId, url })
    
    return res.json({ url })
  })
)

// Delete additional image endpoint
router.delete('/additional-image',
  asyncHandler(async (req, res) => {
    const imageUrl = req.query.url
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'No URL provided' })
    }
    
    const supabase = getSupabaseClient()
    if (!supabase) {
      logger.error('Supabase not configured', null, { requestId: req.requestId })
      return res.status(500).json({ error: 'Storage not configured' })
    }
    
    const filePath = getPathFromUrl(imageUrl)
    
    if (filePath) {
      logger.info(`Deleting additional image: ${filePath}`, { requestId: req.requestId, url: imageUrl })
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])
      
      if (error) {
        logger.error('Failed to delete additional image', error, { requestId: req.requestId, filePath })
        throw error
      }
      
      logger.success('Additional image deleted', { requestId: req.requestId, filePath })
    } else {
      logger.warn('Could not extract path from URL, skipping delete', { requestId: req.requestId, url: imageUrl })
    }
    
    return res.json({ success: true })
  })
)

// Upload GLB model endpoint
router.post('/model',
  uploadModelToSupabase.single('file'),
  validateFileUpload,
  validateModelFile,
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      logger.error('Supabase not configured', null, { requestId: req.requestId })
      return res.status(500).json({ error: 'Storage not configured' })
    }
    
    const productFolder = sanitizeFolderName(req.body.productName || req.query.productName)
    const variantName = req.body.variantName || req.query.variantName
    const fileName = `${Date.now()}-${sanitizeFileName(req.file.originalname)}`
    
    const vName = sanitizeFolderName(variantName || 'main')
    const typeFolder = 'model'
    const folderPath = `${productFolder}/${vName}/${typeFolder}`
    const filePath = `${folderPath}/${fileName}`
    
    logger.info(`Uploading 3D model: ${filePath}`, {
      requestId: req.requestId,
      product: productFolder,
      variant: vName,
      size: req.file.size,
      type: req.file.mimetype
    })
    
    // Delete existing models in this variant's model folder first
    logger.debug(`Deleting existing models in: ${folderPath}`, { requestId: req.requestId })
    await deleteSupabaseFolder(supabase, folderPath)
    
    // Upload new model
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType: 'model/gltf-binary',
        upsert: true
      })
    
    if (error) {
      logger.error('Model upload failed', error, { requestId: req.requestId, filePath })
      throw error
    }
    
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)
    
    const url = publicUrlData.publicUrl
    logger.success(`3D model uploaded successfully: ${fileName}`, { requestId: req.requestId, url })
    
    return res.json({ url })
  })
)

// Upload Logo endpoint
router.post('/logo',
  uploadImageToSupabase.single('file'),
  validateFileUpload,
  validateImageFile,
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      logger.error('Supabase not configured', null, { requestId: req.requestId })
      return res.status(500).json({ error: 'Storage not configured' })
    }
    
    // Use a fixed name or timestamped name in a 'settings' folder
    const fileName = `logo-${Date.now()}-${sanitizeFileName(req.file.originalname)}`
    const filePath = `settings/${fileName}`
    
    logger.info(`Uploading store logo: ${filePath}`, {
      requestId: req.requestId,
      size: req.file.size,
      type: req.file.mimetype
    })
    
    // Optional: Delete old logos if we want to keep it clean, 
    // but might be safer to keep history for now or let admin delete manually (?)
    // For now, let's just upload.
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      })
    
    if (error) {
      logger.error('Logo upload failed', error, { requestId: req.requestId, filePath })
      throw error
    }
    
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)
    
    const url = publicUrlData.publicUrl
    logger.success(`Store logo uploaded: ${fileName}`, { requestId: req.requestId, url })
    
    return res.json({ url })
  })
)

export default router
