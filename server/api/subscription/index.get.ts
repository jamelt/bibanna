import { db } from '~/server/database/client'
import { users, subscriptions } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { getTierLimits, getPaidPlansForDisplay } from '~/shared/subscriptions'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
    orderBy: (subs, { desc }) => [desc(subs.createdAt)],
  })

  const limits = getTierLimits(user.subscriptionTier)

  const paidPlans = getPaidPlansForDisplay()
  const products: Record<
    string,
    { name: string; description: string; priceMonthly: number; priceYearly: number }
  > = {}
  for (const plan of paidPlans) {
    if (plan.pricing) {
      products[plan.id] = {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.pricing.monthly / 100,
        priceYearly: plan.pricing.yearly / 100,
      }
    }
  }

  return {
    tier: user.subscriptionTier,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          graceEndsAt: subscription.graceEndsAt,
          lastPaymentError: subscription.lastPaymentError,
        }
      : null,
    limits,
    hasStripeCustomer: !!dbUser?.stripeCustomerId,
    products,
  }
})
