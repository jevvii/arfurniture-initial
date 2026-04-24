import express from 'express'
import { ObjectId } from 'mongodb'
import { validateObjectId } from '../middleware/validators.mjs'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

// Get all banners
router.get('/', asyncHandler(async (req, res) => {
  logger.request(req, 'Fetching all banners')
  
  const banners = req.app.locals.collections.banners
  const allBanners = await banners.find({}).toArray()
  
  const normalized = allBanners.map(b => ({
    ...b,
    _id: b._id.toString()
  }))
  
  logger.success(`Retrieved ${normalized.length} banners`, { requestId: req.requestId, count: normalized.length })
  return res.json(normalized)
}))

// Create banner
router.post('/', asyncHandler(async (req, res) => {
  logger.request(req, 'Creating new banner')
  
  const banners = req.app.locals.collections.banners
  const result = await banners.insertOne(req.body)
  
  logger.success(`Banner created: ${result.insertedId}`, { requestId: req.requestId, bannerId: result.insertedId.toString() })
  return res.json({ ...req.body, _id: result.insertedId.toString() })
}))

// Update banner
router.put('/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const { _id, ...updates } = req.body
    
    logger.request(req, `Updating banner: ${req.params.id}`)
    
    const banners = req.app.locals.collections.banners
    const result = await banners.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    )
    
    if (result.matchedCount === 0) {
      logger.warn('Banner not found for update', { requestId: req.requestId, bannerId: req.params.id })
      return res.status(404).json({ error: 'Banner not found' })
    }
    
    const updated = await banners.findOne({ _id: new ObjectId(req.params.id) })
    
    logger.success(`Banner updated: ${req.params.id}`, { requestId: req.requestId, bannerId: req.params.id })
    return res.json({ ...updated, _id: updated._id.toString() })
  })
)

// Delete banner
router.delete('/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Deleting banner: ${req.params.id}`)
    
    const banners = req.app.locals.collections.banners
    const result = await banners.deleteOne({ _id: new ObjectId(req.params.id) })
    
    if (result.deletedCount === 0) {
      logger.warn('Banner not found for deletion', { requestId: req.requestId, bannerId: req.params.id })
      return res.status(404).json({ error: 'Banner not found' })
    }
    
    logger.success(`Banner deleted: ${req.params.id}`, { requestId: req.requestId, bannerId: req.params.id })
    return res.json({ success: true })
  })
)

export default router
