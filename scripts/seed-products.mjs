import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { connectDatabase, getCollections, closeDatabase } from '../server/config/database.mjs'
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

function generateProductName(folderName) {
  return folderName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

async function seedProducts() {
  try {
    await connectDatabase()
    const { products } = getCollections()
    
    // Check if products exist
    const existingProductsCount = await products.countDocuments()
    if (existingProductsCount > 0) {
      console.log(`There are already ${existingProductsCount} products in the database.`)
    }

    const files = await getFiles(productsDir)
    
    // Group by product folder
    const productGroups = {}
    
    for (const filePath of files) {
      const relativePath = path.relative(productsDir, filePath)
      const storagePath = `products/${relativePath.replace(/\\/g, '/')}`
      
      const { data: publicUrlData } = storage.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
      const url = publicUrlData.publicUrl

      const parts = storagePath.split('/')
      // parts[0] = 'products'
      // parts[1] = '3dmodels' or 'images'
      // parts[2] = product folder name
      
      if (parts.length >= 4) {
        const type = parts[1]
        const folder = parts[2]
        
        if (!productGroups[folder]) {
          productGroups[folder] = {
            name: generateProductName(folder),
            description: `A beautifully crafted ${generateProductName(folder)} to enhance your home.`,
            price: Math.floor(Math.random() * 50000) + 10000,
            category: folder.includes('sofa') || folder.includes('chair') ? 'Chairs' : 'Tables',
            stock: 15,
            imageUrl: '',
            images: [],
            arModelUrl: '',
            dimensions: { width: 80, height: 80, depth: 80, unit: 'cm' },
            isFeatured: Math.random() > 0.5,
            isNewArrival: Math.random() > 0.5,
            isSale: Math.random() > 0.8,
            createdAt: new Date(),
            variants: [
              { id: 'v1-' + folder, name: 'Narra (Reddish Brown)', color: '#9A3E2B', stock: 10 },
              { id: 'v2-' + folder, name: 'Kamagong (Ironwood)', color: '#1A0F0D', stock: 5 },
              { id: 'v3-' + folder, name: 'Acacia (Golden Brown)', color: '#72503A', stock: 8 },
              { id: 'v4-' + folder, name: 'Molave (Light Straw)', color: '#E3C58E', stock: 12 }
            ]
          }
        }

        if (type === '3dmodels' && storagePath.endsWith('.glb')) {
          productGroups[folder].arModelUrl = url
        } else if (type === 'images') {
          // Only use the system-generated timestamped image as the primary image
          // and ignore manually named variant images (like 'black sofa.png')
          if (parts[3].match(/^\d+-/)) {
            productGroups[folder].imageUrl = url
          }
        }
      }
    }

    const productsToInsert = Object.values(productGroups).filter(p => p.imageUrl && p.arModelUrl)
    
    if (productsToInsert.length === 0) {
      console.log('No valid products to insert. Make sure local assets exist.')
    } else {
      for (const p of productsToInsert) {
        const existing = await products.findOne({ name: p.name })
        if (!existing) {
          const result = await products.insertOne(p)
          console.log(`Inserted product: ${p.name} (${result.insertedId})`)
        } else {
          console.log(`Product already exists: ${p.name}`)
        }
      }
      console.log(`Successfully seeded ${productsToInsert.length} products.`)
    }
  } catch (err) {
    console.error('Seeding failed:', err.message)
  } finally {
    await closeDatabase()
  }
}

seedProducts()
