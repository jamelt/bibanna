import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { z } from 'zod'
import { tierZodSchema } from '~/shared/subscriptions'

const updateSchema = z.object({
  role: z.enum(['user', 'admin', 'support']).optional(),
  subscriptionTier: z.enum(tierZodSchema()).optional(),
  isBanned: z.boolean().optional(),
  bannedReason: z.string().optional(),
  name: z.string().optional(),
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
      message: 'You cannot modify your own account through admin tools',
    })
  }

  const body = await readBody(event)
  const parsed = updateSchema.parse(body)

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!existingUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  if (parsed.role !== undefined && parsed.role !== existingUser.role) {
    changes.role = { from: existingUser.role, to: parsed.role }
    updates.role = parsed.role
  }

  if (
    parsed.subscriptionTier !== undefined &&
    parsed.subscriptionTier !== existingUser.subscriptionTier
  ) {
    changes.subscriptionTier = { from: existingUser.subscriptionTier, to: parsed.subscriptionTier }
    updates.subscriptionTier = parsed.subscriptionTier
  }

  if (parsed.isBanned !== undefined && parsed.isBanned !== existingUser.isBanned) {
    changes.isBanned = { from: existingUser.isBanned, to: parsed.isBanned }
    updates.isBanned = parsed.isBanned
    updates.bannedAt = parsed.isBanned ? new Date() : null
    updates.bannedReason = parsed.isBanned ? parsed.bannedReason || null : null
  }

  if (parsed.name !== undefined && parsed.name !== existingUser.name) {
    changes.name = { from: existingUser.name, to: parsed.name }
    updates.name = parsed.name
  }

  if (Object.keys(changes).length === 0) {
    return existingUser
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, userId)).returning()

  await logAdminAction(admin.id, 'user.update', 'user', userId, changes, ip)

  return updatedUser
})
