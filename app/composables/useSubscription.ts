import {
  type SubscriptionTier,
  type PlanLimits,
  DEFAULT_TIER,
  hasFeatureAccess,
  FEATURE_KEY_MAP,
  getPaidPlansForDisplay,
} from '~/shared/subscriptions'

export interface SubscriptionData {
  tier: SubscriptionTier
  subscription: {
    id: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  } | null
  limits: PlanLimits
  hasStripeCustomer: boolean
  products: Record<string, ProductInfo>
}

export interface ProductInfo {
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
}

export function useSubscription() {
  const { data, pending, error, refresh } = useFetch<SubscriptionData>('/api/subscription', {
    key: 'subscription',
  })

  const tier = computed(() => data.value?.tier || DEFAULT_TIER)
  const subscription = computed(() => data.value?.subscription)
  const limits = computed(() => data.value?.limits)
  const products = computed(() => data.value?.products)

  const isFree = computed(() => tier.value === 'free')
  const isLight = computed(() => tier.value === 'light')
  const isPro = computed(() => tier.value === 'pro')
  const isPaid = computed(() => tier.value !== DEFAULT_TIER)

  function isTier(id: SubscriptionTier): boolean {
    return tier.value === id
  }

  const isActive = computed(() => {
    if (!subscription.value) return tier.value === DEFAULT_TIER
    return subscription.value.status === 'active' || subscription.value.status === 'trialing'
  })

  const isCanceled = computed(() => subscription.value?.cancelAtPeriodEnd || false)

  const periodEnd = computed(() => {
    if (!subscription.value?.currentPeriodEnd) return null
    return new Date(subscription.value.currentPeriodEnd)
  })

  function hasFeature(feature: string): boolean {
    const featureKey = FEATURE_KEY_MAP[feature] || feature
    return hasFeatureAccess(tier.value, featureKey)
  }

  function requireFeature(feature: string): void {
    if (!hasFeature(feature)) {
      throw createError({
        statusCode: 403,
        message: `This feature requires a higher subscription tier`,
      })
    }
  }

  const paidTierIds = getPaidPlansForDisplay().map((p) => p.id) as SubscriptionTier[]

  async function startCheckout(targetTier: SubscriptionTier, interval: 'month' | 'year' = 'month') {
    const response = await $fetch<{ url: string }>('/api/subscription/checkout', {
      method: 'POST',
      body: { tier: targetTier, interval },
    })

    if (response.url) {
      await navigateTo(response.url, { external: true })
    }
  }

  async function openPortal() {
    const response = await $fetch<{ url: string }>('/api/subscription/portal', {
      method: 'POST',
    })

    if (response.url) {
      await navigateTo(response.url, { external: true })
    }
  }

  return {
    data,
    pending,
    error,
    refresh,
    tier,
    subscription,
    limits,
    products,
    isFree,
    isLight,
    isPro,
    isPaid,
    isTier,
    isActive,
    isCanceled,
    periodEnd,
    hasFeature,
    requireFeature,
    startCheckout,
    openPortal,
    paidTierIds,
  }
}
