import Stripe from 'stripe'
import {
  SUBSCRIPTION_PLANS,
  PAID_TIER_IDS,
  DEFAULT_TIER,
  type SubscriptionTier,
} from '~/shared/subscriptions'

const config = useRuntimeConfig()

export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2023-10-16',
})

export interface StripeProduct {
  productId: string
  priceIdMonthly: string
  priceIdYearly: string
}

let stripeProducts: Record<string, StripeProduct> | null = null

export async function getOrCreateStripeProducts(): Promise<Record<string, StripeProduct>> {
  if (stripeProducts) {
    return stripeProducts
  }

  const products: Record<string, StripeProduct> = {}

  for (const tierId of PAID_TIER_IDS) {
    const plan = SUBSCRIPTION_PLANS[tierId]
    if (!plan.stripe || !plan.pricing) continue

    const existingProducts = await stripe.products.search({
      query: `metadata['tier']:'${tierId}'`,
    })

    let product: Stripe.Product

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]
    } else {
      product = await stripe.products.create({
        name: plan.stripe.productName,
        description: plan.stripe.productDescription,
        metadata: { tier: tierId },
      })
    }

    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    })

    let priceMonthly = existingPrices.data.find((p) => p.recurring?.interval === 'month')
    let priceYearly = existingPrices.data.find((p) => p.recurring?.interval === 'year')

    if (!priceMonthly) {
      priceMonthly = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.pricing.monthly,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { tier: tierId, interval: 'month' },
      })
    }

    if (!priceYearly) {
      priceYearly = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.pricing.yearly,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: { tier: tierId, interval: 'year' },
      })
    }

    products[tierId] = {
      productId: product.id,
      priceIdMonthly: priceMonthly.id,
      priceIdYearly: priceYearly.id,
    }
  }

  stripeProducts = products
  return stripeProducts
}

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  tier: SubscriptionTier,
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

export function getTierFromPriceId(
  priceId: string,
  products: Record<string, StripeProduct>,
): SubscriptionTier {
  for (const [tier, product] of Object.entries(products)) {
    if (product.priceIdMonthly === priceId || product.priceIdYearly === priceId) {
      return tier as SubscriptionTier
    }
  }
  return DEFAULT_TIER
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
