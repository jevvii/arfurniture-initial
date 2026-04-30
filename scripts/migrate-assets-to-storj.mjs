import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

dotenv.config()
if (
  !process.env.SOURCE_SUPABASE_URL ||
  !process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.STORJ_ENDPOINT
) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

const sourceUrl = process.env.SOURCE_SUPABASE_URL || process.env.SUPABASE_URL
const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const sourceBucket =
  process.env.SOURCE_SUPABASE_BUCKET ||
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.STORAGE_BUCKET ||
  'arfurniture'

const storjEndpoint = process.env.STORJ_ENDPOINT
const storjAccessKeyId = process.env.STORJ_ACCESS_KEY_ID
const storjSecretAccessKey = process.env.STORJ_SECRET_ACCESS_KEY
const storjRegion = process.env.STORJ_REGION || 'global'
const storjBucket = process.env.STORJ_BUCKET || process.env.STORAGE_BUCKET || sourceBucket

if (!sourceUrl || !sourceKey) {
  console.error('SOURCE_SUPABASE_URL and SOURCE_SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

if (!storjEndpoint || !storjAccessKeyId || !storjSecretAccessKey) {
  console.error('STORJ_ENDPOINT, STORJ_ACCESS_KEY_ID, and STORJ_SECRET_ACCESS_KEY are required')
  process.exit(1)
}

const supabase = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const storj = new S3Client({
  endpoint: storjEndpoint,
  region: storjRegion,
  forcePathStyle: true,
  credentials: {
    accessKeyId: storjAccessKeyId,
    secretAccessKey: storjSecretAccessKey
  }
})

const listAllFiles = async (prefix = '') => {
  const { data, error } = await supabase.storage.from(sourceBucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' }
  })

  if (error) {
    throw new Error(`Failed listing "${prefix}": ${error.message}`)
  }

  const files = []
  for (const entry of data || []) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id) {
      files.push(entryPath)
    } else {
      files.push(...(await listAllFiles(entryPath)))
    }
  }

  return files
}

const files = await listAllFiles('')
if (files.length === 0) {
  console.log('No source assets found; nothing to migrate')
  process.exit(0)
}

let migrated = 0
for (const key of files) {
  const { data, error } = await supabase.storage.from(sourceBucket).download(key)
  if (error || !data) {
    throw new Error(`Failed downloading "${key}": ${error?.message || 'Unknown error'}`)
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  await storj.send(
    new PutObjectCommand({
      Bucket: storjBucket,
      Key: key,
      Body: buffer,
      ContentType: data.type || 'application/octet-stream'
    })
  )

  migrated += 1
  console.log(`[${migrated}/${files.length}] migrated ${key}`)
}

console.log(`Asset migration complete (${migrated} file(s))`)
