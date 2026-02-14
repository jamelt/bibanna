import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!_db) {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://annobib:annobib@localhost:5432/annobib'
    const client = postgres(connectionString, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
    })
    _db = drizzle(client, { schema })

    process.on('SIGTERM', async () => {
      await client.end({ timeout: 5 })
    })
    process.on('SIGINT', async () => {
      await client.end({ timeout: 5 })
    })
  }
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})

export type Database = ReturnType<typeof drizzle<typeof schema>>
