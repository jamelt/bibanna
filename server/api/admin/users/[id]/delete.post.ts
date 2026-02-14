import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq, sql } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { z } from 'zod'

const deleteSchema = z.object({
  reason: z.string().min(1, 'A reason is required'),
  confirmEmail: z.string().email(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  if (userId === admin.id) {
    throw createError({
      statusCode: 400,
      message: 'You cannot delete your own account through admin tools',
    })
  }

  const body = await readBody(event)
  const parsed = deleteSchema.parse(body)

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (parsed.confirmEmail.toLowerCase() !== targetUser.email.toLowerCase()) {
    throw createError({ statusCode: 400, message: 'Email confirmation does not match' })
  }

  if (targetUser.role === 'admin') {
    throw createError({ statusCode: 403, message: 'Cannot delete another admin account' })
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  await logAdminAction(
    admin.id,
    'user.hard_delete',
    'user',
    userId,
    {
      targetEmail: targetUser.email,
      targetName: targetUser.name,
      reason: parsed.reason,
    },
    ip,
  )

  await db.delete(users).where(eq(users.id, userId))

  return {
    success: true,
    message: `User ${targetUser.email} and all associated data have been permanently deleted.`,
  }
})
