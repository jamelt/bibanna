export function useQuickAdd() {
  const isOpen = useState('quick-add-open', () => false)
  const defaultProjectId = useState<string | undefined>('quick-add-project-id', () => undefined)
  const route = useRoute()
  const router = useRouter()

  function open(projectId?: string) {
    defaultProjectId.value = projectId
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    defaultProjectId.value = undefined
  }

  watch(
    () => route.query.action,
    (action) => {
      isOpen.value = action === 'quick-add'
    },
    { immediate: true },
  )

  watch(isOpen, (open) => {
    if (!open) {
      defaultProjectId.value = undefined
      if (route.query.action === 'quick-add') {
        router.replace({ path: route.path, query: {} })
      }
    }
  })

  return { isOpen, defaultProjectId, open, close }
}
