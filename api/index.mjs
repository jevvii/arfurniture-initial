import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'

// Configuration
import { connectDatabase, getCollections } from '../server/config/database.mjs'
import { initializeSupabase } from '../server/config/storage.mjs'

// Middleware
import { requestIdMiddleware, requestLogger } from '../server/middleware/requestLogger.mjs'
import { errorHandler, notFoundHandler } from '../server/middleware/errorHandler.mjs'

// Routes
import authRoutes from '../server/routes/auth.mjs'
import productRoutes from '../server/routes/products.mjs'
import uploadRoutes from '../server/routes/uploads.mjs'
import orderRoutes from '../server/routes/orders.mjs'
import bannerRoutes from '../server/routes/banners.mjs'
import adminRoutes from '../server/routes/admin.mjs'
import cartRoutes from '../server/routes/cart.mjs'
import addressRoutes from '../server/routes/address.mjs'
import settingsRoutes from '../server/routes/settings.mjs'
import notificationRoutes from '../server/routes/notifications.mjs'
import assetRoutes from '../server/routes/assets.mjs'

const app = express()

// =====================
// MIDDLEWARE SETUP
// =====================

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.header('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

app.use(requestIdMiddleware)
app.use(requestLogger)

// =====================
// DATABASE & STORAGE INITIALIZATION
// =====================

let dbInitialized = false

async function ensureInitialized() {
  if (dbInitialized) return

  await connectDatabase()
  const collections = getCollections()
  app.locals.collections = collections

  initializeSupabase()

  dbInitialized = true
}

// =====================
// HEALTH CHECK
// =====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbInitialized ? 'connected' : 'not yet connected',
    storage: process.env.SUPABASE_URL ? 'configured' : 'not configured'
  })
})

app.get('/api', (req, res) => {
  res.json({
    message: 'ARfurniture API Server',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      banners: '/api/banners',
      uploads: '/api/upload',
      admin: '/api/admin',
      cart: '/api/cart',
      health: '/api/health'
    }
  })
})

// =====================
// INITIALIZATION MIDDLEWARE
// =====================

app.use('/api', async (req, res, next) => {
  try {
    await ensureInitialized()
    next()
  } catch (err) {
    console.error('Failed to initialize:', err)
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Database connection failed'
    })
  }
})

// =====================
// API ROUTES
// =====================

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/banners', bannerRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/address', addressRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/assets', assetRoutes)

// =====================
// ERROR HANDLING
// =====================

app.use(notFoundHandler)
app.use(errorHandler)

export default app