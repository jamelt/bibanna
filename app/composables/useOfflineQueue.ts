interface QueuedAction {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: 'entry' | 'project' | 'tag' | 'annotation'
  data: Record<string, unknown>
  timestamp: number
  synced: boolean
}

const STORAGE_KEY = 'annobib-offline-queue'

export function useOfflineQueue() {
  const queue = ref<QueuedAction[]>([])
  const isSyncing = ref(false)
  const isOnline = ref(true)

  onMounted(() => {
    loadQueue()

    isOnline.value = navigator.onLine
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  function loadQueue() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      queue.value = JSON.parse(stored)
    }
  }

  function saveQueue() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.value))
  }

  function addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'synced'>) {
    const newAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
    }

    queue.value.push(newAction)
    saveQueue()

    if (isOnline.value) {
      syncQueue()
    } else if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register('sync-actions')
      })
    }

    return newAction.id
  }

  async function syncQueue() {
    if (isSyncing.value || !isOnline.value) return

    isSyncing.value = true
    const unsynced = queue.value.filter((a) => !a.synced)

    for (const action of unsynced) {
      try {
        await syncAction(action)
        action.synced = true
      } catch (error) {
        console.error('Failed to sync action:', action.id, error)
        break
      }
    }

    queue.value = queue.value.filter((a) => !a.synced)
    saveQueue()
    isSyncing.value = false
  }

  async function syncAction(action: QueuedAction) {
    const endpoints: Record<string, string> = {
      entry: '/api/entries',
      project: '/api/projects',
      tag: '/api/tags',
      annotation: '/api/entries/{entryId}/annotations',
    }

    let url = endpoints[action.resource]
    if (!url) throw new Error(`Unknown resource: ${action.resource}`)

    if (action.resource === 'annotation' && action.data.entryId) {
      url = url.replace('{entryId}', action.data.entryId as string)
    }

    const method = {
      create: 'POST',
      update: 'PUT',
      delete: 'DELETE',
    }[action.type]

    if (action.type !== 'create' && action.data.id) {
      url = `${url}/${action.data.id}`
    }

    await $fetch(url, {
      method,
      body: action.type !== 'delete' ? action.data : undefined,
    })
  }

  function handleOnline() {
    isOnline.value = true
    syncQueue()
  }

  function handleOffline() {
    isOnline.value = false
  }

  function clearQueue() {
    queue.value = []
    saveQueue()
  }

  const pendingCount = computed(() => queue.value.filter((a) => !a.synced).length)

  return {
    queue: readonly(queue),
    isOnline: readonly(isOnline),
    isSyncing: readonly(isSyncing),
    pendingCount,
    addToQueue,
    syncQueue,
    clearQueue,
  }
}
