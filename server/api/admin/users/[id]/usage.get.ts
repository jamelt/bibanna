import { db } from '~/server/database/client'
import { apiUsageDaily } from '~/server/database/schema'
import { requireAdminOrSupport } from '~/server/utils/auth'
import { eq, gte, desc, and } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(14),
})

export default defineEventHandler(async (event) => {
  await requireAdminOrSupport(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const query = getQuery(event)
  const parsed = querySchema.parse(query)

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - parsed.days)
  const sinceDateStr = sinceDate.toISOString().slice(0, 10)

  const dailyUsage = await db
    .select()
    .from(apiUsageDaily)
    .where(and(eq(apiUsageDaily.userId, userId), gte(apiUsageDaily.date, sinceDateStr)))
    .orderBy(desc(apiUsageDaily.date))

  const totalRequests = dailyUsage.reduce((sum, d) => sum + d.requestCount, 0)

  const aggregatedEndpoints: Record<string, number> = {}
  for (const day of dailyUsage) {
    const counts = day.endpointCounts as Record<string, number>
    for (const [endpoint, count] of Object.entries(counts)) {
      aggregatedEndpoints[endpoint] = (aggregatedEndpoints[endpoint] || 0) + count
    }
  }

  const topEndpoints = Object.entries(aggregatedEndpoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }))

  return {
    daily: dailyUsage.map((d) => ({
      date: d.date,
      requestCount: d.requestCount,
    })),
    totalRequests,
    topEndpoints,
    days: parsed.days,
  }
})
