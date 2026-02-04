import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { createCustomerPortalSession } from '~/server/services/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  if (!dbUser?.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      message: 'No billing account found. Please subscribe to a plan first.',
    })
  }

  const baseUrl = getHeader(event, 'origin') || 'http://localhost:3000'
  const returnUrl = `${baseUrl}/app/subscription`

  const session = await createCustomerPortalSession(
    dbUser.stripeCustomerId,
    returnUrl,
  )

  return {
    url: session.url,
  }
})
