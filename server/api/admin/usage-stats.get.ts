import { db } from '~/server/database/client'
import { apiUsageDaily, users } from '~/server/database/schema'
import { requireAdminOrSupport } from '~/server/utils/auth'
import { sql, gte, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export default defineEventHandler(async (event) => {
  await requireAdminOrSupport(event)

  const query = getQuery(event)
  const parsed = querySchema.parse(query)

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - parsed.days)
  const sinceDateStr = sinceDate.toISOString().slice(0, 10)

  const topUsers = await db
    .select({
      userId: apiUsageDaily.userId,
      email: users.email,
      name: users.name,
      totalRequests: sql<number>`sum(${apiUsageDaily.requestCount})::int`.as('total_requests'),
      activeDays: sql<number>`count(*)::int`.as('active_days'),
    })
    .from(apiUsageDaily)
    .innerJoin(users, eq(apiUsageDaily.userId, users.id))
    .where(gte(apiUsageDaily.date, sinceDateStr))
    .groupBy(apiUsageDaily.userId, users.email, users.name)
    .orderBy(desc(sql`sum(${apiUsageDaily.requestCount})`))
    .limit(parsed.limit)

  const avgResult = await db
    .select({
      avgDaily: sql<number>`coalesce(avg(${apiUsageDaily.requestCount}), 0)::int`.as('avg_daily'),
    })
    .from(apiUsageDaily)
    .where(gte(apiUsageDaily.date, sinceDateStr))

  const globalAvgDaily = avgResult[0]?.avgDaily ?? 0

  return {
    users: topUsers.map((u) => ({
      userId: u.userId,
      email: u.email,
      name: u.name,
      totalRequests: u.totalRequests,
      avgDaily: u.activeDays > 0 ? Math.round(u.totalRequests / u.activeDays) : 0,
      activeDays: u.activeDays,
    })),
    globalAvgDaily,
    days: parsed.days,
  }
})
