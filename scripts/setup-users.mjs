import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, closeDatabase } from '../server/config/database.mjs'

dotenv.config()
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

await connectDatabase()
await closeDatabase()

console.log('Supabase database connection OK. Run "npm run db:bootstrap" to create required tables.')
