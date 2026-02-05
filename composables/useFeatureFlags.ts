export function useFeatureFlags() {
  const { data: flags, refresh } = useFetch<Record<string, boolean>>('/api/features', {
    default: () => ({}),
  })

  function isEnabled(featureName: string): boolean {
    return flags.value?.[featureName] ?? false
  }

  function requireFeature(featureName: string): void {
    if (!isEnabled(featureName)) {
      throw createError({
        statusCode: 403,
        message: `Feature '${featureName}' is not available`,
      })
    }
  }

  return {
    flags,
    isEnabled,
    requireFeature,
    refresh,
  }
}
