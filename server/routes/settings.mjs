import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

// Get store settings
router.get('/', asyncHandler(async (req, res) => {
  const { settings } = req.app.locals.collections
  
  // Try to find the settings document (there should be only one)
  const storeSettings = await settings.findOne({ type: 'general' })
  
  if (!storeSettings) {
    // Return default settings if none found
    return res.json({
      storeName: 'ARFurniture',
      logoUrl: null
    })
  }
  
  return res.json(storeSettings)
}))

// Update store settings
router.put('/', asyncHandler(async (req, res) => {
  const { settings } = req.app.locals.collections
  const { storeName, logoUrl } = req.body
  
  // Validate input
  if (!storeName) {
    return res.status(400).json({ error: 'Store name is required' })
  }
  
  const updateData = {
    type: 'general',
    storeName,
    updatedAt: new Date()
  }
  
  if (logoUrl !== undefined) {
    updateData.logoUrl = logoUrl
  }
  
  const result = await settings.findOneAndUpdate(
    { type: 'general' },
    { $set: updateData },
    { upsert: true, returnDocument: 'after' }
  )
  
  logger.info('Store settings updated', { 
    requestId: req.requestId, 
    storeName,
    hasLogo: !!logoUrl 
  })
  
  return res.json(result)
}))

export default router
