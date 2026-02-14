import { requireAdminOrSupport } from '~/server/utils/auth'
import { getAllFeatureFlags } from '~/server/utils/feature-flags'

export default defineEventHandler(async (event) => {
  await requireAdminOrSupport(event)

  const flags = getAllFeatureFlags()

  return {
    flags,
    source: 'environment-variables',
  }
})
