import { db } from '~/server/database/client'
import { users, subscriptions } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import {
  stripe,
  getOrCreateStripeProducts,
  getTierFromPriceId,
  mapStripeStatus,
} from '~/server/services/stripe'
import { DEFAULT_TIER } from '~/shared/subscriptions'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (!targetUser.stripeCustomerId) {
    return {
      synced: false,
      message: 'User has no Stripe customer ID',
      tier: targetUser.subscriptionTier,
      stripeSubscription: null,
    }
  }

  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: targetUser.stripeCustomerId,
    status: 'all',
    limit: 1,
    expand: ['data.default_payment_method'],
  })

  const activeSub = stripeSubscriptions.data[0]

  if (!activeSub) {
    if (targetUser.subscriptionTier !== DEFAULT_TIER) {
      await db
        .update(users)
        .set({
          subscriptionTier: DEFAULT_TIER,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
    }

    const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
    await logAdminAction(
      admin.id,
      'user.sync_stripe',
      'user',
      userId,
      {
        result: 'no_subscription',
        previousTier: targetUser.subscriptionTier,
        newTier: DEFAULT_TIER,
      },
      ip,
    )

    return {
      synced: true,
      message: 'No active Stripe subscription found. User reverted to free tier.',
      tier: DEFAULT_TIER,
      stripeSubscription: null,
    }
  }

  const products = await getOrCreateStripeProducts()
  const priceItem = activeSub.items.data[0]?.price
  const priceId = priceItem?.id
  const tier = priceId ? getTierFromPriceId(priceId, products) : DEFAULT_TIER
  const status = mapStripeStatus(activeSub.status)
  const effectiveTier =
    status === 'active' || status === 'trialing' || status === 'past_due' ? tier : DEFAULT_TIER

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: activeSub.id,
      tier,
      status: status as any,
      currentPeriodStart: new Date(activeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(activeSub.current_period_end * 1000),
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
      stripePriceId: priceId || null,
      unitAmount: priceItem?.unit_amount ?? null,
      billingInterval: priceItem?.recurring?.interval || null,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        tier,
        status: status as any,
        currentPeriodStart: new Date(activeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(activeSub.current_period_end * 1000),
        cancelAtPeriodEnd: activeSub.cancel_at_period_end,
        stripePriceId: priceId || null,
        unitAmount: priceItem?.unit_amount ?? null,
        billingInterval: priceItem?.recurring?.interval || null,
        updatedAt: new Date(),
      },
    })

  await db
    .update(users)
    .set({
      subscriptionTier: effectiveTier,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  await logAdminAction(
    admin.id,
    'user.sync_stripe',
    'user',
    userId,
    {
      previousTier: targetUser.subscriptionTier,
      newTier: effectiveTier,
      stripeStatus: activeSub.status,
      stripeSubscriptionId: activeSub.id,
    },
    ip,
  )

  return {
    synced: true,
    message: `Subscription synced. Tier: ${effectiveTier}, Stripe status: ${activeSub.status}`,
    tier: effectiveTier,
    stripeSubscription: {
      id: activeSub.id,
      status: activeSub.status,
      currentPeriodEnd: new Date(activeSub.current_period_end * 1000),
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
    },
  }
})
