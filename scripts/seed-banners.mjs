import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, getCollections, closeDatabase } from '../server/config/database.mjs'

dotenv.config()

async function seedBanners() {
  try {
    await connectDatabase()
    const { banners } = getCollections()
    
    // Clear existing
    await banners.deleteMany({})

    const bannerData = {
      title: "Pinoy Craftsmanship Sale",
      subtitle: "Support Local",
      description: "Get the best Palochina deals from Valenzuela directly to your home. Up to 30% off.",
      imageUrl: "/api/assets/products/images/mid-century-light-oak-sideboard-with-fluted-slidin/1764396185395-c7vq4f.png",
      badgeText: "SALE",
      buttonText: "Shop Now",
      link: "/?filter=sale",
      isActive: true,
      createdAt: new Date()
    }

    const result = await banners.insertOne(bannerData)
    console.log(`Inserted banner: ${result.insertedId}`)
    
  } catch (err) {
    console.error('Seeding failed:', err.message)
  } finally {
    await closeDatabase()
  }
}

seedBanners()
