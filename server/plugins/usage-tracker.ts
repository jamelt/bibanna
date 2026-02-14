import { db } from '~/server/database/client'
import { apiUsageDaily } from '~/server/database/schema'
import { sql } from 'drizzle-orm'

interface UsageBatch {
  [userDateKey: string]: {
    userId: string
    date: string
    requestCount: number
    endpointCounts: Record<string, number>
  }
}

const batch: UsageBatch = {}
let flushTimer: ReturnType<typeof setTimeout> | null = null
let pendingCount = 0

const FLUSH_INTERVAL_MS = 30_000
const FLUSH_THRESHOLD = 100

const IGNORED_PREFIXES = ['/api/_nuxt_icon', '/api/_auth', '/_nuxt', '/__nuxt', '/favicon']

function shouldTrack(path: string): boolean {
  if (!path.startsWith('/api/')) return false
  return !IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix))
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function recordRequest(userId: string, path: string) {
  const date = todayDateString()
  const key = `${userId}:${date}`

  if (!batch[key]) {
    batch[key] = { userId, date, requestCount: 0, endpointCounts: {} }
  }

  batch[key].requestCount++

  const endpoint = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:id',
  )
  batch[key].endpointCounts[endpoint] = (batch[key].endpointCounts[endpoint] || 0) + 1

  pendingCount++

  if (pendingCount >= FLUSH_THRESHOLD) {
    flushBatch()
  }
}

async function flushBatch() {
  const entries = Object.values(batch)
  if (entries.length === 0) return

  for (const key of Object.keys(batch)) {
    Reflect.deleteProperty(batch, key)
  }
  pendingCount = 0

  try {
    for (const entry of entries) {
      await db
        .insert(apiUsageDaily)
        .values({
          userId: entry.userId,
          date: entry.date,
          requestCount: entry.requestCount,
          endpointCounts: entry.endpointCounts,
        })
        .onConflictDoUpdate({
          target: [apiUsageDaily.userId, apiUsageDaily.date],
          set: {
            requestCount: sql`${apiUsageDaily.requestCount} + ${entry.requestCount}`,
            endpointCounts: sql`${apiUsageDaily.endpointCounts} || ${JSON.stringify(entry.endpointCounts)}::jsonb`,
            updatedAt: new Date(),
          },
        })
    }
  } catch (err) {
    console.error('Failed to flush usage batch:', err)
  }
}

export default defineNitroPlugin((nitroApp) => {
  flushTimer = setInterval(flushBatch, FLUSH_INTERVAL_MS)

  nitroApp.hooks.hook('afterResponse', (event) => {
    const path = event.path
    if (!shouldTrack(path)) return

    const userId = (event.context.user as { id?: string })?.id
    if (!userId) {
      const session = event.context.sessions as
        | Record<string, { user?: { id?: string } }>
        | undefined
      const sessionUser = session ? Object.values(session)[0]?.user : undefined
      if (sessionUser?.id) {
        recordRequest(sessionUser.id, path)
      }
      return
    }

    recordRequest(userId, path)
  })

  nitroApp.hooks.hook('close', async () => {
    if (flushTimer) clearInterval(flushTimer)
    await flushBatch()
  })
})
