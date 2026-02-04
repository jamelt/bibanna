import type { SubscriptionTier } from '~/shared/types'

export interface SubscriptionData {
  tier: SubscriptionTier
  subscription: {
    id: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  } | null
  limits: {
    entries: number
    projects: number
    collaboratorsPerProject: number
    customCitationStyles: number
    metadataEnrichmentPerMonth: number
    aiAnnotationsPerMonth: number
    voiceMinutesPerMonth: number
    excelPresets: number
    customColumns: number
  }
  hasStripeCustomer: boolean
  products: {
    light: ProductInfo
    pro: ProductInfo
  }
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

  const tier = computed(() => data.value?.tier || 'free')
  const subscription = computed(() => data.value?.subscription)
  const limits = computed(() => data.value?.limits)
  const products = computed(() => data.value?.products)

  const isFree = computed(() => tier.value === 'free')
  const isLight = computed(() => tier.value === 'light')
  const isPro = computed(() => tier.value === 'pro')
  const isPaid = computed(() => tier.value !== 'free')

  const isActive = computed(() => {
    if (!subscription.value) return tier.value === 'free'
    return subscription.value.status === 'active' || subscription.value.status === 'trialing'
  })

  const isCanceled = computed(() => subscription.value?.cancelAtPeriodEnd || false)

  const periodEnd = computed(() => {
    if (!subscription.value?.currentPeriodEnd) return null
    return new Date(subscription.value.currentPeriodEnd)
  })

  function hasFeature(feature: string): boolean {
    const featureMap: Record<string, SubscriptionTier[]> = {
      pdfExport: ['light', 'pro'],
      docxExport: ['light', 'pro'],
      customCitationStyles: ['light', 'pro'],
      collaboration: ['light', 'pro'],
      semanticSearch: ['pro'],
      aiAnnotations: ['light', 'pro'],
      aiContext: ['pro'],
      researchCompanion: ['pro'],
      mindMaps: ['light', 'pro'],
      fullMindMaps: ['pro'],
      veritasScore: ['pro'],
      voiceInput: ['free', 'light', 'pro'],
      whisperVoice: ['light', 'pro'],
      multimodalAI: ['pro'],
    }

    const allowedTiers = featureMap[feature]
    if (!allowedTiers) return true
    return allowedTiers.includes(tier.value)
  }

  function requireFeature(feature: string): void {
    if (!hasFeature(feature)) {
      throw createError({
        statusCode: 403,
        message: `This feature requires a higher subscription tier`,
      })
    }
  }

  async function startCheckout(targetTier: 'light' | 'pro', interval: 'month' | 'year' = 'month') {
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
    isActive,
    isCanceled,
    periodEnd,
    hasFeature,
    requireFeature,
    startCheckout,
    openPortal,
  }
}
