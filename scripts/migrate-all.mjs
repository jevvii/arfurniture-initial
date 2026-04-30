import { spawn } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const runScript = (scriptName) => {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> STARTING: ${scriptName} <<<`)
    const child = spawn('node', [`scripts/${scriptName}`], {
      stdio: 'inherit',
      env: { ...process.env }
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`>>> COMPLETED: ${scriptName} <<<\n`)
        resolve()
      } else {
        console.error(`>>> FAILED: ${scriptName} (Exit code: ${code}) <<<\n`)
        reject(new Error(`${scriptName} failed`))
      }
    })
  })
}

async function migrateAll() {
  try {
    // 1. Bootstrap Supabase Table
    await runScript('bootstrap-supabase.mjs')

    // 2. Migrate Data from MongoDB to Supabase
    await runScript('migrate-mongo-to-supabase.mjs')

    // 3. Upload Local Assets to Cloud (Optional)
    if (process.env.UPLOAD_LOCAL_ASSETS === 'true') {
      await runScript('upload-local-assets.mjs')
    }

    // 4. Migrate Assets from Supabase to Storj (Cloud-to-Cloud)
    if (process.env.STORAGE_PROVIDER === 'storj' || process.env.RUN_ASSET_MIGRATION === 'true') {
      await runScript('migrate-assets-to-storj.mjs')
    } else {
      console.log('Skipping asset migration (STORAGE_PROVIDER is not "storj")')
    }

    console.log('=== FULL MIGRATION SUCCESSFUL ===')
  } catch (err) {
    console.error('=== MIGRATION FAILED ===')
    console.error(err.message)
    process.exit(1)
  }
}

migrateAll()
