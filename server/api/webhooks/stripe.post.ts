import type Stripe from 'stripe'
import { db } from '~/server/database/client'
import { users, subscriptions } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import {
  stripe,
  getOrCreateStripeProducts,
  getTierFromPriceId,
  mapStripeStatus,
  type StripeProduct,
} from '~/server/services/stripe'
import { DEFAULT_TIER } from '~/shared/subscriptions'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!body || !signature) {
    throw createError({
      statusCode: 400,
      message: 'Missing body or signature',
    })
  }

  let stripeEvent: Stripe.Event

  try {
    stripeEvent = stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    throw createError({
      statusCode: 400,
      message: `Webhook Error: ${err.message}`,
    })
  }

  const products = await getOrCreateStripeProducts()

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(session, products)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      await handleSubscriptionUpdated(subscription, products)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object as Stripe.Subscription
      await handleSubscriptionDeleted(subscription)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      await handleInvoicePaymentSucceeded(invoice)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object as Stripe.Invoice
      await handleInvoicePaymentFailed(invoice)
      break
    }

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`)
  }

  return { received: true }
})

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  products: Record<string, StripeProduct>,
) {
  const userId = session.client_reference_id || session.metadata?.userId
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId || !customerId || !subscriptionId) {
    console.error('Missing required data in checkout session')
    return
  }

  await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId))

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = stripeSubscription.items.data[0]?.price.id
  const tier = priceId ? getTierFromPriceId(priceId, products) : DEFAULT_TIER

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeSubscriptionId: subscriptionId,
      tier,
      status: mapStripeStatus(stripeSubscription.status) as any,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        tier,
        status: mapStripeStatus(stripeSubscription.status) as any,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    })

  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  products: Record<string, StripeProduct>,
) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    const customer = await stripe.customers.retrieve(subscription.customer as string)
    if (customer.deleted) return

    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, subscription.customer as string),
    })

    if (!user) {
      console.error('User not found for subscription:', subscription.id)
      return
    }

    subscription.metadata = { ...subscription.metadata, userId: user.id }
  }

  const priceItem = subscription.items.data[0]?.price
  const priceId = priceItem?.id
  const tier = priceId ? getTierFromPriceId(priceId, products) : DEFAULT_TIER
  const status = mapStripeStatus(subscription.status)

  await db
    .insert(subscriptions)
    .values({
      userId: subscription.metadata.userId!,
      stripeSubscriptionId: subscription.id,
      tier,
      status: status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripePriceId: priceId || null,
      unitAmount: priceItem?.unit_amount ?? null,
      billingInterval: priceItem?.recurring?.interval || null,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        tier,
        status: status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        stripePriceId: priceId || null,
        unitAmount: priceItem?.unit_amount ?? null,
        billingInterval: priceItem?.recurring?.interval || null,
        updatedAt: new Date(),
      },
    })

  const effectiveTier =
    status === 'active' || status === 'trialing' || status === 'past_due' ? tier : DEFAULT_TIER

  await db
    .update(users)
    .set({
      subscriptionTier: effectiveTier,
      updatedAt: new Date(),
    })
    .where(eq(users.id, subscription.metadata.userId!))
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, subscription.customer as string),
    })

    if (!user) return

    subscription.metadata = { ...subscription.metadata, userId: user.id }
  }

  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

  await db
    .update(users)
    .set({
      subscriptionTier: DEFAULT_TIER,
      updatedAt: new Date(),
    })
    .where(eq(users.id, subscription.metadata.userId!))
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId

  if (!userId) return

  await db
    .update(subscriptions)
    .set({
      status: 'active',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      graceEndsAt: null,
      lastPaymentError: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId

  if (!userId) return

  const GRACE_PERIOD_DAYS = 14
  const graceEndsAt = new Date()
  graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS)

  const paymentError =
    invoice.last_finalization_error?.message ||
    (invoice.status_transitions?.finalized_at ? 'Payment failed' : 'Payment method declined')

  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      graceEndsAt,
      lastPaymentError: paymentError,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
}
