import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import logger from '../utils/logger.mjs'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { normalizeAdmin } from '../utils/normalize.mjs'
import { validateRequiredFields, validateEmail, validatePassword } from '../middleware/validators.mjs'

const router = express.Router()

// Dashboard stats endpoint
router.get('/dashboard-stats', asyncHandler(async (req, res) => {
  logger.request(req, 'Fetching dashboard statistics')
  
  const { products, orders, users } = req.app.locals.collections
  
  const totalProducts = await products.countDocuments({})
  const pendingOrders = await orders.countDocuments({ status: 'pending' })
  const activeCustomers = await users.countDocuments({})
  
  // Calculate monthly revenue
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const revenueResult = await orders.aggregate([
    {
      $match: {
        createdAt: { $gte: firstDayOfMonth },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]).toArray()
  
  const monthlyRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0
  
  const stats = {
    totalProducts,
    pendingOrders,
    activeCustomers,
    monthlyRevenue
  }
  
  logger.success('Dashboard stats retrieved', { requestId: req.requestId, ...stats })
  
  return res.json(stats)
}))

// =====================
// STAFF MANAGEMENT
// =====================

// List all admins
router.get('/staff', asyncHandler(async (req, res) => {
  logger.request(req, 'Fetching all staff members')
  
  const adminsCollection = req.app.locals.collections.admins
  const admins = await adminsCollection.find({}).toArray()
  
  // Normalize to remove passwords
  const safeAdmins = admins.map(admin => normalizeAdmin(admin))
  
  logger.success(`Retrieved ${safeAdmins.length} staff members`, { requestId: req.requestId })
  return res.json(safeAdmins)
}))

// Add new admin
router.post('/staff', 
  validateRequiredFields(['fname', 'lname', 'email', 'username', 'password', 'role']),
  validateEmail,
  validatePassword,
  asyncHandler(async (req, res) => {
    const { fname, mname, lname, email, username, password, role } = req.body
    
    logger.request(req, `Creating new staff member: ${email}`)

    // Validate role
    if (!['admin', 'superadmin'].includes(role)) {
       return res.status(400).json({ error: 'Invalid role. Must be "admin" or "superadmin".' })
    }
    
    const adminsCollection = req.app.locals.collections.admins
    
    // Check if email or username already exists
    const existing = await adminsCollection.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { username: username.toLowerCase() }
      ] 
    })
    
    if (existing) {
      return res.status(400).json({ error: 'Email or Username already exists' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const newAdmin = {
      fname,
      mname: mname || '',
      lname,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: new Date()
    }
    
    const result = await adminsCollection.insertOne(newAdmin)
    
    logger.success(`Staff member created: ${email}`, { requestId: req.requestId, id: result.insertedId })
    
    return res.status(201).json(normalizeAdmin({ ...newAdmin, _id: result.insertedId }))
  })
)

// Update admin
router.put('/staff/:id', 
  validateEmail,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { fname, mname, lname, email, username, password, role } = req.body
    
    logger.request(req, `Updating staff member: ${id}`)

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' })
    }

    const adminsCollection = req.app.locals.collections.admins
    
    // Check if admin exists
    const admin = await adminsCollection.findOne({ _id: new ObjectId(id) })
    if (!admin) {
      return res.status(404).json({ error: 'Staff member not found' })
    }

    // Validate role if provided
    if (role && !['admin', 'superadmin'].includes(role)) {
       return res.status(400).json({ error: 'Invalid role. Must be "admin" or "superadmin".' })
    }
    
    // Check if email or username allows exists (excluding current user)
    if (email || username) {
      const existing = await adminsCollection.findOne({ 
        $and: [
          { _id: { $ne: new ObjectId(id) } }, // Exclude current user
          { $or: [
            { email: (email || '').toLowerCase() }, 
            { username: (username || '').toLowerCase() }
          ]}
        ]
      })
      
      if (existing) {
        return res.status(400).json({ error: 'Email or Username already exists' })
      }
    }
    
    const updateData = {
      ...(fname && { fname }),
      ...(mname !== undefined && { mname }), // Allow clearing mname
      ...(lname && { lname }),
      ...(email && { email: email.toLowerCase() }),
      ...(username && { username: username.toLowerCase() }),
      ...(role && { role }),
      updatedAt: new Date()
    }

    // Only hash and update password if provided
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
         return res.status(400).json({ error: 'Password must be at least 6 characters' })
      }
      updateData.password = await bcrypt.hash(password, 10)
    }

    await adminsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    const updatedAdmin = await adminsCollection.findOne({ _id: new ObjectId(id) })
    
    logger.success(`Staff member updated: ${id}`, { requestId: req.requestId })
    
    return res.json(normalizeAdmin(updatedAdmin))
  })
)

// Delete admin
router.delete('/staff/:id', asyncHandler(async (req, res) => {
  const { id } = req.params
  
  logger.request(req, `Deleting staff member: ${id}`)
  
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID format' })
  }

  const adminsCollection = req.app.locals.collections.admins
  
  const result = await adminsCollection.deleteOne({ _id: new ObjectId(id) })
  
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Staff member not found' })
  }
  
  logger.success(`Staff member deleted: ${id}`, { requestId: req.requestId })
  
  return res.json({ message: 'Staff member deleted successfully' })
}))

export default router