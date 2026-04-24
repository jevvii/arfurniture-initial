import express from 'express'
import { ObjectId } from 'mongodb'
import { validateObjectId } from '../middleware/validators.mjs'
import { asyncHandler } from '../middleware/errorHandler.mjs'
import logger from '../utils/logger.mjs'
import { sendOrderInvoiceEmail, sendOrderStatusEmail } from '../email-helper.mjs'
import { notificationEmitter } from './notifications.mjs'

const router = express.Router()

// Get all orders
router.get('/', asyncHandler(async (req, res) => {
  logger.request(req, 'Fetching all orders')

  const orders = req.app.locals.collections.orders
  const allOrders = await orders.find({}).sort({ createdAt: -1 }).toArray()

  const normalized = allOrders.map(o => ({
    ...o,
    _id: o._id.toString(),
    createdAt: o.createdAt ? new Date(o.createdAt) : new Date()
  }))

  logger.success(`Retrieved ${normalized.length} orders`, { requestId: req.requestId, count: normalized.length })
  return res.json(normalized)
}))

// Create order
router.post('/', asyncHandler(async (req, res) => {
  logger.request(req, 'Creating new order')
  logger.debug('Order data', {
    requestId: req.requestId,
    userId: req.body.userId,
    itemCount: req.body.items?.length,
    totalAmount: req.body.totalAmount
  })

  const orders = req.app.locals.collections.orders
  const products = req.app.locals.collections.products

  // Validate stock availability and prepare stock updates
  const stockUpdates = []

  for (const item of req.body.items) {
    const product = await products.findOne({ _id: new ObjectId(item.productId) })

    if (!product) {
      logger.warn('Product not found in order', { requestId: req.requestId, productId: item.productId })
      return res.status(400).json({
        error: `Product ${item.productName} is no longer available`
      })
    }

    // Check stock - variant-specific or product-level
    if (item.variantId) {
      const variant = product.variants?.find(v => v.id === item.variantId)
      if (!variant) {
        logger.warn('Variant not found in order', { requestId: req.requestId, variantId: item.variantId })
        return res.status(400).json({
          error: `Variant ${item.variantName} is no longer available`
        })
      }

      const variantStock = variant.stock || 0
      if (variantStock < item.quantity) {
        logger.warn('Insufficient variant stock', {
          requestId: req.requestId,
          variantId: item.variantId,
          requested: item.quantity,
          available: variantStock
        })
        return res.status(400).json({
          error: `Insufficient stock for ${item.productName} (${item.variantName}). Only ${variantStock} available.`
        })
      }

      // Prepare variant stock update
      stockUpdates.push({
        productId: new ObjectId(item.productId),
        variantId: item.variantId,
        quantity: item.quantity
      })
    } else {
      // Product-level stock check
      const productStock = product.stock || 0
      if (productStock < item.quantity) {
        logger.warn('Insufficient product stock', {
          requestId: req.requestId,
          productId: item.productId,
          requested: item.quantity,
          available: productStock
        })
        return res.status(400).json({
          error: `Insufficient stock for ${item.productName}. Only ${productStock} available.`
        })
      }

      // Prepare product stock update
      stockUpdates.push({
        productId: new ObjectId(item.productId),
        variantId: null,
        quantity: item.quantity
      })
    }
  }

  // All stock validations passed, create order
  const orderData = {
    ...req.body,
    status: 'pending',
    createdAt: new Date()
  }

  const result = await orders.insertOne(orderData)

  // Reduce stock for each item
  for (const update of stockUpdates) {
    if (update.variantId) {
      // Update variant stock
      const updateResult = await products.updateOne(
        {
          _id: update.productId,
          'variants.id': update.variantId
        },
        {
          $inc: { 'variants.$.stock': -update.quantity }
        }
      )
      logger.info('Variant stock update result', {
        requestId: req.requestId,
        productId: update.productId.toString(),
        variantId: update.variantId,
        reducedBy: update.quantity,
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      })
    } else {
      // Update product stock
      const updateResult = await products.updateOne(
        { _id: update.productId },
        { $inc: { stock: -update.quantity } }
      )
      logger.info('Product stock update result', {
        requestId: req.requestId,
        productId: update.productId.toString(),
        reducedBy: update.quantity,
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      })
    }
  }

  logger.success(`Order created: ${result.insertedId}`, {
    requestId: req.requestId,
    orderId: result.insertedId.toString(),
    status: 'pending',
    itemCount: req.body.items.length
  })

  // Send invoice email (fire-and-forget, don't block the response)
  if (req.body.email) {
    sendOrderInvoiceEmail({
      email: req.body.email,
      customerName: req.body.customerName || 'Valued Customer',
      recipientName: req.body.recipientName || req.body.customerName,
      contactNumber: req.body.contactNumber,
      orderId: result.insertedId.toString(),
      items: req.body.items,
      totalAmount: req.body.totalAmount,
      shippingAddress: req.body.shippingAddress,
      orderDate: orderData.createdAt
    }).then(emailResult => {
      if (emailResult.success) {
        logger.info('Invoice email sent', { orderId: result.insertedId.toString() })
      } else {
        logger.warn('Invoice email failed', { orderId: result.insertedId.toString(), error: emailResult.error })
      }
    }).catch(err => {
      logger.error('Invoice email error', { orderId: result.insertedId.toString(), error: err.message })
    })
  }

  return res.json({ ...orderData, _id: result.insertedId.toString() })
}))

// Update order status
router.patch('/:id/status',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    const { status } = req.body

    if (!status) {
      return res.status(400).json({
        error: 'Status is required',
        field: 'status'
      })
    }

    logger.request(req, `Updating order status: ${req.params.id} -> ${status}`)

    const orders = req.app.locals.collections.orders
    const notifications = req.app.locals.collections.notifications

    // Get order to find userId
    const order = await orders.findOne({ _id: new ObjectId(req.params.id) })

    if (!order) {
      logger.warn('Order not found for status update', { requestId: req.requestId, orderId: req.params.id })
      return res.status(404).json({ error: 'Order not found' })
    }

    const result = await orders.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Create notification
    if (order.userId && status !== order.status) {
      let message = `Your order #${order._id.toString().slice(-6)} status has been updated to ${status}.`

      const notification = {
        userId: order.userId,
        orderId: order._id.toString(),
        type: 'order_status',
        status: status,
        message: message,
        isRead: false,
        createdAt: new Date()
      }

      const insertResult = await notifications.insertOne(notification)
      const fullNotification = { ...notification, _id: insertResult.insertedId.toString() }

      // Emit Server-Sent Event for real-time frontend update without polling
      notificationEmitter.emit('new_notification', fullNotification)

      logger.info(`Notification created for user ${order.userId} regarding order ${order._id}`)
    }

    // Resolve email and name (fallback to user if not in order)
    let customerEmail = order.email;
    let customerName = order.customerName || order.recipientName || 'Valued Customer';

    if (!customerEmail && order.userId) {
      try {
        const users = req.app.locals.collections.users;
        // userId might be string or ObjectId depending on auth. Fallback logic:
        const userQuery = ObjectId.isValid(order.userId) ? { _id: new ObjectId(order.userId) } : { _id: order.userId };
        const user = await users.findOne(userQuery);
        if (user && user.email) {
          customerEmail = user.email;
          if (customerName === 'Valued Customer') {
            customerName = user.name || user.fullName || 'Valued Customer';
          }
        }
      } catch (err) {
        logger.warn('Failed to fetch user email for order status notification', { orderId: order._id.toString(), error: err.message });
      }
    }

    // Send order status email
    if (customerEmail && status !== order.status) {
      sendOrderStatusEmail({
        email: customerEmail,
        customerName: customerName,
        orderId: order._id.toString(),
        status: status
      }).then(emailResult => {
        if (emailResult.success) {
          logger.info('Order status email sent', { orderId: order._id.toString() })
        } else {
          logger.warn('Order status email failed', { orderId: order._id.toString(), error: emailResult.error })
        }
      }).catch(err => {
        logger.error('Order status email error', { orderId: order._id.toString(), error: err.message })
      })
    }

    logger.success(`Order status updated: ${req.params.id} -> ${status}`, {
      requestId: req.requestId,
      orderId: req.params.id,
      newStatus: status
    })

    return res.json({ success: true })
  })
)

// Get orders by user ID
router.get('/user/:userId',
  asyncHandler(async (req, res) => {
    // Note: userId might not be an ObjectId in some auth systems, but here we assume string/external ID
    // If it needs to be ObjectId, use validateObjectId middleware. 
    // Given the schema Uses userId: string, we don't force ObjectId validation on the param itself if it's external.
    // However, if your system uses MongoDB _id as userId, then validate it.
    // Based on registerUser in auth.ts, _id is used. Let's assume it's a string from the auth provider or mongo _id.

    logger.request(req, `Fetching orders for user: ${req.params.userId}`)

    const orders = req.app.locals.collections.orders
    const userOrders = await orders.find({ userId: req.params.userId }).sort({ createdAt: -1 }).toArray()

    const normalized = userOrders.map(o => ({
      ...o,
      _id: o._id.toString(),
      createdAt: o.createdAt ? new Date(o.createdAt) : new Date()
    }))

    logger.success(`Retrieved ${normalized.length} orders for user ${req.params.userId}`, {
      requestId: req.requestId,
      userId: req.params.userId,
      count: normalized.length
    })
    return res.json(normalized)
  })
)

// Cancel order (only if pending)
router.patch('/:id/cancel',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Cancelling order: ${req.params.id}`)

    const orders = req.app.locals.collections.orders
    const products = req.app.locals.collections.products

    const order = await orders.findOne({ _id: new ObjectId(req.params.id) })

    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot cancel order with status '${order.status}'. Only pending orders can be cancelled.`
      })
    }

    // update status
    await orders.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: 'cancelled', updatedAt: new Date() } }
    )

    // Return items to stock
    for (const item of order.items) {
      if (item.variantId) {
        await products.updateOne(
          {
            _id: new ObjectId(item.productId),
            'variants.id': item.variantId
          },
          {
            $inc: { 'variants.$.stock': item.quantity }
          }
        )
      } else {
        await products.updateOne(
          { _id: new ObjectId(item.productId) },
          { $inc: { stock: item.quantity } }
        )
      }
    }

    logger.success(`Order cancelled: ${req.params.id}`, { requestId: req.requestId })
    return res.json({ success: true, message: 'Order cancelled successfully' })
  })
)
// Get single order
router.get('/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Fetching order: ${req.params.id}`)

    const orders = req.app.locals.collections.orders
    const order = await orders.findOne({ _id: new ObjectId(req.params.id) })

    if (!order) {
      logger.warn('Order not found', { requestId: req.requestId, orderId: req.params.id })
      return res.status(404).json({ error: 'Order not found' })
    }

    const normalized = {
      ...order,
      _id: order._id.toString(),
      createdAt: order.createdAt ? new Date(order.createdAt) : new Date()
    }

    logger.success(`Retrieved order: ${req.params.id}`, { requestId: req.requestId })
    return res.json(normalized)
  })
)

// Delete order
router.delete('/:id',
  validateObjectId('id'),
  asyncHandler(async (req, res) => {
    logger.request(req, `Deleting order: ${req.params.id}`)

    const orders = req.app.locals.collections.orders
    const result = await orders.deleteOne({ _id: new ObjectId(req.params.id) })

    if (result.deletedCount === 0) {
      logger.warn('Order not found for deletion', { requestId: req.requestId, orderId: req.params.id })
      return res.status(404).json({ error: 'Order not found' })
    }

    logger.success(`Order deleted: ${req.params.id}`, { requestId: req.requestId })
    return res.json({ success: true, message: 'Order deleted successfully' })
  })
)

export default router
