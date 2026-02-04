import Stripe from 'stripe'
import { db } from '~/server/database/client'
import { users, subscriptions } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import {
  stripe,
  getOrCreateStripeProducts,
  getTierFromPriceId,
  mapStripeStatus,
} from '~/server/services/stripe'

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
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripeWebhookSecret,
    )
  }
  catch (err: any) {
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
  products: Record<'light' | 'pro', { productId: string; priceIdMonthly: string; priceIdYearly: string }>,
) {
  const userId = session.client_reference_id || session.metadata?.userId
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId || !customerId || !subscriptionId) {
    console.error('Missing required data in checkout session')
    return
  }

  await db
    .update(users)
    .set({ stripeCustomerId: customerId })
    .where(eq(users.id, userId))

  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = stripeSubscription.items.data[0]?.price.id
  const tier = priceId ? getTierFromPriceId(priceId, products) : 'free'

  await db.insert(subscriptions).values({
    userId,
    stripeSubscriptionId: subscriptionId,
    tier,
    status: mapStripeStatus(stripeSubscription.status) as any,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  }).onConflictDoUpdate({
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
  products: Record<'light' | 'pro', { productId: string; priceIdMonthly: string; priceIdYearly: string }>,
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

  const priceId = subscription.items.data[0]?.price.id
  const tier = priceId ? getTierFromPriceId(priceId, products) : 'free'
  const status = mapStripeStatus(subscription.status)

  await db.insert(subscriptions).values({
    userId: subscription.metadata.userId!,
    stripeSubscriptionId: subscription.id,
    tier,
    status: status as any,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }).onConflictDoUpdate({
    target: subscriptions.stripeSubscriptionId,
    set: {
      tier,
      status: status as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    },
  })

  const effectiveTier = status === 'active' || status === 'trialing' ? tier : 'free'

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
      subscriptionTier: 'free',
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
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata?.userId

  if (!userId) return

  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
}
