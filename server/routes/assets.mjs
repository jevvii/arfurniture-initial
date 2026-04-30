import express from 'express'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSupabaseClient, BUCKET_NAME } from '../config/storage.mjs'
import logger from '../utils/logger.mjs'

const router = express.Router()

router.get('/*key', async (req, res) => {
  // Extract the object key from the URL path
  // path-to-regexp v8 creates an array or single string for req.params.key
  const key = Array.isArray(req.params.key) ? req.params.key.join('/') : req.params.key
  
  logger.info(`Asset requested: path=${req.path}, key=${key}`)
  const storage = getSupabaseClient()

  if (!storage || !storage.client) {
    // If using Supabase provider, storage.client doesn't exist, but we shouldn't hit this proxy anyway
    return res.status(404).send('Not found or unsupported storage provider')
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })

    const response = await storage.client.send(command)

    res.setHeader('Content-Type', response.ContentType || 'application/octet-stream')
    res.setHeader('Content-Length', response.ContentLength)
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
    
    // Stream the S3 response directly to the client
    response.Body.pipe(res)
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      res.status(404).send('Asset not found')
    } else {
      logger.error(`Error streaming asset: ${key}`, error)
      res.status(500).send('Internal Server Error')
    }
  }
})

export default router
