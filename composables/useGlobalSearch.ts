import { useDebounceFn, useLocalStorage } from '@vueuse/core'
import type { EntryType, AnnotationType } from '~/shared/types'

export type SearchScope = 'all' | 'entries' | 'projects' | 'tags' | 'annotations'

export interface SearchQualifiers {
  author?: string
  title?: string
  tag?: string
  project?: string
  year?: string
  yearFrom?: number
  yearTo?: number
  doi?: string
  entryType?: string
  scope?: SearchScope
  isFavorite?: boolean
  isStarred?: boolean
  isArchived?: boolean
}

export interface SearchEntry {
  id: string
  entryType: EntryType
  title: string
  authors: Array<{ firstName: string; lastName: string }>
  year?: number
  isFavorite: boolean
  metadata: Record<string, unknown>
  tags: Array<{ id: string; name: string; color: string | null }>
  projects: Array<{ id: string; name: string; color: string | null }>
  annotationCount: number
}

export interface SearchProject {
  id: string
  name: string
  description?: string
  color: string | null
  isStarred: boolean
  isArchived: boolean
  slug?: string
  entryCount: number
}

export interface SearchTag {
  id: string
  name: string
  color: string | null
  description?: string
  entryCount: number
}

export interface SearchAnnotation {
  id: string
  content: string
  annotationType: AnnotationType
  entryId: string
  entryTitle: string
  entryType: EntryType
  createdAt: string
}

export interface SearchResponse {
  entries: { items: SearchEntry[]; total: number }
  projects: { items: SearchProject[]; total: number }
  tags: { items: SearchTag[]; total: number }
  annotations: { items: SearchAnnotation[]; total: number }
  query: string
  took: number
}

export interface RecentSearchItem {
  query: string
  scope: SearchScope
  timestamp: number
  count: number
}

export interface RecentlyVisitedItem {
  id: string
  type: 'entry' | 'project' | 'tag'
  title: string
  subtitle?: string
  icon?: string
  color?: string
  timestamp: number
}

interface NavigationCommand {
  label: string
  path: string
  icon: string
  action?: () => void
}

const QUALIFIER_ALIASES: Record<string, string> = {
  a: 'author',
  t: 'title',
  p: 'project',
  y: 'year',
}

const QUALIFIER_KEYS = ['author', 'title', 'tag', 'project', 'year', 'doi', 'type', 'in', 'is']

function parseQualifiers(raw: string): { freeText: string; qualifiers: SearchQualifiers } {
  const qualifiers: SearchQualifiers = {}
  let freeText = raw

  const qualifierRegex = /(\w+):("[^"]*"|[^\s]+)/g
  let match: RegExpExecArray | null

  const parts: string[] = []

  // eslint-disable-next-line no-cond-assign
  while ((match = qualifierRegex.exec(raw)) !== null) {
    const rawKey = match[1].toLowerCase()
    const key = QUALIFIER_ALIASES[rawKey] || rawKey
    let value = match[2].replace(/^"|"$/g, '')

    if (!QUALIFIER_KEYS.includes(key) && !Object.keys(QUALIFIER_ALIASES).includes(rawKey)) {
      continue
    }

    switch (key) {
      case 'author':
        qualifiers.author = value
        break
      case 'title':
        qualifiers.title = value
        break
      case 'tag':
        qualifiers.tag = value
        break
      case 'project':
        qualifiers.project = value
        break
      case 'year':
        if (value.includes('-')) {
          const [from, to] = value.split('-').map(Number)
          if (!isNaN(from)) qualifiers.yearFrom = from
          if (!isNaN(to)) qualifiers.yearTo = to
        } else {
          qualifiers.year = value
        }
        break
      case 'doi':
        qualifiers.doi = value
        break
      case 'type':
        qualifiers.entryType = value
        break
      case 'in':
        if (['entries', 'projects', 'tags', 'annotations'].includes(value)) {
          qualifiers.scope = value as SearchScope
        }
        break
      case 'is':
        if (value === 'favorite' || value === 'favourited') qualifiers.isFavorite = true
        if (value === 'starred') qualifiers.isStarred = true
        if (value === 'archived') qualifiers.isArchived = true
        break
    }

    parts.push(match[0])
  }

  for (const part of parts) {
    freeText = freeText.replace(part, '')
  }
  freeText = freeText.replace(/\s+/g, ' ').trim()

  return { freeText, qualifiers }
}

export function useGlobalSearch() {
  const isOpen = useState('global-search-open', () => false)
  const query = useState('global-search-query', () => '')
  const scope = useState<SearchScope>('global-search-scope', () => 'all')
  const results = useState<SearchResponse | null>('global-search-results', () => null)
  const loading = useState('global-search-loading', () => false)
  const error = useState<string | null>('global-search-error', () => null)
  const activeIndex = useState('global-search-active-index', () => -1)
  const semanticMode = useState('global-search-semantic', () => false)

  const recentSearches = useLocalStorage<RecentSearchItem[]>('bibanna-recent-searches', [])
  const recentlyVisited = useLocalStorage<RecentlyVisitedItem[]>('bibanna-recently-visited', [])
  const pinnedSearches = useLocalStorage<RecentSearchItem[]>('bibanna-pinned-searches', [])

  const route = useRoute()
  const router = useRouter()

  const contextProjectId = computed(() => {
    const match = route.path.match(/\/app\/projects\/([^/]+)/)
    return match?.[1] || null
  })

  const parsedQuery = computed(() => parseQualifiers(query.value))

  const effectiveScope = computed(() => {
    return parsedQuery.value.qualifiers.scope || scope.value
  })

  const isSlashCommand = computed(() => query.value.startsWith('/'))

  const navigationCommands: NavigationCommand[] = [
    { label: 'Library', path: '/app/library', icon: 'i-heroicons-book-open' },
    { label: 'Projects', path: '/app/projects', icon: 'i-heroicons-folder' },
    { label: 'Tags', path: '/app/tags', icon: 'i-heroicons-tag' },
    { label: 'Annotations', path: '/app/annotations', icon: 'i-heroicons-pencil-square' },
    { label: 'Settings', path: '/app/settings', icon: 'i-heroicons-cog-6-tooth' },
    { label: 'Mind Maps', path: '/app/mindmaps', icon: 'i-heroicons-share' },
    { label: 'Subscription', path: '/app/subscription', icon: 'i-heroicons-credit-card' },
    { label: 'Profile', path: '/app/settings/profile', icon: 'i-heroicons-user' },
  ]

  const matchedCommands = computed(() => {
    if (!isSlashCommand.value) return []
    const cmd = query.value.slice(1).toLowerCase()
    if (!cmd) return navigationCommands
    return navigationCommands.filter(c => c.label.toLowerCase().includes(cmd))
  })

  const flatResults = computed<Array<{ type: string; id: string; data: any }>>(() => {
    if (!results.value) return []
    const flat: Array<{ type: string; id: string; data: any }> = []

    if (effectiveScope.value === 'all' || effectiveScope.value === 'entries') {
      for (const item of results.value.entries.items) {
        flat.push({ type: 'entry', id: item.id, data: item })
      }
    }
    if (effectiveScope.value === 'all' || effectiveScope.value === 'projects') {
      for (const item of results.value.projects.items) {
        flat.push({ type: 'project', id: item.id, data: item })
      }
    }
    if (effectiveScope.value === 'all' || effectiveScope.value === 'tags') {
      for (const item of results.value.tags.items) {
        flat.push({ type: 'tag', id: item.id, data: item })
      }
    }
    if (effectiveScope.value === 'all' || effectiveScope.value === 'annotations') {
      for (const item of results.value.annotations.items) {
        flat.push({ type: 'annotation', id: item.id, data: item })
      }
    }

    return flat
  })

  const totalResults = computed(() => {
    if (!results.value) return 0
    return (
      results.value.entries.total +
      results.value.projects.total +
      results.value.tags.total +
      results.value.annotations.total
    )
  })

  const qualifierSuggestions = computed(() => {
    const q = query.value
    if (!q.endsWith(':') && !q.match(/\w+:$/)) return []
    return QUALIFIER_KEYS.map(k => ({
      key: k,
      label: `${k}:`,
      description: qualifierDescriptions[k] || '',
    }))
  })

  const qualifierDescriptions: Record<string, string> = {
    author: 'Search by author name',
    title: 'Search by entry title',
    tag: 'Search by tag name',
    project: 'Search by project name',
    year: 'Search by year (e.g. 2020 or 2018-2022)',
    doi: 'Search by DOI',
    type: 'Filter by entry type',
    in: 'Restrict to entity type (entries, projects, tags, annotations)',
    is: 'Boolean filter (favorite, starred, archived)',
  }

  async function executeSearch() {
    const q = query.value.trim()
    if (q.length < 2 || isSlashCommand.value) {
      results.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const { freeText, qualifiers } = parsedQuery.value
      const params: Record<string, string> = {}

      if (freeText) params.q = freeText
      if (effectiveScope.value !== 'all') params.scope = effectiveScope.value
      if (qualifiers.author) params.author = qualifiers.author
      if (qualifiers.title) params.title = qualifiers.title
      if (qualifiers.tag) params.tag = qualifiers.tag
      if (qualifiers.project) params.project = qualifiers.project
      if (qualifiers.year) params.year = qualifiers.year
      if (qualifiers.yearFrom) params.yearFrom = String(qualifiers.yearFrom)
      if (qualifiers.yearTo) params.yearTo = String(qualifiers.yearTo)
      if (qualifiers.doi) params.doi = qualifiers.doi
      if (qualifiers.entryType) params.entryType = qualifiers.entryType
      if (qualifiers.isFavorite) params.isFavorite = 'true'
      if (qualifiers.isStarred) params.isStarred = 'true'
      if (qualifiers.isArchived) params.isArchived = 'true'
      if (contextProjectId.value && scope.value === 'all') {
        params.contextProjectId = contextProjectId.value
      }
      if (semanticMode.value) params.semantic = 'true'

      const data = await $fetch<SearchResponse>('/api/search', { params })
      results.value = data
      activeIndex.value = -1
    } catch (e: any) {
      error.value = e?.data?.message || 'Search failed'
      results.value = null
    } finally {
      loading.value = false
    }
  }

  const debouncedSearch = useDebounceFn(executeSearch, 250)

  watch(query, () => {
    if (query.value.trim().length >= 2 && !isSlashCommand.value) {
      debouncedSearch()
    } else {
      results.value = null
    }
  })

  watch(scope, () => {
    if (query.value.trim().length >= 2) {
      debouncedSearch()
    }
  })

  function open() {
    isOpen.value = true
    activeIndex.value = -1
  }

  function close() {
    isOpen.value = false
    query.value = ''
    results.value = null
    error.value = null
    activeIndex.value = -1
    scope.value = 'all'
  }

  function toggle() {
    if (isOpen.value) close()
    else open()
  }

  function addToRecentSearches(q: string) {
    if (!q.trim() || q.startsWith('/')) return
    const existing = recentSearches.value.findIndex(s => s.query === q && s.scope === scope.value)
    if (existing >= 0) {
      recentSearches.value[existing].timestamp = Date.now()
      recentSearches.value[existing].count++
    } else {
      recentSearches.value.unshift({
        query: q,
        scope: scope.value,
        timestamp: Date.now(),
        count: 1,
      })
    }
    recentSearches.value = recentSearches.value.slice(0, 20)
  }

  function clearRecentSearches() {
    recentSearches.value = []
  }

  function pinSearch(search: RecentSearchItem) {
    if (pinnedSearches.value.some(s => s.query === search.query)) return
    pinnedSearches.value.unshift(search)
    pinnedSearches.value = pinnedSearches.value.slice(0, 5)
  }

  function unpinSearch(query: string) {
    pinnedSearches.value = pinnedSearches.value.filter(s => s.query !== query)
  }

  function trackVisited(item: Omit<RecentlyVisitedItem, 'timestamp'>) {
    recentlyVisited.value = recentlyVisited.value.filter(v => v.id !== item.id)
    recentlyVisited.value.unshift({ ...item, timestamp: Date.now() })
    recentlyVisited.value = recentlyVisited.value.slice(0, 8)
  }

  function navigateToResult(result: { type: string; id: string; data: any }) {
    addToRecentSearches(query.value)

    switch (result.type) {
      case 'entry':
        trackVisited({
          id: result.id,
          type: 'entry',
          title: result.data.title,
          subtitle: result.data.authors?.[0]?.lastName,
          icon: getEntryTypeIcon(result.data.entryType),
        })
        router.push(`/app/library/${result.id}`)
        break
      case 'project':
        trackVisited({
          id: result.id,
          type: 'project',
          title: result.data.name,
          color: result.data.color,
          icon: 'i-heroicons-folder',
        })
        router.push(`/app/projects/${result.id}`)
        break
      case 'tag':
        trackVisited({
          id: result.id,
          type: 'tag',
          title: result.data.name,
          color: result.data.color,
          icon: 'i-heroicons-tag',
        })
        router.push({ path: '/app/library', query: { tagIds: result.id } })
        break
      case 'annotation':
        router.push(`/app/library/${result.data.entryId}#annotations`)
        break
    }

    close()
  }

  function executeCommand(command: NavigationCommand) {
    if (command.action) {
      command.action()
    } else {
      router.push(command.path)
    }
    close()
  }

  function moveUp() {
    if (isSlashCommand.value) {
      const max = matchedCommands.value.length
      if (max === 0) return
      activeIndex.value = activeIndex.value <= 0 ? max - 1 : activeIndex.value - 1
    } else {
      const max = flatResults.value.length
      if (max === 0) return
      activeIndex.value = activeIndex.value <= 0 ? max - 1 : activeIndex.value - 1
    }
  }

  function moveDown() {
    if (isSlashCommand.value) {
      const max = matchedCommands.value.length
      if (max === 0) return
      activeIndex.value = activeIndex.value >= max - 1 ? 0 : activeIndex.value + 1
    } else {
      const max = flatResults.value.length
      if (max === 0) return
      activeIndex.value = activeIndex.value >= max - 1 ? 0 : activeIndex.value + 1
    }
  }

  function selectActive() {
    if (isSlashCommand.value) {
      const cmd = matchedCommands.value[activeIndex.value]
      if (cmd) executeCommand(cmd)
      return
    }

    const result = flatResults.value[activeIndex.value]
    if (result) {
      navigateToResult(result)
    } else if (query.value.trim()) {
      addToRecentSearches(query.value)
    }
  }

  return {
    isOpen,
    query,
    scope,
    results,
    loading,
    error,
    activeIndex,
    semanticMode,
    recentSearches,
    recentlyVisited,
    pinnedSearches,
    contextProjectId,
    parsedQuery,
    effectiveScope,
    isSlashCommand,
    matchedCommands,
    flatResults,
    totalResults,
    qualifierSuggestions,
    qualifierDescriptions,
    open,
    close,
    toggle,
    executeSearch,
    addToRecentSearches,
    clearRecentSearches,
    pinSearch,
    unpinSearch,
    trackVisited,
    navigateToResult,
    executeCommand,
    moveUp,
    moveDown,
    selectActive,
  }
}

// Helpers

const ENTRY_TYPE_ICONS: Record<string, string> = {
  book: 'i-heroicons-book-open',
  journal_article: 'i-heroicons-document-text',
  conference_paper: 'i-heroicons-presentation-chart-bar',
  thesis: 'i-heroicons-academic-cap',
  report: 'i-heroicons-document-chart-bar',
  website: 'i-heroicons-globe-alt',
  newspaper_article: 'i-heroicons-newspaper',
  magazine_article: 'i-heroicons-newspaper',
  video: 'i-heroicons-video-camera',
  podcast: 'i-heroicons-microphone',
  interview: 'i-heroicons-chat-bubble-left-right',
  legal_document: 'i-heroicons-scale',
  patent: 'i-heroicons-light-bulb',
  dataset: 'i-heroicons-circle-stack',
  software: 'i-heroicons-code-bracket',
  custom: 'i-heroicons-document',
}

export function getEntryTypeIcon(type: string): string {
  return ENTRY_TYPE_ICONS[type] || 'i-heroicons-document'
}
