import path from 'path'
import logger from './logger.mjs'

const BUCKET_NAME = 'ARfurniture_bucket'

// Helper to sanitize folder names
export const sanitizeFolderName = (name) => {
  if (!name) return 'uncategorized'
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
    .substring(0, 50)             // Limit length
    || 'uncategorized'
}

// Helper to sanitize file names (preserve extension)
export const sanitizeFileName = (originalName) => {
  if (!originalName) return 'unnamed-file'
  const ext = path.extname(originalName)
  const name = path.parse(originalName).name

  const sanitizedName = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)

  return `${sanitizedName}${ext}`
}

// Helper to extract path from Supabase Public URL
export const getPathFromUrl = (url) => {
  if (!url) return null
  try {
    // Example: https://project.supabase.co/storage/v1/object/public/ARfurniture_bucket/path/to/file.ext
    // We need 'path/to/file.ext'
    const bucketToken = `${BUCKET_NAME}/`
    if (url.includes(bucketToken)) {
      return url.split(bucketToken)[1]
    }
    return null
  } catch (e) {
    logger.error('Error extracting path from URL', e, { url })
    return null
  }
}

// Helper to delete Supabase folder content (recursive)
export const deleteSupabaseFolder = async (supabase, folderPath) => {
  if (!supabase) {
    logger.warn('Supabase client not available, skipping folder deletion', { folderPath })
    return
  }
  
  logger.info(`Initiating recursive purge for path: ${folderPath}`)
  
  try {
    // List files and folders at this path
    const { data: list, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (listError) {
      // If folder doesn't exist, that's fine - nothing to delete
      if (listError.message?.includes('not found') || listError.statusCode === '404') {
        logger.debug(`Folder does not exist: ${folderPath}`)
        return
      }
      throw listError
    }

    if (list && list.length > 0) {
      logger.debug(`Found ${list.length} items in ${folderPath}`)
      
      // Separate files and folders
      const files = []
      const folders = []

      for (const item of list) {
        if (item.id) {
          // It's a file
          files.push(`${folderPath}/${item.name}`)
        } else {
          // It's a folder - recursively delete it first
          folders.push(item.name)
        }
      }

      // Recursively delete subfolders first
      for (const folder of folders) {
        await deleteSupabaseFolder(supabase, `${folderPath}/${folder}`)
      }

      // Delete files in current folder
      if (files.length > 0) {
        logger.info(`Deleting ${files.length} files from ${folderPath}`)
        const { error: removeError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(files)

        if (removeError) {
          logger.error(`Failed to remove files from ${folderPath}`, removeError, { files })
          throw removeError
        }
        logger.success(`Successfully deleted ${files.length} files from ${folderPath}`)
      }
    } else {
      logger.debug(`Folder is already empty: ${folderPath}`)
    }
  } catch (e) {
    logger.error(`Critical error during purge of ${folderPath}`, e)
    throw e
  }
}

// Helper to delete all product assets
export const deleteProductFolders = async (supabase, productName) => {
  if (!productName) {
    logger.warn('No product name provided for folder deletion')
    return
  }
  const folderName = sanitizeFolderName(productName)
  logger.info(`Deleting all folders for product: ${productName} (${folderName})`)
  await deleteSupabaseFolder(supabase, folderName)
}

export { BUCKET_NAME }
