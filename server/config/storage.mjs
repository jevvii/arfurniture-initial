import { createClient } from '@supabase/supabase-js'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'
import logger from '../utils/logger.mjs'

let supabaseClient = null
export let BUCKET_NAME = 'arfurniture'

const toErrorPayload = (error) => ({
  message: error?.message || String(error),
  code: error?.name || 'StorageError'
})

const trimSlash = (value = '') => value.replace(/\/+$/, '')
const trimLeadingSlash = (value = '') => value.replace(/^\/+/, '')

class StorjSupabaseCompatClient {
  constructor({
    endpoint,
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    publicBaseUrl
  }) {
    this.bucket = bucket
    this.publicBaseUrl = trimSlash(publicBaseUrl || `${trimSlash(endpoint)}/${bucket}`)
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
  }

  storage = {
    from: (bucket) => {
      const activeBucket = bucket || this.bucket
      const normalizePath = (rawPath) => trimLeadingSlash(String(rawPath || ''))

      return {
        upload: async (rawPath, body, options = {}) => {
          const key = normalizePath(rawPath)
          try {
            await this.client.send(
              new PutObjectCommand({
                Bucket: activeBucket,
                Key: key,
                Body: body,
                ContentType: options.contentType
              })
            )
            return { data: { path: key }, error: null }
          } catch (error) {
            return { data: null, error: toErrorPayload(error) }
          }
        },

        remove: async (paths = []) => {
          const keys = paths.map(normalizePath).filter(Boolean)
          if (keys.length === 0) {
            return { data: [], error: null }
          }

          try {
            // Attempt bulk delete first
            await this.client.send(
              new DeleteObjectsCommand({
                Bucket: activeBucket,
                Delete: {
                  Objects: keys.map((key) => ({ Key: key })),
                  Quiet: true
                }
              })
            )
            return { data: keys, error: null }
          } catch (error) {
            logger.warn('Bulk delete failed, falling back to individual deletes', { error: error.message })
            
            // Fallback to individual deletes if bulk fails (e.g. due to MissingContentMD5)
            const results = []
            const errors = []
            
            for (const key of keys) {
              try {
                await this.client.send(
                  new DeleteObjectCommand({
                    Bucket: activeBucket,
                    Key: key
                  })
                )
                results.push(key)
              } catch (err) {
                errors.push({ key, error: err.message })
              }
            }
            
            if (errors.length > 0 && results.length === 0) {
              return { data: null, error: toErrorPayload(errors[0].error) }
            }
            
            return { data: results, error: null }
          }
        },

        list: async (prefix = '', options = {}) => {
          const normalizedPrefix = trimLeadingSlash(prefix)
          const safePrefix = normalizedPrefix && !normalizedPrefix.endsWith('/')
            ? `${normalizedPrefix}/`
            : normalizedPrefix
          const maxKeys = Number(options.limit || 1000)
          const items = []
          let continuationToken = undefined

          try {
            do {
              const result = await this.client.send(
                new ListObjectsV2Command({
                  Bucket: activeBucket,
                  Prefix: safePrefix,
                  MaxKeys: maxKeys,
                  ContinuationToken: continuationToken
                })
              )

              for (const object of result.Contents || []) {
                if (!object.Key || object.Key === safePrefix) continue
                const relativeName = safePrefix ? object.Key.slice(safePrefix.length) : object.Key
                items.push({
                  id: object.ETag || object.Key,
                  name: relativeName
                })
              }

              continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
            } while (continuationToken)

            return { data: items, error: null }
          } catch (error) {
            return { data: null, error: toErrorPayload(error) }
          }
        },

        getPublicUrl: (rawPath) => {
          const encodedPath = normalizePath(rawPath)
            .split('/')
            .map((segment) => encodeURIComponent(segment))
            .join('/')
            
          // If a custom public base URL is provided in .env, use it.
          // Otherwise, fall back to our local Express proxy endpoint to avoid CORS issues.
          const finalUrl = this.publicBaseUrl.includes('gateway.storjshare.io') 
            ? `/api/assets/${encodedPath}`
            : `${this.publicBaseUrl}/${encodedPath}`
            
          return {
            data: {
              publicUrl: finalUrl
            }
          }
        }
      }
    }
  }
}

export const initializeSupabase = () => {
  const storageProvider = (process.env.STORAGE_PROVIDER || 'storj').toLowerCase()
  BUCKET_NAME =
    process.env.STORAGE_BUCKET ||
    process.env.STORJ_BUCKET ||
    process.env.SUPABASE_STORAGE_BUCKET ||
    BUCKET_NAME

  if (storageProvider === 'supabase') {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      logger.warn('Supabase credentials missing. File uploads will not work.', {
        provider: storageProvider,
        hasUrl: !!url,
        hasKey: !!key
      })
      return null
    }

    try {
      supabaseClient = createClient(url, key)
      logger.success('Supabase storage configured successfully', { provider: storageProvider, bucket: BUCKET_NAME })
      return supabaseClient
    } catch (error) {
      logger.error('Failed to initialize Supabase storage', error, { provider: storageProvider })
      throw error
    }
  }

  const endpoint = process.env.STORJ_ENDPOINT
  const accessKeyId = process.env.STORJ_ACCESS_KEY_ID
  const secretAccessKey = process.env.STORJ_SECRET_ACCESS_KEY
  const region = process.env.STORJ_REGION || 'global'
  const publicBaseUrl = process.env.STORJ_PUBLIC_BASE_URL

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    logger.warn('Storj credentials missing. File uploads will not work.', {
      provider: storageProvider,
      hasEndpoint: !!endpoint,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey
    })
    return null
  }

  try {
    supabaseClient = new StorjSupabaseCompatClient({
      endpoint,
      accessKeyId,
      secretAccessKey,
      region,
      bucket: BUCKET_NAME,
      publicBaseUrl
    })
    logger.success('Storj storage configured successfully', {
      provider: storageProvider,
      endpoint,
      bucket: BUCKET_NAME
    })
    return supabaseClient
  } catch (error) {
    logger.error('Failed to initialize Storj storage', error, { provider: storageProvider })
    throw error
  }
}

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    logger.warn('Storage client requested but not initialized')
  }
  return supabaseClient
}
