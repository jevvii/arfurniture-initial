import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is required in .env.local')
  process.exit(1)
}

const client = new MongoClient(uri)
await client.connect()
const db = client.db('arecommerce')
const admins = db.collection('admins')

console.log('Checking for admin...')
const admin = await admins.findOne({ email: 'admin@arfurniture.com' })
console.log('\nAdmin found:', admin ? '✓ YES' : '✗ NO')

if (admin) {
  console.log('\n--- Admin Details ---')
  console.log('Email:', admin.email)
  console.log('Username:', admin.username)
  console.log('Name:', admin.fname, admin.mname || '', admin.lname)
  console.log('Role:', admin.role)
  console.log('Has Password:', admin.password ? '✓ YES (hashed)' : '✗ NO')
} else {
  console.log('\n⚠ No admin found! Run: npm run seed-superadmin')
}

await client.close()
