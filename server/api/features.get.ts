import { getAllFeatureFlags, type FeatureFlagContext } from '~/server/utils/feature-flags'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event).catch(() => null)
  
  const context: FeatureFlagContext = {
    userId: user?.id,
    subscriptionTier: user?.subscriptionTier || 'free',
    environment: process.env.NODE_ENV,
  }
  
  return getAllFeatureFlags(context)
})
