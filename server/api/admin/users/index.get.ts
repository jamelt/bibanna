import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq, like, or, sql, count, desc, asc } from 'drizzle-orm'
import { requireAdminOrSupport } from '~/server/utils/auth'
import { z } from 'zod'
import { tierZodSchema } from '~/shared/subscriptions'

const querySchema = z.object({
  q: z.string().optional(),
  tier: z.enum(tierZodSchema()).optional(),
  role: z.enum(['user', 'admin', 'support']).optional(),
  banned: z.enum(['true', 'false']).optional(),
  sortBy: z
    .enum(['createdAt', 'email', 'name', 'subscriptionTier'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export default defineEventHandler(async (event) => {
  await requireAdminOrSupport(event)

  const query = getQuery(event)
  const parsed = querySchema.parse(query)

  const conditions = []
  if (parsed.q) {
    const searchTerm = `%${parsed.q}%`
    conditions.push(or(like(users.email, searchTerm), like(users.name, searchTerm)))
  }
  if (parsed.tier) {
    conditions.push(eq(users.subscriptionTier, parsed.tier))
  }
  if (parsed.role) {
    conditions.push(eq(users.role, parsed.role))
  }
  if (parsed.banned === 'true') {
    conditions.push(eq(users.isBanned, true))
  }
  if (parsed.banned === 'false') {
    conditions.push(eq(users.isBanned, false))
  }

  const whereClause =
    conditions.length > 0
      ? sql`${sql.join(
          conditions.map((c) => sql`(${c})`),
          sql` AND `,
        )}`
      : undefined

  const sortColumn =
    {
      createdAt: users.createdAt,
      email: users.email,
      name: users.name,
      subscriptionTier: users.subscriptionTier,
    }[parsed.sortBy] ?? users.createdAt

  const orderFn = parsed.sortOrder === 'asc' ? asc : desc

  const [totalResult, userRows] = await Promise.all([
    db.select({ count: count() }).from(users).where(whereClause),
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        subscriptionTier: users.subscriptionTier,
        role: users.role,
        isBanned: users.isBanned,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(parsed.pageSize)
      .offset((parsed.page - 1) * parsed.pageSize),
  ])

  const total = totalResult[0]?.count ?? 0

  return {
    data: userRows,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalPages: Math.ceil(total / parsed.pageSize),
  }
})
