import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { createCheckoutSession } from '~/server/services/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
  tier: z.enum(['light', 'pro']),
  interval: z.enum(['month', 'year']),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid checkout data',
      data: parsed.error.flatten(),
    })
  }

  const { tier, interval } = parsed.data

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  if (!dbUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  const baseUrl = getHeader(event, 'origin') || 'http://localhost:3000'
  const successUrl = `${baseUrl}/app/subscription?success=true`
  const cancelUrl = `${baseUrl}/app/subscription?canceled=true`

  const session = await createCheckoutSession(
    user.id,
    dbUser.email,
    tier,
    interval,
    successUrl,
    cancelUrl,
  )

  return {
    url: session.url,
    sessionId: session.id,
  }
})
