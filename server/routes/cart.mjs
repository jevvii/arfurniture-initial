import express from 'express'
import { ObjectId } from 'mongodb'
import { validateObjectId } from '../middleware/validators.mjs'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

// Get user's cart
router.get('/:userId',
  validateObjectId('userId'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Fetching cart for user: ${req.params.userId}`)
    
    const carts = req.app.locals.collections.carts
    const products = req.app.locals.collections.products
    
    let cart = await carts.findOne({ userId: new ObjectId(req.params.userId) })
    
    // If no cart exists, return empty cart
    if (!cart) {
      logger.info('No cart found, returning empty cart', { requestId: req.requestId, userId: req.params.userId })
      return res.json({ userId: req.params.userId, items: [] })
    }
    
    // Populate product details for each cart item
    const populatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await products.findOne({ _id: new ObjectId(item.productId) })
        
        if (!product) {
          logger.warn('Product not found in cart item', { 
            requestId: req.requestId, 
            productId: item.productId.toString() 
          })
          return null
        }
        
        // Transform to match frontend CartItem structure
        return {
          ...product,
          _id: product._id.toString(),
          quantity: item.quantity,
          selectedVariant: item.variantId && product.variants 
            ? product.variants.find(v => v.id === item.variantId)
            : undefined,
          createdAt: product.createdAt ? new Date(product.createdAt) : new Date()
        }
      })
    )
    
    // Filter out null items (products that were deleted)
    const validItems = populatedItems.filter(item => item !== null)
    
    logger.success(`Cart retrieved with ${validItems.length} items`, { 
      requestId: req.requestId, 
      userId: req.params.userId,
      itemCount: validItems.length
    })
    
    return res.json({
      userId: req.params.userId,
      items: validItems
    })
  })
)

// Add item to cart
router.post('/:userId/items',
  validateObjectId('userId'),
  asyncHandler(async (req, res) => {
    const { productId, variantId, quantity = 1 } = req.body
    
    if (!productId) {
      return res.status(400).json({ error: 'productId is required' })
    }
    
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid productId format' })
    }
    
    logger.request(req, `Adding item to cart: ${productId}`, {
      userId: req.params.userId,
      variantId,
      quantity
    })
    
    const carts = req.app.locals.collections.carts
    const products = req.app.locals.collections.products
    
    // Verify product exists
    const product = await products.findOne({ _id: new ObjectId(productId) })
    if (!product) {
      logger.warn('Product not found', { requestId: req.requestId, productId })
      return res.status(404).json({ error: 'Product not found' })
    }
    
    // If variant specified, verify it exists
    if (variantId && product.variants) {
      const variantExists = product.variants.some(v => v.id === variantId)
      if (!variantExists) {
        logger.warn('Variant not found', { requestId: req.requestId, productId, variantId })
        return res.status(404).json({ error: 'Variant not found' })
      }
    }
    
    const userId = new ObjectId(req.params.userId)
    
    // Check if cart exists
    let cart = await carts.findOne({ userId })
    
    if (!cart) {
      // Create new cart
      logger.info('Creating new cart for user', { requestId: req.requestId, userId: req.params.userId })
      await carts.insertOne({
        userId,
        items: [{
          productId: new ObjectId(productId),
          variantId: variantId || null,
          quantity: Number(quantity)
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } else {
      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId && 
        (variantId ? item.variantId === variantId : !item.variantId)
      )
      
      if (existingItemIndex !== -1) {
        // Update quantity of existing item
        logger.info('Updating existing cart item quantity', { 
          requestId: req.requestId, 
          productId,
          variantId,
          oldQuantity: cart.items[existingItemIndex].quantity,
          newQuantity: cart.items[existingItemIndex].quantity + Number(quantity)
        })
        
        await carts.updateOne(
          { 
            userId,
            'items.productId': new ObjectId(productId),
            'items.variantId': variantId || null
          },
          { 
            $inc: { 'items.$.quantity': Number(quantity) },
            $set: { updatedAt: new Date() }
          }
        )
      } else {
        // Add new item to cart
        logger.info('Adding new item to cart', { requestId: req.requestId, productId, variantId })
        
        await carts.updateOne(
          { userId },
          { 
            $push: { 
              items: {
                productId: new ObjectId(productId),
                variantId: variantId || null,
                quantity: Number(quantity)
              }
            },
            $set: { updatedAt: new Date() }
          }
        )
      }
    }
    
    logger.success('Item added to cart', { 
      requestId: req.requestId, 
      userId: req.params.userId,
      productId,
      variantId
    })
    
    return res.json({ success: true })
  })
)

// Update cart item quantity
router.put('/:userId/items/:productId',
  validateObjectId('userId'),
  validateObjectId('productId'),
  asyncHandler(async (req, res) => {
    const { quantity, variantId } = req.body
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required (minimum 1)' })
    }
    
    logger.request(req, `Updating cart item quantity: ${req.params.productId}`, {
      userId: req.params.userId,
      variantId,
      newQuantity: quantity
    })
    
    const carts = req.app.locals.collections.carts
    const userId = new ObjectId(req.params.userId)
    const productId = new ObjectId(req.params.productId)
    
    // Update the specific item's quantity
    const result = await carts.updateOne(
      { 
        userId,
        'items.productId': productId,
        'items.variantId': variantId || null
      },
      { 
        $set: { 
          'items.$.quantity': Number(quantity),
          updatedAt: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      logger.warn('Cart item not found for update', { 
        requestId: req.requestId, 
        userId: req.params.userId,
        productId: req.params.productId,
        variantId
      })
      return res.status(404).json({ error: 'Cart item not found' })
    }
    
    logger.success('Cart item quantity updated', { 
      requestId: req.requestId, 
      userId: req.params.userId,
      productId: req.params.productId,
      variantId,
      newQuantity: quantity
    })
    
    return res.json({ success: true })
  })
)

// Remove item from cart
router.delete('/:userId/items/:productId',
  validateObjectId('userId'),
  validateObjectId('productId'),
  asyncHandler(async (req, res) => {
    const { variantId } = req.query
    
    logger.request(req, `Removing item from cart: ${req.params.productId}`, {
      userId: req.params.userId,
      variantId
    })
    
    const carts = req.app.locals.collections.carts
    const userId = new ObjectId(req.params.userId)
    const productId = new ObjectId(req.params.productId)
    
    const result = await carts.updateOne(
      { userId },
      { 
        $pull: { 
          items: {
            productId,
            variantId: variantId || null
          }
        },
        $set: { updatedAt: new Date() }
      }
    )
    
    if (result.matchedCount === 0) {
      logger.warn('Cart not found for item removal', { 
        requestId: req.requestId, 
        userId: req.params.userId 
      })
      return res.status(404).json({ error: 'Cart not found' })
    }
    
    logger.success('Item removed from cart', { 
      requestId: req.requestId, 
      userId: req.params.userId,
      productId: req.params.productId,
      variantId
    })
    
    return res.json({ success: true })
  })
)

// Clear entire cart
router.delete('/:userId',
  validateObjectId('userId'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Clearing cart for user: ${req.params.userId}`)
    
    const carts = req.app.locals.collections.carts
    const userId = new ObjectId(req.params.userId)
    
    const result = await carts.updateOne(
      { userId },
      { 
        $set: { 
          items: [],
          updatedAt: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      // Cart doesn't exist, which is fine - nothing to clear
      logger.info('No cart found to clear', { requestId: req.requestId, userId: req.params.userId })
      return res.json({ success: true })
    }
    
    logger.success('Cart cleared', { requestId: req.requestId, userId: req.params.userId })
    
    return res.json({ success: true })
  })
)

export default router
