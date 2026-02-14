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

  if (userId === admin.id) {
    throw createError({ statusCode: 400, message: 'You cannot impersonate yourself' })
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (targetUser.isBanned) {
    throw createError({ statusCode: 400, message: 'Cannot impersonate a banned user' })
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  await logAdminAction(
    admin.id,
    'user.impersonate',
    'user',
    userId,
    {
      targetEmail: targetUser.email,
    },
    ip,
  )

  await setUserSession(event, {
    user: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
    },
    impersonatedBy: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
    },
  })

  return {
    success: true,
    impersonating: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
    },
  }
})
