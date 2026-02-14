import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { z } from 'zod'
import { tierZodSchema } from '~/shared/subscriptions'

const grantSchema = z.object({
  tier: z.enum(tierZodSchema()),
  reason: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const body = await readBody(event)
  const parsed = grantSchema.parse(body)

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
      subscriptionTier: parsed.tier,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  await logAdminAction(
    admin.id,
    'user.grant_tier',
    'user',
    userId,
    {
      previousTier: targetUser.subscriptionTier,
      newTier: parsed.tier,
      reason: parsed.reason,
    },
    ip,
  )

  return updated
})
