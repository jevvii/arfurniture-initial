import dotenv from 'dotenv'
import path from 'path'
import { MongoClient, ObjectId } from 'mongodb'
import { createClient } from '@supabase/supabase-js'

dotenv.config()
if (!process.env.SOURCE_MONGODB_URI || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

const sourceMongoUri = process.env.SOURCE_MONGODB_URI || process.env.MONGODB_URI
const sourceMongoDb = process.env.SOURCE_MONGODB_DB || process.env.MONGODB_DB || 'arecommerce'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const targetTable = process.env.SUPABASE_DB_TABLE || 'app_documents'

console.log(`Source MongoDB: ${sourceMongoUri.replace(/\/\/.*@/, '//<credentials>@')}`)
console.log(`Source DB: ${sourceMongoDb}`)
console.log(`Target Supabase Table: ${targetTable}`)

if (!sourceMongoUri) {
  console.error('SOURCE_MONGODB_URI (or MONGODB_URI) is required')
  process.exit(1)
}

if (sourceMongoUri.includes('<cluster>') || sourceMongoUri.includes('<password>')) {
  console.log('Skipping MongoDB migration: MONGODB_URI is still set to the default placeholder.')
  process.exit(0)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const COLLECTIONS = [
  'users',
  'admins',
  'products',
  'orders',
  'marketing_banners',
  'carts',
  'settings',
  'notifications',
  'password_resets'
]

const normalize = (value) => {
  if (value instanceof ObjectId) return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalize(nested)]))
  }
  return value
}

const mongoClient = new MongoClient(sourceMongoUri)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const chunk = (arr, size) => {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

try {
  await mongoClient.connect()
  const database = mongoClient.db(sourceMongoDb)

  for (const collectionName of COLLECTIONS) {
    const mongoCollection = database.collection(collectionName)
    const documents = await mongoCollection.find({}).toArray()

    if (documents.length === 0) {
      console.log(`[${collectionName}] skipped (no documents)`)
      continue
    }

    const rows = documents.map((doc) => {
      const normalized = normalize(doc)
      const id = String(normalized._id)
      const createdAt = normalized.createdAt || new Date().toISOString()
      const updatedAt = normalized.updatedAt || createdAt
      delete normalized._id

      return {
        collection: collectionName,
        id,
        document: normalized,
        created_at: createdAt,
        updated_at: updatedAt
      }
    })

    for (const batch of chunk(rows, 250)) {
      const { error } = await supabase.from(targetTable).upsert(batch, {
        onConflict: 'collection,id'
      })
      if (error) {
        throw new Error(`Failed migrating "${collectionName}": ${error.message}`)
      }
    }

    console.log(`[${collectionName}] migrated ${rows.length} document(s)`)
  }

  console.log('MongoDB -> Supabase migration completed')
} finally {
  await mongoClient.close()
}
