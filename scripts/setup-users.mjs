import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is required')
  process.exit(1)
}

const client = new MongoClient(uri)
await client.connect()
const db = client.db('arecommerce')

const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['email', 'password', 'fname', 'lname', 'contactNumber', 'addresses'],
    properties: {
      email: { bsonType: 'string' },
      password: { bsonType: 'string' },
      fname: { bsonType: 'string' },
      mname: { bsonType: 'string' },
      lname: { bsonType: 'string' },
      contactNumber: { bsonType: 'string' },
      addresses: { bsonType: 'array' }
    }
  }
}

try {
  await db.createCollection('users', { validator })
} catch { }

try {
  await db.command({ collMod: 'users', validator })
} catch { }

await db.collection('users').createIndex({ email: 1 }, { unique: true })

// Admins collection setup
const adminValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['fname', 'lname', 'username', 'password', 'email', 'role'],
    properties: {
      fname: { bsonType: 'string' },
      mname: { bsonType: 'string' },
      lname: { bsonType: 'string' },
      email: { bsonType: 'string' },
      username: { bsonType: 'string' },
      password: { bsonType: 'string' },
      role: { bsonType: 'string', enum: ['admin', 'superadmin'] }
    }
  }
}

try {
  await db.createCollection('admins', { validator: adminValidator })
} catch { }

try {
  await db.command({ collMod: 'admins', validator: adminValidator })
} catch { }

await db.collection('admins').createIndex({ username: 1 }, { unique: true })
await db.collection('admins').createIndex({ email: 1 }, { unique: true })

await client.close()
console.log('Created arecommerce.users and arecommerce.admins with validators and indexes')
