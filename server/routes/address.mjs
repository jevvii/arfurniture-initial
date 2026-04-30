import express from 'express'
import { ObjectId } from 'mongodb'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { v4: uuidv4 } = require('uuid');
import { asyncHandler } from '../middleware/errorHandler.mjs'
import { validateRequiredFields } from '../middleware/validators.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

// Get all addresses for user
router.get('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params
  
  logger.request(req, `Fetching addresses for user: ${userId}`)
  
  const users = req.app.locals.collections.users
  const user = await users.findOne({ _id: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) })
  
  if (!user) {
    logger.warn('User not found for address fetch', { requestId: req.requestId, userId })
    return res.status(404).json({ error: 'User not found' })
  }
  
  const addresses = user.addresses || []
  
  logger.success(`Retrieved ${addresses.length} addresses`, { requestId: req.requestId, userId })
  return res.json(addresses)
}))

// Add new address
router.post('/:userId', 
  validateRequiredFields(['street', 'city', 'state', 'zipCode', 'country']),
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    const addressData = req.body
    
    logger.request(req, `Adding address for user: ${userId}`)
    
    const newAddress = {
      id: uuidv4(),
      ...addressData,
      createdAt: new Date()
    }
    
    const users = req.app.locals.collections.users
    const result = await users.updateOne(
      { _id: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) },
      { $push: { addresses: newAddress } }
    )
    
    if (result.matchedCount === 0) {
      logger.warn('User not found for address update', { requestId: req.requestId, userId })
      return res.status(404).json({ error: 'User not found' })
    }
    
    logger.success(`Address added for user: ${userId}`, { requestId: req.requestId, addressId: newAddress.id })
    return res.status(201).json(newAddress)
  })
)

// Update address
router.put('/:userId/:addressId',
  asyncHandler(async (req, res) => {
    const { userId, addressId } = req.params
    const updates = req.body
    
    logger.request(req, `Updating address ${addressId} for user: ${userId}`)
    
    // Construct updates object specifically targeting fields
    // We cannot easily use $set with array element matching if we want to update multiple fields
    // Instead we can use arrayFilters or find and update specific index if known, but arrayFilters is cleaner
    
    const users = req.app.locals.collections.users
    
    // Clean updates to prevent overwriting id or createdAt
    delete updates.id
    delete updates.createdAt
    
    // Construct the modification object
    // Using simple $set with array positional operator requires finding the index first or using arrayFilters
    // MongoDB array update with id:
    
    // Let's iterate keys for $set
    const setFields = {}
    for (const [key, value] of Object.entries(updates)) {
      setFields[`addresses.$.${key}`] = value
    }
    
    const updateResult = await users.updateOne(
      { 
        _id: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId), 
        "addresses.id": addressId 
      },
      { $set: setFields }
    )
    
    if (updateResult.matchedCount === 0) {
       // Could be user not found OR address not found
       logger.warn('Address or User not found for update', { requestId: req.requestId, userId, addressId })
       return res.status(404).json({ error: 'User or Address not found' })
    }

    // Return the updated address - we need to fetch it again or just return the data + id
    // Fetching is better to be sure
    const user = await users.findOne(
        { _id: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) },
        { projection: { addresses: { $elemMatch: { id: addressId } } } }
    )
    
    const updatedAddress = user?.addresses?.[0]
    
    logger.success(`Address updated: ${addressId}`, { requestId: req.requestId })
    return res.json(updatedAddress)
  })
)

// Delete address
router.delete('/:userId/:addressId',
  asyncHandler(async (req, res) => {
    const { userId, addressId } = req.params
    
    logger.request(req, `Deleting address ${addressId} for user: ${userId}`)
    
    const users = req.app.locals.collections.users
    const result = await users.updateOne(
      { _id: (ObjectId.isValid(userId) ? new ObjectId(userId) : userId) },
      { $pull: { addresses: { id: addressId } } }
    )
    
    if (result.matchedCount === 0) {
      logger.warn('User not found for address deletion', { requestId: req.requestId, userId })
      return res.status(404).json({ error: 'User not found' })
    }
    
    if (result.modifiedCount === 0) {
        logger.warn('Address not found for deletion', { requestId: req.requestId, userId, addressId })
        return res.status(404).json({ error: 'Address not found' })
    }
    
    logger.success(`Address deleted: ${addressId}`, { requestId: req.requestId })
    return res.json({ success: true })
  })
)

export default router
