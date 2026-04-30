import dotenv from 'dotenv'
import { S3Client, PutBucketCorsCommand, PutObjectAclCommand } from '@aws-sdk/client-s3'

dotenv.config()

const endpoint = process.env.STORJ_ENDPOINT
const accessKeyId = process.env.STORJ_ACCESS_KEY_ID
const secretAccessKey = process.env.STORJ_SECRET_ACCESS_KEY
const region = process.env.STORJ_REGION || 'global'
const bucket = process.env.STORAGE_BUCKET || process.env.STORJ_BUCKET || 'arfurniture'

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Storj credentials missing.')
  process.exit(1)
}

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
})

async function setupCors() {
  try {
    const corsParams = {
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: []
          }
        ]
      }
    }
    await client.send(new PutBucketCorsCommand(corsParams))
    console.log(`Successfully set CORS policy for bucket: ${bucket}`)
  } catch (err) {
    console.error('Failed to set CORS policy:', err.message)
  }
}

setupCors()
