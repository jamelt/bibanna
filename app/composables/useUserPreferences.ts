import type { UserPreferences } from '~/shared/types'

const DEFAULT_CITATION_STYLE = 'apa-7th'

export function useUserPreferences() {
  const { data, pending, refresh } = useFetch<UserPreferences>('/api/user/preferences', {
    key: 'user-preferences',
    default: () => ({}),
  })

  const defaultCitationStyle = computed(
    () => data.value?.defaultCitationStyle || DEFAULT_CITATION_STYLE,
  )

  const defaultExportFormat = computed(() => data.value?.defaultExportFormat)

  async function setDefaultCitationStyle(styleId: string) {
    await $fetch('/api/user/preferences', {
      method: 'PATCH',
      body: { defaultCitationStyle: styleId },
    })
    await refresh()
  }

  async function updatePreferences(updates: Partial<UserPreferences>) {
    await $fetch('/api/user/preferences', {
      method: 'PATCH',
      body: updates,
    })
    await refresh()
  }

  return {
    preferences: data,
    pending,
    refresh,
    defaultCitationStyle,
    defaultExportFormat,
    setDefaultCitationStyle,
    updatePreferences,
  }
}
