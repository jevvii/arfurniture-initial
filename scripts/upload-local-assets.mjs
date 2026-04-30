import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { initializeSupabase, BUCKET_NAME } from '../server/config/storage.mjs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const productsDir = path.resolve(__dirname, '..', 'public', 'products')

const storage = initializeSupabase()

if (!storage) {
  console.error('Storage provider not configured. Check your .env file.')
  process.exit(1)
}

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return Array.prototype.concat(...files)
}

async function uploadLocalAssets() {
  try {
    const files = await getFiles(productsDir)
    console.log(`Found ${files.length} local assets in public/products/`)

    let uploaded = 0
    for (const filePath of files) {
      const relativePath = path.relative(productsDir, filePath)
      const storagePath = `products/${relativePath.replace(/\\/g, '/')}`
      
      const fileBuffer = await fs.readFile(filePath)
      const contentType = getContentType(filePath)

      const { error } = await storage.storage.from(BUCKET_NAME).upload(storagePath, fileBuffer, {
        contentType,
        upsert: true
      })

      if (error) {
        console.error(`Failed to upload ${storagePath}:`, error.message)
      } else {
        uploaded++
        console.log(`[${uploaded}/${files.length}] Uploaded: ${storagePath}`)
      }
    }

    console.log(`\nLocal asset upload complete. Successfully uploaded ${uploaded} files to ${BUCKET_NAME}.`)
  } catch (err) {
    console.error('Upload failed:', err.message)
    process.exit(1)
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.glb': return 'model/gltf-binary'
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.json': return 'application/json'
    default: return 'application/octet-stream'
  }
}

uploadLocalAssets()
