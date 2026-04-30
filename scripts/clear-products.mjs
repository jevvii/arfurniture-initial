import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, getCollections, closeDatabase } from '../server/config/database.mjs'

dotenv.config()

async function clearProducts() {
  await connectDatabase()
  const { products } = getCollections()
  const result = await products.deleteMany({})
  console.log('Cleared ' + result.deletedCount + ' products')
  await closeDatabase()
}

clearProducts()
