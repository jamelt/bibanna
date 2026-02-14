import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { DEFAULT_TIER } from '~/shared/subscriptions'
import { isAutoAdminEmail } from '~/server/utils/admin-emails'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'register', 3, 60_000)

  const body = await readBody(event)

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Invalid input',
    })
  }

  const { name, email, password } = parsed.data

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'An account with this email already exists',
    })
  }

  const normalizedEmail = email.toLowerCase()
  const hashedPassword = await hashPassword(password)

  const [newUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      name,
      auth0Id: `local:${normalizedEmail}:${hashedPassword}`,
      subscriptionTier: DEFAULT_TIER,
      role: isAutoAdminEmail(normalizedEmail) ? 'admin' : 'user',
    })
    .returning()

  if (!newUser) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create user',
    })
  }

  await setUserSession(event, {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    },
  })

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
  }
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
