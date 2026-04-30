import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Client } = pg

dotenv.config()
if (!process.env.SUPABASE_DB_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

const databaseUrl = process.env.SUPABASE_DB_URL
if (!databaseUrl) {
  console.error('SUPABASE_DB_URL is required')
  process.exit(1)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const schemaPath = path.resolve(__dirname, '..', 'server', 'sql', 'supabase_schema.sql')

const sql = await fs.readFile(schemaPath, 'utf8')
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
})

try {
  await client.connect()
  console.log('Connected to Supabase PostgreSQL')
  
  // Check if table exists
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'app_documents'
    );
  `)
  
  if (rows[0].exists && !process.env.FORCE_BOOTSTRAP) {
    console.log('Table "app_documents" already exists. Skipping bootstrap.')
    console.log('Use FORCE_BOOTSTRAP=true to override and re-apply schema.')
  } else {
    console.log('Applying schema...')
    await client.query(sql)
    console.log('Supabase schema bootstrapped successfully')
  }
} catch (err) {
  console.error('Bootstrap failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
