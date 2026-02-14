const STORAGE_PREFIX = 'annobib:viewMode:'

export function useViewPreferences<T extends string>(pageKey: string, defaultMode: T) {
  const storageKey = `${STORAGE_PREFIX}${pageKey}`
  const viewMode = ref<T>(defaultMode) as Ref<T>

  onMounted(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        viewMode.value = stored as T
      }
    } catch {
      // localStorage unavailable (SSR, private browsing)
    }
  })

  watch(viewMode, (mode) => {
    try {
      localStorage.setItem(storageKey, mode)
    } catch {
      // localStorage unavailable
    }
  })

  return viewMode
}
