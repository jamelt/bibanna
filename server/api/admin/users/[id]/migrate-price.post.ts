import { db } from '~/server/database/client'
import { subscriptions } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { stripe, getOrCreateStripeProducts } from '~/server/services/stripe'
import { z } from 'zod'

const migrateSchema = z.object({
  interval: z.enum(['month', 'year']),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const body = await readBody(event)
  const parsed = migrateSchema.parse(body)

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    orderBy: (subs, { desc }) => [desc(subs.createdAt)],
  })

  if (!subscription?.stripeSubscriptionId) {
    throw createError({ statusCode: 404, message: 'No active Stripe subscription found' })
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
  if (!stripeSubscription || stripeSubscription.status === 'canceled') {
    throw createError({ statusCode: 400, message: 'Stripe subscription is not active' })
  }

  const products = await getOrCreateStripeProducts()
  const tier = subscription.tier
  const product = products[tier]

  if (!product) {
    throw createError({ statusCode: 400, message: `No Stripe product found for tier: ${tier}` })
  }

  const newPriceId = parsed.interval === 'month' ? product.priceIdMonthly : product.priceIdYearly

  const subscriptionItem = stripeSubscription.items.data[0]
  if (!subscriptionItem) {
    throw createError({ statusCode: 400, message: 'No subscription items found' })
  }

  const oldPriceId = subscriptionItem.price.id
  const oldAmount = subscriptionItem.price.unit_amount

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    items: [
      {
        id: subscriptionItem.id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })

  await db
    .update(subscriptions)
    .set({
      stripePriceId: newPriceId,
      billingInterval: parsed.interval,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  await logAdminAction(
    admin.id,
    'user.migrate_price',
    'user',
    userId,
    {
      oldPriceId,
      newPriceId,
      oldAmount,
      interval: parsed.interval,
    },
    ip,
  )

  return { success: true, newPriceId, interval: parsed.interval }
})
