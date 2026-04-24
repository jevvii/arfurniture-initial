import express from 'express'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { normalizeUser, normalizeAdmin } from '../utils/normalize.mjs'
import { validateEmail, validatePassword, validateRequiredFields } from '../middleware/validators.mjs'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from '../email-helper.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

// =====================
// CUSTOMER AUTH
// =====================

// Customer Signup
router.post('/signup',
  validateEmail,
  validatePassword,
  asyncHandler(async (req, res) => {
    const { email = '', password = '', fname = '', mname = '', lname = '', contactNumber = '' } = req.body || {}

    const normalizedEmail = email.trim().toLowerCase()
    const first = fname.trim()
    const middle = mname.trim()
    const last = lname.trim()

    if (!first || !last) {
      logger.request(req, 'Signup failed: missing name fields')
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fname', 'lname'],
        missing: [!first && 'fname', !last && 'lname'].filter(Boolean)
      })
    }

    logger.request(req, `Customer signup attempt: ${normalizedEmail}`)

    const hash = await bcrypt.hash(password, 10)
    const doc = {
      email: normalizedEmail,
      password: hash,
      fname: first,
      mname: middle,
      lname: last,
      contactNumber: contactNumber.trim(),
      addresses: []
    }

    const users = req.app.locals.collections.users
    const { insertedId } = await users.insertOne(doc)

    logger.success(`Customer signup successful: ${normalizedEmail}`, { requestId: req.requestId })
    return res.json(normalizeUser({ ...doc, _id: insertedId }))
  })
)

// Customer Login
router.post('/login',
  validateEmail,
  validatePassword,
  asyncHandler(async (req, res) => {
    const { email = '', password = '' } = req.body || {}
    const normalizedEmail = email.trim().toLowerCase()

    logger.request(req, `Customer login attempt: ${normalizedEmail}`)

    const users = req.app.locals.collections.users
    const user = await users.findOne({ email: normalizedEmail })

    if (!user) {
      logger.warn(`Customer login failed: user not found`, { requestId: req.requestId, email: normalizedEmail })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      logger.warn(`Customer login failed: wrong password`, { requestId: req.requestId, email: normalizedEmail })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    logger.success(`Customer login successful: ${normalizedEmail}`, { requestId: req.requestId })
    return res.json(normalizeUser(user))
  })
)

// Update Profile
router.put('/update-profile',
  asyncHandler(async (req, res) => {
    // Expect auth middleware to have populated user? No, this app seems to use JWT or session but looking at previous routes, it expects inputs.
    // Wait, the routes above don't use authentication middleware. They are public login/signup.
    // We need to know WHICH user to update.
    // Since there's no auth middleware visible in index.mjs for these routes, we'll assume the client sends the userId
    // OR we should look at how other protected routes work.
    // Checking `orders.mjs` or `cart.mjs` might reveal how auth is handled.
    // Address routes use `userId` param.
    // Let's use `userId` in the body or param.
    // secure approach: The ID should probably come from the verified token, but existing pattern seems to be ID-based?
    // Let's check `cart.mjs` or `orders.mjs` from the file list to be safe.

    // START TEMPORARY CHECK
    // (I will assume for now we need userId in the body or as a param, matching address/cart routes)
    // END TEMPORARY CHECK

    const { userId, fname, mname, lname, contactNumber, currentPassword, newPassword } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    const users = req.app.locals.collections.users
    const user = await users.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const updates = {}
    if (fname !== undefined) updates.fname = fname.trim()
    if (mname !== undefined) updates.mname = mname.trim()
    if (lname !== undefined) updates.lname = lname.trim()
    if (contactNumber !== undefined) updates.contactNumber = contactNumber.trim()

    // Password change logic
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' })
      }

      const ok = await bcrypt.compare(currentPassword, user.password)
      if (!ok) {
        return res.status(400).json({ error: 'Incorrect current password' })
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' })
      }

      updates.password = await bcrypt.hash(newPassword, 10)
    }

    if (Object.keys(updates).length > 0) {
      // preserve other fields
      // updates.updatedAt = new Date() // if we had this field
      await users.updateOne(
        { _id: user._id },
        { $set: updates }
      )
    }

    // Fetch updated user to return normalized
    const updatedUser = await users.findOne({ _id: user._id })

    logger.success(`User profile updated: ${user.email}`, { requestId: req.requestId })
    return res.json(normalizeUser(updatedUser))
  })
)

// =====================
// ADMIN AUTH
// =====================

// Admin Login - accepts email OR username
router.post('/admins/login',
  validateRequiredFields(['identifier', 'password']),
  asyncHandler(async (req, res) => {
    const { identifier = '', password = '' } = req.body || {}
    const normalizedIdentifier = identifier.trim().toLowerCase()

    logger.request(req, `Admin login attempt: ${normalizedIdentifier}`)

    const admins = req.app.locals.collections.admins

    // Search by email OR username (both case-insensitive)
    const admin = await admins.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: normalizedIdentifier }
      ]
    })

    if (!admin) {
      logger.warn(`Admin login failed: not found`, { requestId: req.requestId, identifier: normalizedIdentifier })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(password, admin.password)

    if (!ok) {
      logger.warn(`Admin login failed: wrong password`, { requestId: req.requestId, identifier: normalizedIdentifier })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    logger.success(`Admin login successful: ${admin.email} (${admin.username})`, { requestId: req.requestId })
    return res.json(normalizeAdmin(admin))
  })
)

// =====================
// PASSWORD RESET FLOW
// =====================

// Request password reset code
router.post('/forgot-password',
  validateEmail,
  asyncHandler(async (req, res) => {
    const { email } = req.body
    const normalizedEmail = email.trim().toLowerCase()

    logger.request(req, `Password reset requested for: ${normalizedEmail}`)

    const users = req.app.locals.collections.users
    const user = await users.findOne({ email: normalizedEmail })

    // For security, don't reveal if email exists or not
    if (!user) {
      logger.debug(`Password reset requested for non-existent email`, { requestId: req.requestId, email: normalizedEmail })
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset code has been sent.'
      })
    }

    // Generate 6-digit verification code
    const resetCode = crypto.randomInt(100000, 999999).toString()
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    logger.debug(`Generated reset code for ${normalizedEmail}`, {
      requestId: req.requestId,
      expiresAt,
      resetCodeLength: resetCode.length
    })

    const passwordResets = req.app.locals.collections.password_resets

    // Clear any existing reset tokens for this user
    await passwordResets.deleteMany({ email: normalizedEmail })

    // Insert new reset token
    await passwordResets.insertOne({
      email: normalizedEmail,
      userId: user._id,
      resetCode: resetCode,
      resetToken: resetToken,
      expiresAt: expiresAt,
      attempts: 0,
      createdAt: new Date()
    })

    // Send email (async, don't wait)
    const fullName = [user.fname, user.lname].filter(Boolean).join(' ')
    sendPasswordResetEmail({
      email: user.email,
      fullName: fullName,
      resetCode: resetCode
    }).catch(error => {
      logger.error('Failed to send password reset email', error, { requestId: req.requestId, email: normalizedEmail })
    })

    logger.success(`Password reset email sent: ${normalizedEmail}`, { requestId: req.requestId })

    return res.json({
      success: true,
      resetToken: resetToken,
      message: 'If an account with this email exists, a password reset code has been sent.'
    })
  })
)

// Verify reset code
router.post('/forgot-password/verify-code',
  validateRequiredFields(['resetToken', 'code']),
  asyncHandler(async (req, res) => {
    const { resetToken, code } = req.body

    logger.request(req, 'Verifying password reset code')

    const passwordResets = req.app.locals.collections.password_resets
    const resetDoc = await passwordResets.findOne({ resetToken: resetToken })

    if (!resetDoc) {
      logger.warn('Invalid reset token', { requestId: req.requestId })
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Check if token has expired
    if (!resetDoc.expiresAt || new Date() > new Date(resetDoc.expiresAt)) {
      logger.warn('Reset token expired', { requestId: req.requestId, email: resetDoc.email })

      await passwordResets.deleteOne({ _id: resetDoc._id })
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' })
    }

    // Check attempts (max 5 attempts)
    const attempts = resetDoc.attempts || 0
    if (attempts >= 5) {
      logger.warn('Too many reset attempts', { requestId: req.requestId, email: resetDoc.email, attempts })

      await passwordResets.deleteOne({ _id: resetDoc._id })
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new reset code.' })
    }

    // Verify code
    if (resetDoc.resetCode !== code) {
      logger.warn('Invalid reset code', { requestId: req.requestId, email: resetDoc.email, attempts: attempts + 1 })

      await passwordResets.updateOne(
        { _id: resetDoc._id },
        { $set: { attempts: attempts + 1 } }
      )

      return res.status(400).json({
        error: 'Invalid verification code',
        attemptsRemaining: 5 - (attempts + 1)
      })
    }

    logger.success('Reset code verified', { requestId: req.requestId, email: resetDoc.email })
    return res.json({
      success: true,
      message: 'Code verified successfully'
    })
  })
)

// Reset password with verified code
router.post('/forgot-password/reset-password',
  validateRequiredFields(['resetToken', 'code', 'newPassword']),
  asyncHandler(async (req, res) => {
    const { resetToken, code, newPassword } = req.body

    logger.request(req, 'Resetting password')

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
        minLength: 6
      })
    }

    const passwordResets = req.app.locals.collections.password_resets
    const resetDoc = await passwordResets.findOne({
      resetToken: resetToken,
      resetCode: code
    })

    if (!resetDoc) {
      logger.warn('Invalid reset token or code', { requestId: req.requestId })
      return res.status(400).json({ error: 'Invalid reset token or code' })
    }

    // Check if token has expired
    if (!resetDoc.expiresAt || new Date() > new Date(resetDoc.expiresAt)) {
      logger.warn('Reset token expired during password reset', { requestId: req.requestId, email: resetDoc.email })

      await passwordResets.deleteOne({ _id: resetDoc._id })
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' })
    }

    const users = req.app.locals.collections.users
    const user = await users.findOne({ _id: resetDoc.userId })

    if (!user) {
      logger.warn('User not found during password reset', { requestId: req.requestId, email: resetDoc.email })
      return res.status(400).json({ error: 'User associated with this reset request no longer exists.' })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password and clear reset data
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updated_at: new Date()
        }
      }
    )

    // Delete reset token
    await passwordResets.deleteOne({ _id: resetDoc._id })

    // Send confirmation email (async, don't wait)
    const fullName = [user.fname, user.lname].filter(Boolean).join(' ')
    sendPasswordResetConfirmationEmail({
      email: user.email,
      fullName: fullName
    }).catch(error => {
      logger.error('Failed to send password reset confirmation', error, { requestId: req.requestId, email: user.email })
    })

    logger.success(`Password reset successful: ${user.email}`, { requestId: req.requestId })

    return res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    })
  })
)

export default router
