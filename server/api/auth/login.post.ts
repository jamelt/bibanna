import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { autoPromoteIfAdmin } from '~/server/utils/admin-emails'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'login', 5, 60_000)

  const body = await readBody(event)

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message || 'Invalid input',
    })
  }

  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const hashedPassword = await hashPassword(password)
  const auth0Id = `local:${normalizedEmail}:${hashedPassword}`

  const user = await db.query.users.findFirst({
    where: and(eq(users.email, normalizedEmail), eq(users.auth0Id, auth0Id)),
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  await autoPromoteIfAdmin(user.email)

  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
