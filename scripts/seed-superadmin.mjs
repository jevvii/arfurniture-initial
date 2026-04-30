import dotenv from 'dotenv'
import path from 'path'
import bcrypt from 'bcryptjs'
import { connectDatabase, getCollections, closeDatabase } from '../server/config/database.mjs'

dotenv.config()
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const email = (process.env.SUPERADMIN_EMAIL || 'admin@arfurniture.com').trim().toLowerCase()
const username = (process.env.SUPERADMIN_USERNAME || 'admin').trim().toLowerCase()
const password = process.env.SUPERADMIN_PASSWORD || 'admin123'

await connectDatabase()
const { admins } = getCollections()

const existing = (await admins.findOne({ email })) || (await admins.findOne({ username }))
if (existing) {
  console.log(`Superadmin already exists (${existing.email}/${existing.username})`)
  await closeDatabase()
  process.exit(0)
}

const hash = await bcrypt.hash(password, 10)
const payload = {
  fname: process.env.SUPERADMIN_FNAME || 'Store',
  mname: process.env.SUPERADMIN_MNAME || '',
  lname: process.env.SUPERADMIN_LNAME || 'Admin',
  email,
  username,
  password: hash,
  role: 'superadmin',
  createdAt: new Date()
}

const result = await admins.insertOne(payload)
await closeDatabase()

console.log(`Seeded default superadmin (${result.insertedId})`)
