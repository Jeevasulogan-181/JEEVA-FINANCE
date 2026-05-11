/**
 * Auto database setup — runs before npm run dev
 * Pre-configured with your Supabase credentials
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, writeFileSync } from 'fs'
import { config } from 'dotenv'

config()

const SETUP_FLAG = '.db-setup-done'

const c = {
  green:  '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan:   '\x1b[36m', bold:   '\x1b[1m',  reset: '\x1b[0m', gray: '\x1b[90m',
}

// Skip if already done
if (existsSync(SETUP_FLAG)) {
  console.log(`${c.green}✔${c.reset}  Database ready — skipping setup check.`)
  process.exit(0)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL  || 'https://cxyqitkjhezqmwiqnqib.supabase.co'
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4eXFpdGtqaGV6cW13aXFucWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjM2ODksImV4cCI6MjA4OTI5OTY4OX0._igBugY6ibSXhEztPIgigPTY4K6Pp4s35Kw_Nw-JUf4'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function main() {
  console.log(`\n${c.bold}${c.cyan}  Finance Dashboard — Checking database…${c.reset}\n`)

  try {
    const { error } = await supabase.from('finance_records').select('id').limit(1)

    if (!error) {
      console.log(`${c.green}✔${c.reset}  Database connected and tables exist.`)
      writeFileSync(SETUP_FLAG, new Date().toISOString())
      console.log(`${c.green}✔${c.reset}  Starting app…\n`)
      process.exit(0)
    }

    if (error.code === '42P01') {
      // Tables don't exist yet — tell user clearly
      console.log(`${c.yellow}⚠${c.reset}  Tables not found in your Supabase project.\n`)
      console.log(`  ${c.bold}Please do this ONE TIME:${c.reset}`)
      console.log(`  1. Open: ${c.cyan}https://supabase.com/dashboard/project/cxyqitkjhezqmwiqnqib/sql/new${c.reset}`)
      console.log(`  2. Copy and run the file: ${c.bold}SUPABASE_SETUP.sql${c.reset}`)
      console.log(`  3. Run ${c.cyan}npm run dev${c.reset} again\n`)
      process.exit(1)
    }

    // Any other error — still let the app start
    console.log(`${c.yellow}⚠${c.reset}  Could not verify DB (${error.message}) — starting anyway.`)
    process.exit(0)

  } catch (e) {
    console.log(`${c.yellow}⚠${c.reset}  Network check failed — starting anyway.`)
    process.exit(0)
  }
}

main()
