import { createClient } from '@supabase/supabase-js'
import logger from '../utils/logger.mjs'

let supabaseClient = null

export const initializeSupabase = (url, key) => {
  if (!url || !key) {
    logger.warn('Supabase credentials missing. File uploads will not work.', { 
      hasUrl: !!url, 
      hasKey: !!key 
    })
    return null
  }

  try {
    supabaseClient = createClient(url, key)
    logger.success('Supabase configured successfully', { url })
    return supabaseClient
  } catch (error) {
    logger.error('Failed to initialize Supabase', error, { url })
    throw error
  }
}

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    logger.warn('Supabase client requested but not initialized')
  }
  return supabaseClient
}

export const BUCKET_NAME = 'ARfurniture_bucket'
