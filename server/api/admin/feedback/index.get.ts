import { db } from '~/server/database/client'
import { feedback, users } from '~/server/database/schema'
import { eq, desc, count, sql } from 'drizzle-orm'
import { requireAdminOrSupport } from '~/server/utils/auth'
import { z } from 'zod'

const querySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  type: z.enum(['bug', 'feature_request', 'general', 'complaint']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export default defineEventHandler(async (event) => {
  await requireAdminOrSupport(event)

  const query = getQuery(event)
  const parsed = querySchema.parse(query)

  const conditions = []
  if (parsed.status) {
    conditions.push(eq(feedback.status, parsed.status))
  }
  if (parsed.type) {
    conditions.push(eq(feedback.type, parsed.type))
  }

  const whereClause =
    conditions.length > 0
      ? sql`${sql.join(
          conditions.map((c) => sql`(${c})`),
          sql` AND `,
        )}`
      : undefined

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(feedback).where(whereClause),
    db
      .select({
        id: feedback.id,
        userId: feedback.userId,
        userEmail: feedback.userEmail,
        type: feedback.type,
        subject: feedback.subject,
        content: feedback.content,
        status: feedback.status,
        adminNotes: feedback.adminNotes,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        userName: users.name,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .where(whereClause)
      .orderBy(desc(feedback.createdAt))
      .limit(parsed.pageSize)
      .offset((parsed.page - 1) * parsed.pageSize),
  ])

  const total = totalResult[0]?.count ?? 0

  return {
    data: rows,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalPages: Math.ceil(total / parsed.pageSize),
  }
})
