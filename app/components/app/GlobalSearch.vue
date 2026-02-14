<script setup lang="ts">
import { onKeyStroke, useMediaQuery } from '@vueuse/core'
import { ENTRY_TYPE_LABELS } from '~/shared/types'
import {
  getEntryTypeIcon,
  type SearchScope,
  type RecentSearchItem,
  type RecentlyVisitedItem,
} from '~/composables/useGlobalSearch'

const {
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
  isSlashCommand,
  matchedCommands,
  flatResults,
  totalResults,
  qualifierSuggestions,
  open,
  close,
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
  executeSearch,
} = useGlobalSearch()

const { isPro } = useSubscription()
const { open: openQuickAdd } = useQuickAdd()

const isMobile = useMediaQuery('(max-width: 640px)')
const inputRef = ref<HTMLInputElement | null>()
const paletteRef = ref<HTMLDivElement | null>()
const resultsRef = ref<HTMLDivElement | null>()
const liveRegionRef = ref<HTMLDivElement | null>()

const scopes: Array<{ key: SearchScope; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: 'i-heroicons-magnifying-glass' },
  { key: 'entries', label: 'Entries', icon: 'i-heroicons-book-open' },
  { key: 'projects', label: 'Projects', icon: 'i-heroicons-folder' },
  { key: 'tags', label: 'Tags', icon: 'i-heroicons-tag' },
  { key: 'annotations', label: 'Annotations', icon: 'i-heroicons-pencil-square' },
]

const ANNOTATION_TYPE_ICONS: Record<string, string> = {
  descriptive: 'i-heroicons-document-text',
  evaluative: 'i-heroicons-chart-bar',
  reflective: 'i-heroicons-light-bulb',
  summary: 'i-heroicons-list-bullet',
  critical: 'i-heroicons-exclamation-triangle',
  custom: 'i-heroicons-pencil',
}

const showRecents = computed(() => {
  return !query.value.trim() && !isSlashCommand.value
})

const showQualifierHints = computed(() => {
  return qualifierSuggestions.value.length > 0 && !isSlashCommand.value
})

const hasResults = computed(() => {
  return results.value && totalResults.value > 0
})

const noResults = computed(() => {
  return (
    query.value.trim().length >= 2 &&
    !loading.value &&
    results.value &&
    totalResults.value === 0 &&
    !isSlashCommand.value
  )
})

watch(isOpen, async (val) => {
  if (val) {
    await nextTick()
    inputRef.value?.focus()
  }
})

watch(totalResults, (count) => {
  if (liveRegionRef.value && query.value.trim()) {
    liveRegionRef.value.textContent =
      count > 0 ? `${count} result${count !== 1 ? 's' : ''} found` : 'No results found'
  }
})

onKeyStroke('/', (e) => {
  if ((e.metaKey || e.ctrlKey) && !isOpen.value) {
    e.preventDefault()
    open()
  }
})

function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      moveDown()
      scrollToActive()
      break
    case 'ArrowUp':
      e.preventDefault()
      moveUp()
      scrollToActive()
      break
    case 'Enter':
      e.preventDefault()
      selectActive()
      break
    case 'Escape':
      e.preventDefault()
      close()
      break
    case 'Tab':
      if (!e.shiftKey) {
        e.preventDefault()
        cycleScopeForward()
      } else {
        e.preventDefault()
        cycleScopeBackward()
      }
      break
  }
}

function cycleScopeForward() {
  const idx = scopes.findIndex((s) => s.key === scope.value)
  const next = (idx + 1) % scopes.length
  scope.value = scopes[next].key
}

function cycleScopeBackward() {
  const idx = scopes.findIndex((s) => s.key === scope.value)
  const prev = idx <= 0 ? scopes.length - 1 : idx - 1
  scope.value = scopes[prev].key
}

function scrollToActive() {
  nextTick(() => {
    const active = resultsRef.value?.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  })
}

function formatAuthors(authors: Array<{ firstName: string; lastName: string }>): string {
  if (!authors || authors.length === 0) return ''
  if (authors.length === 1) return authors[0].lastName
  if (authors.length === 2) return `${authors[0].lastName} & ${authors[1].lastName}`
  return `${authors[0].lastName} et al.`
}

function executeRecentSearch(item: RecentSearchItem) {
  query.value = item.query
  scope.value = item.scope
}

function navigateToVisited(item: RecentlyVisitedItem) {
  const router = useRouter()
  switch (item.type) {
    case 'entry':
      router.push(`/app/library/${item.id}`)
      break
    case 'project':
      router.push(`/app/projects/${item.id}`)
      break
    case 'tag':
      router.push({ path: '/app/library', query: { tagIds: item.id } })
      break
  }
  close()
}

function retrySearch() {
  error.value = null
  if (query.value.trim().length >= 2) {
    executeSearch()
  }
}

function onClickQuickAdd() {
  close()
  openQuickAdd()
}

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    close()
  }
}

function toggleSemantic() {
  if (isPro.value) {
    semanticMode.value = !semanticMode.value
  }
}

function groupLabel(type: string): string {
  return (
    { entry: 'Entries', project: 'Projects', tag: 'Tags', annotation: 'Annotations' }[type] || type
  )
}

function groupIcon(type: string): string {
  return (
    {
      entry: 'i-heroicons-book-open',
      project: 'i-heroicons-folder',
      tag: 'i-heroicons-tag',
      annotation: 'i-heroicons-pencil-square',
    }[type] || 'i-heroicons-document'
  )
}

const groupedResults = computed(() => {
  if (!results.value) return []
  const groups: Array<{ type: string; label: string; icon: string; items: any[]; total: number }> =
    []

  const addGroup = (type: string, data: { items: any[]; total: number }) => {
    if (data.items.length > 0) {
      groups.push({
        type,
        label: groupLabel(type),
        icon: groupIcon(type),
        items: data.items,
        total: data.total,
      })
    }
  }

  if (scope.value === 'all' || scope.value === 'entries') addGroup('entry', results.value.entries)
  if (scope.value === 'all' || scope.value === 'projects')
    addGroup('project', results.value.projects)
  if (scope.value === 'all' || scope.value === 'tags') addGroup('tag', results.value.tags)
  if (scope.value === 'all' || scope.value === 'annotations')
    addGroup('annotation', results.value.annotations)

  return groups
})

function getFlatIndex(type: string, itemId: string): number {
  return flatResults.value.findIndex((r) => r.type === type && r.id === itemId)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm sm:pt-[15vh]"
        @click="onOverlayClick"
      >
        <Transition
          enter-active-class="duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
          appear
        >
          <div
            ref="paletteRef"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            :aria-owns="hasResults ? 'global-search-results' : undefined"
            class="w-full sm:max-w-2xl bg-white dark:bg-gray-800 sm:rounded-xl shadow-2xl ring-1 ring-gray-900/10 dark:ring-gray-700/50 overflow-hidden flex flex-col"
            :class="isMobile ? 'h-full' : 'max-h-[min(80vh,600px)]'"
            @keydown="onKeydown"
          >
            <!-- Search input -->
            <div
              class="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700"
            >
              <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400 shrink-0" />
              <input
                ref="inputRef"
                v-model="query"
                type="text"
                class="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base"
                placeholder="Search entries, projects, tags... or type / for commands"
                aria-label="Global search"
                :aria-activedescendant="
                  activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
                "
                autocomplete="off"
                spellcheck="false"
              />
              <div class="flex items-center gap-2 shrink-0">
                <!-- Semantic toggle (Pro) -->
                <button
                  v-if="isPro"
                  type="button"
                  class="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                  :class="
                    semanticMode
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  "
                  title="Toggle semantic search (AI-powered)"
                  @click="toggleSemantic"
                >
                  <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
                  <span class="hidden sm:inline">{{ semanticMode ? 'Semantic' : 'Keyword' }}</span>
                </button>
                <!-- Upsell for non-Pro -->
                <UTooltip
                  v-else-if="query.trim().length > 0"
                  text="Upgrade to Pro for AI-powered search"
                >
                  <span
                    class="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 cursor-default"
                  >
                    <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
                    <span class="hidden sm:inline">Pro</span>
                  </span>
                </UTooltip>

                <span v-if="loading" class="w-5 h-5">
                  <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-gray-400 animate-spin" />
                </span>
                <kbd
                  class="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                >
                  ESC
                </kbd>
              </div>
            </div>

            <!-- Scope selector -->
            <div
              class="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 dark:border-gray-700/50 overflow-x-auto no-scrollbar"
            >
              <button
                v-for="s in scopes"
                :key="s.key"
                type="button"
                class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                :class="
                  scope === s.key
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                "
                @click="scope = s.key"
              >
                <UIcon :name="s.icon" class="w-3.5 h-3.5" />
                {{ s.label }}
              </button>
              <span
                class="hidden sm:inline text-[10px] text-gray-400 dark:text-gray-500 ml-auto shrink-0"
                >Tab to switch</span
              >
            </div>

            <!-- Results area -->
            <div
              id="global-search-results"
              ref="resultsRef"
              class="flex-1 overflow-y-auto overscroll-contain"
              role="listbox"
            >
              <!-- Slash commands -->
              <div v-if="isSlashCommand" class="p-2">
                <p
                  class="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                >
                  Commands
                </p>
                <button
                  v-for="(cmd, idx) in matchedCommands"
                  :id="`search-result-${idx}`"
                  :key="cmd.path"
                  type="button"
                  role="option"
                  :data-active="activeIndex === idx"
                  :aria-selected="activeIndex === idx"
                  class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                  :class="
                    activeIndex === idx
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  "
                  @click="executeCommand(cmd)"
                  @mouseenter="activeIndex = idx"
                >
                  <UIcon :name="cmd.icon" class="w-5 h-5 shrink-0" />
                  <span class="font-medium">{{ cmd.label }}</span>
                  <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto"
                    >/{{ cmd.label.toLowerCase() }}</span
                  >
                </button>
                <button
                  type="button"
                  class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  @click="onClickQuickAdd"
                >
                  <UIcon name="i-heroicons-plus-circle" class="w-5 h-5 shrink-0" />
                  <span class="font-medium">New Entry</span>
                  <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">/new</span>
                </button>
              </div>

              <!-- Recent searches + recently visited -->
              <div v-else-if="showRecents" class="p-2">
                <!-- Pinned searches -->
                <div v-if="pinnedSearches.length > 0" class="mb-3">
                  <p
                    class="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                  >
                    Pinned
                  </p>
                  <button
                    v-for="item in pinnedSearches"
                    :key="'pin-' + item.query"
                    type="button"
                    class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    @click="executeRecentSearch(item)"
                  >
                    <UIcon
                      name="i-heroicons-bookmark-solid"
                      class="w-4 h-4 text-primary-500 shrink-0"
                    />
                    <span class="flex-1 truncate text-sm">{{ item.query }}</span>
                    <button
                      type="button"
                      class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
                      title="Unpin"
                      @click.stop="unpinSearch(item.query)"
                    >
                      <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </button>
                </div>

                <!-- Recent searches -->
                <div v-if="recentSearches.length > 0" class="mb-3">
                  <div class="flex items-center justify-between px-3 py-1">
                    <p
                      class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                    >
                      Recent Searches
                    </p>
                    <button
                      type="button"
                      class="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      @click="clearRecentSearches"
                    >
                      Clear
                    </button>
                  </div>
                  <button
                    v-for="item in recentSearches.slice(0, 5)"
                    :key="'recent-' + item.query"
                    type="button"
                    class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    @click="executeRecentSearch(item)"
                  >
                    <UIcon name="i-heroicons-clock" class="w-4 h-4 text-gray-400 shrink-0" />
                    <span class="flex-1 truncate text-sm">{{ item.query }}</span>
                    <span v-if="item.count > 1" class="text-[10px] text-gray-400 dark:text-gray-500"
                      >{{ item.count }}x</span
                    >
                    <button
                      type="button"
                      class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
                      title="Pin this search"
                      @click.stop="pinSearch(item)"
                    >
                      <UIcon name="i-heroicons-bookmark" class="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </button>
                </div>

                <!-- Recently visited -->
                <div v-if="recentlyVisited.length > 0">
                  <p
                    class="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                  >
                    Recently Visited
                  </p>
                  <button
                    v-for="item in recentlyVisited"
                    :key="'visited-' + item.id"
                    type="button"
                    class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    @click="navigateToVisited(item)"
                  >
                    <span
                      v-if="item.color"
                      class="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                      :style="{ backgroundColor: item.color }"
                    >
                      <UIcon v-if="item.icon" :name="item.icon" class="w-2.5 h-2.5 text-white" />
                    </span>
                    <UIcon
                      v-else-if="item.icon"
                      :name="item.icon"
                      class="w-4 h-4 text-gray-400 shrink-0"
                    />
                    <span class="flex-1 truncate text-sm">{{ item.title }}</span>
                    <span
                      v-if="item.subtitle"
                      class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-24"
                      >{{ item.subtitle }}</span
                    >
                  </button>
                </div>

                <!-- Empty: no recents at all -->
                <div
                  v-if="!recentSearches.length && !recentlyVisited.length && !pinnedSearches.length"
                  class="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500"
                >
                  <UIcon name="i-heroicons-magnifying-glass" class="w-10 h-10 mb-3" />
                  <p class="text-sm font-medium">Search your research library</p>
                  <p class="text-xs mt-1">Type to search or use / for commands</p>
                </div>
              </div>

              <!-- Loading skeleton -->
              <div v-else-if="loading && !results" class="p-2 space-y-2">
                <div v-for="i in 4" :key="i" class="px-3 py-2.5 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div class="flex-1 space-y-1.5">
                      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                      <div
                        class="h-3 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse w-1/2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Grouped results -->
              <div v-else-if="hasResults" class="p-2">
                <div v-for="group in groupedResults" :key="group.type" class="mb-2 last:mb-0">
                  <div class="flex items-center justify-between px-3 py-1">
                    <div class="flex items-center gap-1.5">
                      <UIcon :name="group.icon" class="w-3.5 h-3.5 text-gray-400" />
                      <p
                        class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
                      >
                        {{ group.label }}
                      </p>
                    </div>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500"
                      >{{ group.total }} result{{ group.total !== 1 ? 's' : '' }}</span
                    >
                  </div>

                  <!-- Entry results -->
                  <template v-if="group.type === 'entry'">
                    <button
                      v-for="item in group.items"
                      :id="`search-result-${getFlatIndex('entry', item.id)}`"
                      :key="item.id"
                      type="button"
                      role="option"
                      :data-active="activeIndex === getFlatIndex('entry', item.id)"
                      :aria-selected="activeIndex === getFlatIndex('entry', item.id)"
                      class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors group"
                      :class="
                        activeIndex === getFlatIndex('entry', item.id)
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      "
                      @click="navigateToResult({ type: 'entry', id: item.id, data: item })"
                      @mouseenter="activeIndex = getFlatIndex('entry', item.id)"
                    >
                      <UIcon
                        :name="getEntryTypeIcon(item.entryType)"
                        class="w-5 h-5 shrink-0 text-gray-400"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span
                            class="font-medium text-sm text-gray-900 dark:text-white truncate"
                            >{{ item.title }}</span
                          >
                          <UIcon
                            v-if="item.isFavorite"
                            name="i-heroicons-star-solid"
                            class="w-3.5 h-3.5 text-amber-400 shrink-0"
                          />
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span
                            v-if="item.authors?.length"
                            class="text-xs text-gray-500 dark:text-gray-400 truncate"
                            >{{ formatAuthors(item.authors) }}</span
                          >
                          <span v-if="item.year" class="text-xs text-gray-400 dark:text-gray-500">{{
                            item.year
                          }}</span>
                          <span class="text-xs text-gray-400 dark:text-gray-500">{{
                            ENTRY_TYPE_LABELS[item.entryType as keyof typeof ENTRY_TYPE_LABELS] ||
                            item.entryType
                          }}</span>
                        </div>
                      </div>
                      <div class="hidden sm:flex items-center gap-1 shrink-0">
                        <span
                          v-for="proj in (item.projects || []).slice(0, 2)"
                          :key="proj.id"
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        >
                          <span
                            class="w-1.5 h-1.5 rounded-full"
                            :style="{ backgroundColor: proj.color || '#6B7280' }"
                          />
                          {{ proj.name }}
                        </span>
                        <span
                          v-if="item.annotationCount > 0"
                          class="text-[10px] text-gray-400 dark:text-gray-500"
                        >
                          {{ item.annotationCount }} note{{ item.annotationCount !== 1 ? 's' : '' }}
                        </span>
                      </div>
                    </button>
                  </template>

                  <!-- Project results -->
                  <template v-if="group.type === 'project'">
                    <button
                      v-for="item in group.items"
                      :id="`search-result-${getFlatIndex('project', item.id)}`"
                      :key="item.id"
                      type="button"
                      role="option"
                      :data-active="activeIndex === getFlatIndex('project', item.id)"
                      :aria-selected="activeIndex === getFlatIndex('project', item.id)"
                      class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                      :class="
                        activeIndex === getFlatIndex('project', item.id)
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      "
                      @click="navigateToResult({ type: 'project', id: item.id, data: item })"
                      @mouseenter="activeIndex = getFlatIndex('project', item.id)"
                    >
                      <span
                        class="w-5 h-5 rounded-md shrink-0 flex items-center justify-center"
                        :style="{ backgroundColor: item.color || '#4F46E5' }"
                      >
                        <UIcon name="i-heroicons-folder" class="w-3 h-3 text-white" />
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span
                            class="font-medium text-sm text-gray-900 dark:text-white truncate"
                            >{{ item.name }}</span
                          >
                          <UIcon
                            v-if="item.isStarred"
                            name="i-heroicons-star-solid"
                            class="w-3.5 h-3.5 text-amber-400 shrink-0"
                          />
                          <span
                            v-if="item.isArchived"
                            class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            >Archived</span
                          >
                        </div>
                        <span
                          v-if="item.description"
                          class="text-xs text-gray-500 dark:text-gray-400 truncate block"
                          >{{ item.description }}</span
                        >
                      </div>
                      <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {{ item.entryCount }} entr{{ item.entryCount === 1 ? 'y' : 'ies' }}
                      </span>
                    </button>
                  </template>

                  <!-- Tag results -->
                  <template v-if="group.type === 'tag'">
                    <button
                      v-for="item in group.items"
                      :id="`search-result-${getFlatIndex('tag', item.id)}`"
                      :key="item.id"
                      type="button"
                      role="option"
                      :data-active="activeIndex === getFlatIndex('tag', item.id)"
                      :aria-selected="activeIndex === getFlatIndex('tag', item.id)"
                      class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                      :class="
                        activeIndex === getFlatIndex('tag', item.id)
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      "
                      @click="navigateToResult({ type: 'tag', id: item.id, data: item })"
                      @mouseenter="activeIndex = getFlatIndex('tag', item.id)"
                    >
                      <span
                        class="w-5 h-5 rounded-full shrink-0"
                        :style="{ backgroundColor: item.color || '#6B7280' }"
                      />
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-sm text-gray-900 dark:text-white">{{
                          item.name
                        }}</span>
                        <span
                          v-if="item.description"
                          class="text-xs text-gray-500 dark:text-gray-400 truncate block"
                          >{{ item.description }}</span
                        >
                      </div>
                      <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {{ item.entryCount }} entr{{ item.entryCount === 1 ? 'y' : 'ies' }}
                      </span>
                    </button>
                  </template>

                  <!-- Annotation results -->
                  <template v-if="group.type === 'annotation'">
                    <button
                      v-for="item in group.items"
                      :id="`search-result-${getFlatIndex('annotation', item.id)}`"
                      :key="item.id"
                      type="button"
                      role="option"
                      :data-active="activeIndex === getFlatIndex('annotation', item.id)"
                      :aria-selected="activeIndex === getFlatIndex('annotation', item.id)"
                      class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                      :class="
                        activeIndex === getFlatIndex('annotation', item.id)
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      "
                      @click="navigateToResult({ type: 'annotation', id: item.id, data: item })"
                      @mouseenter="activeIndex = getFlatIndex('annotation', item.id)"
                    >
                      <UIcon
                        :name="
                          ANNOTATION_TYPE_ICONS[item.annotationType] || 'i-heroicons-pencil-square'
                        "
                        class="w-5 h-5 shrink-0 text-gray-400"
                      />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900 dark:text-white truncate">
                          {{ item.content }}
                        </p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <UIcon
                            :name="getEntryTypeIcon(item.entryType)"
                            class="w-3 h-3 text-gray-400"
                          />
                          <span class="text-xs text-gray-500 dark:text-gray-400 truncate">{{
                            item.entryTitle
                          }}</span>
                        </div>
                      </div>
                    </button>
                  </template>
                </div>
              </div>

              <!-- No results -->
              <div
                v-else-if="noResults"
                class="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 px-4"
              >
                <UIcon name="i-heroicons-magnifying-glass" class="w-10 h-10 mb-3" />
                <p class="text-sm font-medium">No results for "{{ query.trim() }}"</p>
                <div class="flex flex-col items-center gap-2 mt-3 text-xs">
                  <p>Try a different spelling or search all scopes</p>
                  <button
                    type="button"
                    class="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
                    @click="onClickQuickAdd"
                  >
                    Add a new entry instead
                  </button>
                </div>
              </div>

              <!-- Error state -->
              <div
                v-else-if="error"
                class="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500"
              >
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-10 h-10 mb-3 text-red-400"
                />
                <p class="text-sm font-medium text-red-500">{{ error }}</p>
                <button
                  type="button"
                  class="mt-2 text-xs text-primary-500 hover:text-primary-600 font-medium"
                  @click="retrySearch"
                >
                  Try again
                </button>
              </div>
            </div>

            <!-- Footer -->
            <div
              class="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-700/50 text-[10px] text-gray-400 dark:text-gray-500 shrink-0"
            >
              <div class="flex items-center gap-3">
                <span class="hidden sm:flex items-center gap-1">
                  <kbd
                    class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-mono"
                    >↑↓</kbd
                  >
                  navigate
                </span>
                <span class="hidden sm:flex items-center gap-1">
                  <kbd
                    class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-mono"
                    >↵</kbd
                  >
                  open
                </span>
                <span class="hidden sm:flex items-center gap-1">
                  <kbd
                    class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-mono"
                    >tab</kbd
                  >
                  scope
                </span>
              </div>
              <div v-if="results && totalResults > 0" class="flex items-center gap-1">
                <span>{{ totalResults }} result{{ totalResults !== 1 ? 's' : '' }}</span>
                <span v-if="results.took">&middot; {{ results.took }}ms</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Screen reader announcements -->
    <div ref="liveRegionRef" aria-live="polite" aria-atomic="true" class="sr-only" />
  </Teleport>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
