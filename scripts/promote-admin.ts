import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://annobib:annobib@localhost:5432/annobib'

const email = process.argv[2]
const password = process.argv[3] || 'admin123'
const name = process.argv[4] || 'Admin'

if (!email) {
  console.error('Usage: npx tsx scripts/promote-admin.ts <email> [password] [name]')
  console.error('')
  console.error('  If the user exists, promotes them to admin.')
  console.error(
    '  If the user does NOT exist, creates them with the given password and promotes to admin.',
  )
  console.error('')
  console.error('Examples:')
  console.error('  npx tsx scripts/promote-admin.ts admin@annobib.dev')
  console.error('  npx tsx scripts/promote-admin.ts admin@annobib.dev mypassword "Jamel Toms"')
  process.exit(1)
}

async function hashPassword(raw: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function main() {
  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)
  const normalizedEmail = email.toLowerCase()

  try {
    // Try to promote an existing user first
    const existing = await db.execute(
      sql`UPDATE users SET role = 'admin', updated_at = NOW() WHERE email = ${normalizedEmail} RETURNING id, email, name, role`,
    )

    if (existing.length > 0) {
      console.log('Promoted existing user to admin:')
      console.log(existing[0])
      return
    }

    // User doesn't exist -- create them directly
    const hashed = await hashPassword(password)
    const auth0Id = `local:${normalizedEmail}:${hashed}`

    const created = await db.execute(
      sql`INSERT INTO users (email, name, auth0_id, subscription_tier, role)
          VALUES (${normalizedEmail}, ${name}, ${auth0Id}, 'pro', 'admin')
          RETURNING id, email, name, role, subscription_tier`,
    )

    if (created.length === 0) {
      console.error('Failed to create admin user')
      process.exit(1)
    }

    console.log('Created new admin user:')
    console.log(created[0])
    console.log(`\nLogin with:  email=${normalizedEmail}  password=${password}`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
