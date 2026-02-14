import {
  SUBSCRIPTION_PLANS,
  type SubscriptionTier,
  type SubscriptionPlan,
  type PlanLimits,
  type PlanPricing,
  type PlanUI,
} from './plans'

const sortedPlans = Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.sortOrder - b.sortOrder)

export const TIER_IDS = sortedPlans.map((p) => p.id) as SubscriptionTier[]

export const PAID_TIER_IDS = sortedPlans
  .filter((p) => p.pricing !== null)
  .map((p) => p.id) as SubscriptionTier[]

export const DEFAULT_TIER: SubscriptionTier = 'free'

export function getTier(tierId: SubscriptionTier): SubscriptionPlan {
  const plan = SUBSCRIPTION_PLANS[tierId]
  if (!plan) {
    throw new Error(`Unknown subscription tier: ${tierId}`)
  }
  return plan
}

export function getTierDisplayName(tierId: SubscriptionTier): string {
  return getTier(tierId).name
}

export function getTierLimits(tierId: SubscriptionTier): PlanLimits {
  return getTier(tierId).limits
}

export function getTierPricing(tierId: SubscriptionTier): PlanPricing | null {
  return getTier(tierId).pricing
}

export function getDisplayPrice(tierId: SubscriptionTier, interval: 'monthly' | 'yearly'): string {
  const pricing = getTierPricing(tierId)
  if (!pricing) return '$0'
  const cents = interval === 'monthly' ? pricing.monthly : pricing.yearly
  const dollars = cents / 100
  return `$${dollars}`
}

export function getTierFeatures(tierId: SubscriptionTier): string[] {
  return getTier(tierId).features
}

export function hasFeatureAccess(tierId: SubscriptionTier, featureKey: string): boolean {
  return getTier(tierId).features.includes(featureKey)
}

export function getMinimumTierForFeature(featureKey: string): SubscriptionTier | null {
  for (const plan of sortedPlans) {
    if (plan.features.includes(featureKey)) {
      return plan.id as SubscriptionTier
    }
  }
  return null
}

export function getTierUI(tierId: SubscriptionTier): PlanUI {
  return getTier(tierId).ui
}

export function getAllPlansForDisplay(): SubscriptionPlan[] {
  return [...sortedPlans]
}

export function getPaidPlansForDisplay(): SubscriptionPlan[] {
  return sortedPlans.filter((p) => p.pricing !== null)
}

export function isPaidTier(tierId: SubscriptionTier): boolean {
  return getTier(tierId).pricing !== null
}

export function isValidTier(value: string): value is SubscriptionTier {
  return value in SUBSCRIPTION_PLANS
}

export function tierZodSchema() {
  return TIER_IDS as [string, ...string[]]
}

export function paidTierZodSchema() {
  return PAID_TIER_IDS as [string, ...string[]]
}

export const FEATURE_KEY_MAP: Record<string, string> = {
  pdfExport: 'pdf-export',
  docxExport: 'docx-export',
  excelExport: 'excel-export',
  customCitationStyles: 'custom-citation-styles',
  collaboration: 'collaboration',
  semanticSearch: 'semantic-search',
  aiAnnotations: 'ai-annotations',
  aiContext: 'ai-context',
  researchCompanion: 'research-companion',
  mindMaps: 'mind-maps',
  fullMindMaps: 'full-mind-maps',
  veritasScore: 'veritas-score',
  voiceInput: 'voice-input',
  whisperVoice: 'whisper-voice',
  multimodalAI: 'multimodal-ai',
}
