import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, getCollections, closeDatabase } from '../server/config/database.mjs'

dotenv.config()
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local')
  process.exit(1)
}

await connectDatabase()
const { admins } = getCollections()

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

await closeDatabase()
