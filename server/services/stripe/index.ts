import Stripe from 'stripe'
import type { SubscriptionTier } from '~/shared/types'

const config = useRuntimeConfig()

export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2023-10-16',
})

export const STRIPE_PRODUCTS = {
  light: {
    name: 'Bibanna Light',
    description: 'For active researchers - 500 entries, 15 projects, PDF export',
    priceMonthly: 900,
    priceYearly: 9000,
  },
  pro: {
    name: 'Bibanna Pro',
    description: 'For power users - Unlimited entries, AI features, Research Companion',
    priceMonthly: 1900,
    priceYearly: 19000,
  },
} as const

export interface StripeProduct {
  productId: string
  priceIdMonthly: string
  priceIdYearly: string
}

let stripeProducts: Record<'light' | 'pro', StripeProduct> | null = null

export async function getOrCreateStripeProducts(): Promise<Record<'light' | 'pro', StripeProduct>> {
  if (stripeProducts) {
    return stripeProducts
  }

  const products: Record<string, StripeProduct> = {}

  for (const [tier, config] of Object.entries(STRIPE_PRODUCTS)) {
    const existingProducts = await stripe.products.search({
      query: `metadata['tier']:'${tier}'`,
    })

    let product: Stripe.Product

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]
    }
    else {
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: { tier },
      })
    }

    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    })

    let priceMonthly = existingPrices.data.find(
      p => p.recurring?.interval === 'month',
    )
    let priceYearly = existingPrices.data.find(
      p => p.recurring?.interval === 'year',
    )

    if (!priceMonthly) {
      priceMonthly = await stripe.prices.create({
        product: product.id,
        unit_amount: config.priceMonthly,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { tier, interval: 'month' },
      })
    }

    if (!priceYearly) {
      priceYearly = await stripe.prices.create({
        product: product.id,
        unit_amount: config.priceYearly,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: { tier, interval: 'year' },
      })
    }

    products[tier] = {
      productId: product.id,
      priceIdMonthly: priceMonthly.id,
      priceIdYearly: priceYearly.id,
    }
  }

  stripeProducts = products as Record<'light' | 'pro', StripeProduct>
  return stripeProducts
}

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  tier: 'light' | 'pro',
  interval: 'month' | 'year',
  successUrl: string,
  cancelUrl: string,
): Promise<Stripe.Checkout.Session> {
  const products = await getOrCreateStripeProducts()
  const product = products[tier]

  const priceId = interval === 'month' ? product.priceIdMonthly : product.priceIdYearly

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
      tier,
      interval,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
    allow_promotion_codes: true,
  })

  return session
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId)
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

export function getTierFromPriceId(priceId: string, products: Record<'light' | 'pro', StripeProduct>): SubscriptionTier {
  for (const [tier, product] of Object.entries(products)) {
    if (product.priceIdMonthly === priceId || product.priceIdYearly === priceId) {
      return tier as SubscriptionTier
    }
  }
  return 'free'
}

export function mapStripeStatus(status: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete',
    unpaid: 'past_due',
    paused: 'canceled',
  }
  return statusMap[status] || 'incomplete'
}
