import { MongoClient } from 'mongodb'
import logger from '../utils/logger.mjs'

let client = null
let db = null

export const connectDatabase = async (uri) => {
  if (!uri) {
    const error = new Error('MONGODB_URI environment variable is required')
    logger.error('Database configuration error', error)
    throw error
  }

  try {
    logger.info('Connecting to MongoDB...')
    client = new MongoClient(uri)
    await client.connect()
    db = client.db('arecommerce')
    logger.success('Connected to MongoDB successfully')
    return db
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error, { uri: uri.replace(/\/\/.*@/, '//<credentials>@') })
    throw error
  }
}

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase first.')
  }
  return db
}

export const getCollections = () => {
  const database = getDatabase()
  return {
    users: database.collection('users'),
    admins: database.collection('admins'),
    products: database.collection('products'),
    orders: database.collection('orders'),
    banners: database.collection('marketing_banners'),
    carts: database.collection('carts'),
    settings: database.collection('settings'),
    notifications: database.collection('notifications'),
    password_resets: database.collection('password_resets')
  }
}

export const closeDatabase = async () => {
  if (client) {
    logger.info('Closing database connection...')
    await client.close()
    logger.success('Database connection closed')
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeDatabase()
  process.exit(0)
})
