import dotenv from 'dotenv'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

dotenv.config()

const endpoint = process.env.STORJ_ENDPOINT
const accessKeyId = process.env.STORJ_ACCESS_KEY_ID
const secretAccessKey = process.env.STORJ_SECRET_ACCESS_KEY
const region = process.env.STORJ_REGION || 'global'
const bucket = process.env.STORAGE_BUCKET || process.env.STORJ_BUCKET || 'arfurniture'

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey }
})

async function testUpload() {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: 'test-public.txt',
        Body: 'Hello World',
        ContentType: 'text/plain',
        ACL: 'public-read'
      })
    )
    console.log('Upload successful with ACL: public-read')
  } catch (err) {
    console.error('Upload failed:', err.message)
  }
}

testUpload()
