#!/usr/bin/env node
/**
 * Run once to create your first admin user:
 *   node scripts/seed-admin.js
 *
 * Requires .env.local to be present.
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
const readline = require('readline')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise(resolve => rl.question(q, resolve))

async function main() {
  console.log('\n🏠 ChoreBoard — Create Admin User\n')
  const name = await ask('Name: ')
  const pin = await ask('PIN (4+ digits): ')

  if (pin.length < 4) {
    console.error('PIN must be at least 4 digits')
    process.exit(1)
  }

  const pin_hash = await bcrypt.hash(pin, 10)

  const { data, error } = await supabase
    .from('users')
    .insert({ name, pin_hash, role: 'admin', avatar_color: '#1a1a2e' })
    .select('id, name, role')
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`\n✅ Admin user created: ${data.name} (${data.id})\n`)
  rl.close()
}

main()
