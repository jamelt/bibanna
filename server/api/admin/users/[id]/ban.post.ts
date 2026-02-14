import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { z } from 'zod'

const banSchema = z.object({
  reason: z.string().min(1, 'A reason is required'),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  if (userId === admin.id) {
    throw createError({ statusCode: 400, message: 'You cannot ban yourself' })
  }

  const body = await readBody(event)
  const parsed = banSchema.parse(body)

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (targetUser.role === 'admin') {
    throw createError({ statusCode: 403, message: 'Cannot ban another admin' })
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  const [updated] = await db
    .update(users)
    .set({
      isBanned: true,
      bannedAt: new Date(),
      bannedReason: parsed.reason,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  await logAdminAction(admin.id, 'user.ban', 'user', userId, { reason: parsed.reason }, ip)

  return updated
})
