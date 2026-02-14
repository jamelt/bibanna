const CACHE_NAME = 'annobib-v1'
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  '/',
  '/app',
  '/offline.html',
  '/manifest.json',
]

const CACHE_STRATEGIES = {
  networkFirst: [
    '/api/',
  ],
  cacheFirst: [
    '/icons/',
    '/_nuxt/',
    '/fonts/',
  ],
  staleWhileRevalidate: [
    '/app/',
  ],
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequest(request))
    }
    return
  }

  const strategy = getStrategy(url.pathname)
  
  switch (strategy) {
    case 'networkFirst':
      event.respondWith(networkFirst(request))
      break
    case 'cacheFirst':
      event.respondWith(cacheFirst(request))
      break
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request))
      break
    default:
      event.respondWith(networkFirst(request))
  }
})

function getStrategy(pathname) {
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(p => pathname.startsWith(p))) {
      return strategy
    }
  }
  return 'networkFirst'
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL)
    }
    throw new Error('Network unavailable')
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    throw new Error('Resource unavailable')
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request)
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, response.clone())
      })
    }
    return response
  }).catch(() => null)
  
  return cached || fetchPromise
}

async function handleApiRequest(request) {
  try {
    return await fetch(request)
  } catch {
    const queuedActions = await getQueuedActions()
    const action = {
      id: Date.now().toString(),
      url: request.url,
      method: request.method,
      body: await request.clone().text(),
      timestamp: Date.now(),
    }
    queuedActions.push(action)
    await saveQueuedActions(queuedActions)
    
    return new Response(JSON.stringify({ queued: true, actionId: action.id }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncQueuedActions())
  }
})

async function syncQueuedActions() {
  const actions = await getQueuedActions()
  
  for (const action of actions) {
    try {
      await fetch(action.url, {
        method: action.method,
        body: action.body,
        headers: { 'Content-Type': 'application/json' },
      })
      
      const remaining = actions.filter(a => a.id !== action.id)
      await saveQueuedActions(remaining)
    } catch {
      break
    }
  }
}

async function getQueuedActions() {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('actions', 'readonly')
    const store = tx.objectStore('actions')
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => resolve([])
  })
}

async function saveQueuedActions(actions) {
  const db = await openDB()
  const tx = db.transaction('actions', 'readwrite')
  const store = tx.objectStore('actions')
  store.clear()
  actions.forEach(action => store.add(action))
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('annobib-offline', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' })
      }
    }
  })
}

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AnnoBib', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.url,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/app')
  )
})
