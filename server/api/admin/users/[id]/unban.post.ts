import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  const [updated] = await db
    .update(users)
    .set({
      isBanned: false,
      bannedAt: null,
      bannedReason: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  await logAdminAction(admin.id, 'user.unban', 'user', userId, {}, ip)

  return updated
})
