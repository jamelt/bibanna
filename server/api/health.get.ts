import { db } from '~/server/database/client'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const start = Date.now()

  try {
    await db.execute(sql`SELECT 1`)
  } catch (error: any) {
    throw createError({
      statusCode: 503,
      message: 'Service unhealthy',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: error.message,
      },
    })
  }

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    latency: Date.now() - start,
  }
})
