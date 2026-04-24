import express from 'express'
import { ObjectId } from 'mongodb'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import { EventEmitter } from 'events'

const router = express.Router()

// Global notification emitter for SSE
export const notificationEmitter = new EventEmitter()

// Server-Sent Events (SSE) Stream
router.get('/stream/:userId', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Initial flush to establish connection
    res.write(':\n\n')

    const listener = (notification) => {
        if (notification.userId === req.params.userId) {
            res.write(`data: ${JSON.stringify(notification)}\n\n`)
        }
    }

    notificationEmitter.on('new_notification', listener)

    req.on('close', () => {
        notificationEmitter.off('new_notification', listener)
    })
})

// Get notifications for a user
router.get('/:userId', asyncHandler(async (req, res) => {
    const notifications = req.app.locals.collections.notifications

    const userNotifications = await notifications
        .find({ userId: req.params.userId })
        .sort({ createdAt: -1 })
        .toArray()

    res.json(userNotifications)
}))

// Mark notification as read
router.patch('/:id/read', asyncHandler(async (req, res) => {
    const notifications = req.app.locals.collections.notifications

    const result = await notifications.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isRead: true, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true })
}))

// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', asyncHandler(async (req, res) => {
    const notifications = req.app.locals.collections.notifications

    await notifications.updateMany(
        { userId: req.params.userId, isRead: false },
        { $set: { isRead: true, updatedAt: new Date() } }
    )

    res.json({ success: true })
}))

export default router
