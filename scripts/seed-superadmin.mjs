import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is required')
  process.exit(1)
}

const client = new MongoClient(uri)
await client.connect()
const db = client.db('arecommerce')
const admins = db.collection('admins')

const email = 'admin@arfurniture.com'
const username = 'admin'
const password = 'admin123'

const hash = await bcrypt.hash(password, 10)

await admins.updateOne(
  { email },
  {
    $setOnInsert: {
      fname: 'Store',
      mname: '',
      lname: 'Admin',
      email,
      username,
      password: hash,
      role: 'superadmin'
    }
  },
  { upsert: true }
)

await client.close()
console.log('Seeded default superadmin')
