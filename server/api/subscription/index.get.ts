import { db } from '~/server/database/client'
import { users, subscriptions } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { STRIPE_PRODUCTS } from '~/server/services/stripe'
import { TIER_LIMITS } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
    orderBy: (subs, { desc }) => [desc(subs.createdAt)],
  })

  const limits = TIER_LIMITS[user.subscriptionTier]

  return {
    tier: user.subscriptionTier,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
    limits,
    hasStripeCustomer: !!dbUser?.stripeCustomerId,
    products: {
      light: {
        name: STRIPE_PRODUCTS.light.name,
        description: STRIPE_PRODUCTS.light.description,
        priceMonthly: STRIPE_PRODUCTS.light.priceMonthly / 100,
        priceYearly: STRIPE_PRODUCTS.light.priceYearly / 100,
      },
      pro: {
        name: STRIPE_PRODUCTS.pro.name,
        description: STRIPE_PRODUCTS.pro.description,
        priceMonthly: STRIPE_PRODUCTS.pro.priceMonthly / 100,
        priceYearly: STRIPE_PRODUCTS.pro.priceYearly / 100,
      },
    },
  }
})
