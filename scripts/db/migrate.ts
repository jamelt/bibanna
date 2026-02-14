import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://annobib:annobib@localhost:5432/annobib'
const command = process.argv[2]

interface MigrationRecord {
  id: number
  hash: string
  created_at: Date
}

async function main() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  console.log(`Connecting to database...`)
  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  switch (command) {
    case 'up':
      await runMigrations(db, client)
      break
    case 'down':
      await rollbackMigration(db, client)
      break
    case 'status':
      await showStatus(db)
      break
    case 'validate':
      await validateMigrations(db, client)
      break
    case 'backup':
      await createBackup(db, process.argv[3])
      break
    case 'restore':
      await restoreBackup(db, process.argv[3])
      break
    default:
      console.log('Usage: migrate.ts <up|down|status|validate|backup|restore> [table]')
      process.exit(1)
  }

  await client.end()
}

async function ensureExtensions(db: ReturnType<typeof drizzle>) {
  console.log('Ensuring required PostgreSQL extensions...')
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "vector"`)
  console.log('Extensions ready')
}

async function runMigrations(db: ReturnType<typeof drizzle>, client: postgres.Sql) {
  console.log('Running migrations...')

  try {
    await db.execute(sql`SELECT pg_advisory_lock(12345)`)

    await ensureExtensions(db)

    await migrate(db, { migrationsFolder: './server/database/migrations' })

    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(12345)`)
  }
}

async function rollbackMigration(db: ReturnType<typeof drizzle>, client: postgres.Sql) {
  console.log('Rolling back last migration...')

  const migrations = await db.execute<MigrationRecord>(
    sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`,
  )

  if (!migrations.length) {
    console.log('No migrations to rollback')
    return
  }

  const lastMigration = migrations[0]
  console.log(`Rolling back migration: ${lastMigration.hash}`)

  const rollbackPath = `./server/database/migrations/${lastMigration.hash}_rollback.sql`

  try {
    const fs = await import('fs')
    const rollbackSql = fs.readFileSync(rollbackPath, 'utf-8')

    await db.execute(sql`SELECT pg_advisory_lock(12345)`)

    await db.execute(sql.raw(rollbackSql))

    await db.execute(sql`DELETE FROM drizzle.__drizzle_migrations WHERE id = ${lastMigration.id}`)

    console.log('Rollback completed successfully')
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`Rollback file not found: ${rollbackPath}`)
      console.error('Please create a rollback file for this migration')
    } else {
      console.error('Rollback failed:', error)
    }
    process.exit(1)
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(12345)`)
  }
}

async function showStatus(db: ReturnType<typeof drizzle>) {
  console.log('Migration status:')

  try {
    const migrations = await db.execute<MigrationRecord>(
      sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at ASC`,
    )

    if (!migrations.length) {
      console.log('No migrations applied')
      return
    }

    console.log('\nApplied migrations:')
    for (const m of migrations) {
      console.log(`  ${m.hash} - ${m.created_at}`)
    }
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('No migrations table found - database not initialized')
    } else {
      throw error
    }
  }
}

async function validateMigrations(db: ReturnType<typeof drizzle>, client: postgres.Sql) {
  console.log('Validating migrations...')

  const fs = await import('fs')
  const path = await import('path')

  const migrationsDir = './server/database/migrations'
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.includes('_rollback'))

  let hasErrors = false

  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

    const hasDropColumn = /ALTER TABLE .* DROP COLUMN/i.test(content)
    const hasDropTable = /DROP TABLE/i.test(content)
    const hasRenameColumn = /ALTER TABLE .* RENAME COLUMN/i.test(content)

    if (hasDropColumn || hasDropTable || hasRenameColumn) {
      const rollbackFile = file.replace('.sql', '_rollback.sql')
      const rollbackPath = path.join(migrationsDir, rollbackFile)

      if (!fs.existsSync(rollbackPath)) {
        console.error(`⚠️  ${file}: Destructive migration without rollback file`)
        hasErrors = true
      }

      if (hasDropColumn || hasDropTable) {
        const backupCheck = /CREATE TABLE.*_backup|INSERT INTO.*_backup/i.test(content)
        if (!backupCheck) {
          console.warn(`⚠️  ${file}: Destructive operation without backup`)
        }
      }
    }

    console.log(`✓ ${file}`)
  }

  if (hasErrors) {
    console.error('\nValidation failed - please fix the issues above')
    process.exit(1)
  }

  console.log('\nAll migrations validated successfully')
}

async function createBackup(db: ReturnType<typeof drizzle>, tableName?: string) {
  if (!tableName) {
    console.error('Please specify a table name: migrate.ts backup <table>')
    process.exit(1)
  }

  const backupTable = `${tableName}_backup_${Date.now()}`

  console.log(`Creating backup of ${tableName} to ${backupTable}...`)

  await db.execute(sql.raw(`CREATE TABLE ${backupTable} AS SELECT * FROM ${tableName}`))

  const count = await db.execute<{ count: number }>(
    sql.raw(`SELECT COUNT(*) as count FROM ${backupTable}`),
  )

  console.log(`Backup created: ${backupTable} (${count[0].count} rows)`)
}

async function restoreBackup(db: ReturnType<typeof drizzle>, backupTable?: string) {
  if (!backupTable) {
    console.error('Please specify a backup table name: migrate.ts restore <backup_table>')
    process.exit(1)
  }

  const originalTable = backupTable.replace(/_backup_\d+$/, '')

  console.log(`Restoring ${backupTable} to ${originalTable}...`)

  await db.execute(sql.raw(`TRUNCATE TABLE ${originalTable}`))
  await db.execute(sql.raw(`INSERT INTO ${originalTable} SELECT * FROM ${backupTable}`))

  const count = await db.execute<{ count: number }>(
    sql.raw(`SELECT COUNT(*) as count FROM ${originalTable}`),
  )

  console.log(`Restored ${count[0].count} rows to ${originalTable}`)
}

main().catch((error) => {
  console.error('Migration script failed:', error)
  process.exit(1)
})
