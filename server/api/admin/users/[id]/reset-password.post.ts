import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const resetSchema = z.object({
  password: z.string().min(8).optional(),
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'reset-password', 3, 60_000)

  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const body = await readBody(event).catch(() => ({}))
  const parsed = resetSchema.parse(body ?? {})

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const newPassword = parsed.password || randomBytes(12).toString('base64url').slice(0, 16)
  const hashedPassword = await hashPassword(newPassword)
  const newAuth0Id = `local:${targetUser.email}:${hashedPassword}`

  await db
    .update(users)
    .set({
      auth0Id: newAuth0Id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  await logAdminAction(admin.id, 'user.reset_password', 'user', userId, {}, ip)

  return { temporaryPassword: newPassword }
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
