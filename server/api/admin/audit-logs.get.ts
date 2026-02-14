import { db } from '~/server/database/client'
import { adminAuditLogs, users } from '~/server/database/schema'
import { eq, desc, count, sql, and } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'
import { z } from 'zod'

const querySchema = z.object({
  action: z.string().optional(),
  adminId: z.string().uuid().optional(),
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const parsed = querySchema.parse(query)

  const conditions = []
  if (parsed.action) {
    conditions.push(eq(adminAuditLogs.action, parsed.action))
  }
  if (parsed.adminId) {
    conditions.push(eq(adminAuditLogs.adminId, parsed.adminId))
  }
  if (parsed.targetType) {
    conditions.push(eq(adminAuditLogs.targetType, parsed.targetType))
  }
  if (parsed.targetId) {
    conditions.push(eq(adminAuditLogs.targetId, parsed.targetId))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(adminAuditLogs).where(whereClause),
    db
      .select({
        id: adminAuditLogs.id,
        adminId: adminAuditLogs.adminId,
        action: adminAuditLogs.action,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        details: adminAuditLogs.details,
        ipAddress: adminAuditLogs.ipAddress,
        createdAt: adminAuditLogs.createdAt,
        adminName: users.name,
        adminEmail: users.email,
      })
      .from(adminAuditLogs)
      .leftJoin(users, eq(adminAuditLogs.adminId, users.id))
      .where(whereClause)
      .orderBy(desc(adminAuditLogs.createdAt))
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
