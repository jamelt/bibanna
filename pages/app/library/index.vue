<script setup lang="ts">
import type { Entry, Tag, Project } from '~/shared/types'
import { ENTRY_TYPE_LABELS } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const searchQuery = ref(route.query.q as string || '')
const selectedTypes = ref<string[]>([])
const selectedTags = ref<string[]>(
  (() => {
    const tagIds = route.query.tagIds
    if (!tagIds) return []
    return Array.isArray(tagIds) ? tagIds : [tagIds]
  })(),
)
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(20)

const isAddModalOpen = ref(false)
const isExportModalOpen = ref(false)
const isImportModalOpen = ref(false)
const viewMode = ref<'list' | 'grid'>('list')
const selectedEntryIds = ref<string[]>([])
const isSelectionMode = ref(false)
const isBulkProcessing = ref(false)

const queryParams = computed(() => ({
  q: searchQuery.value || undefined,
  entryTypes: selectedTypes.value.length > 0 ? selectedTypes.value : undefined,
  tagIds: selectedTags.value.length > 0 ? selectedTags.value : undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const { data: entriesData, pending, refresh } = await useFetch('/api/entries', {
  query: queryParams,
  watch: [queryParams],
})

const { data: tags } = await useFetch<Tag[]>('/api/tags')
const { data: projects } = await useFetch<Project[]>('/api/projects', { lazy: true })

const entries = computed(() => entriesData.value?.data || [])
const totalEntries = computed(() => entriesData.value?.total || 0)
const totalPages = computed(() => entriesData.value?.totalPages || 1)

const allSelected = computed(() =>
  entries.value.length > 0 && entries.value.every(e => selectedEntryIds.value.includes(e.id)),
)

const entryTypeOptions = Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const sortOptions = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'updatedAt', label: 'Last Modified' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'year', label: 'Year' },
]

function formatAuthors(authors: any[] | null) {
  if (!authors || authors.length === 0) return 'Unknown'
  if (authors.length === 1) {
    return `${authors[0].lastName}, ${authors[0].firstName}`
  }
  if (authors.length === 2) {
    return `${authors[0].lastName} & ${authors[1].lastName}`
  }
  return `${authors[0].lastName} et al.`
}

function handleSearch() {
  page.value = 1
  router.push({ query: { ...route.query, q: searchQuery.value || undefined } })
}

function clearFilters() {
  searchQuery.value = ''
  selectedTypes.value = []
  selectedTags.value = []
  page.value = 1
}

function toggleEntrySelection(entryId: string) {
  const idx = selectedEntryIds.value.indexOf(entryId)
  if (idx >= 0) {
    selectedEntryIds.value.splice(idx, 1)
  }
  else {
    selectedEntryIds.value.push(entryId)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedEntryIds.value = []
  }
  else {
    selectedEntryIds.value = entries.value.map(e => e.id)
  }
}

function exitSelectionMode() {
  isSelectionMode.value = false
  selectedEntryIds.value = []
}

function handleEntryClick(entryId: string) {
  if (isSelectionMode.value) {
    toggleEntrySelection(entryId)
  }
  else {
    router.push(`/app/library/${entryId}`)
  }
}

async function bulkAction(action: string, extra: Record<string, unknown> = {}) {
  if (selectedEntryIds.value.length === 0) return

  isBulkProcessing.value = true
  try {
    const result = await $fetch<{ affected: number; action: string }>('/api/entries/bulk', {
      method: 'POST',
      body: {
        entryIds: selectedEntryIds.value,
        action,
        ...extra,
      },
    })

    toast.add({
      title: `${result.action} completed`,
      description: `${result.affected} entries affected.`,
      color: 'success',
    })

    selectedEntryIds.value = []
    isSelectionMode.value = false
    await refresh()
  }
  catch (err: any) {
    toast.add({
      title: 'Bulk action failed',
      description: err.data?.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    isBulkProcessing.value = false
  }
}

async function handleEntryCreated() {
  isAddModalOpen.value = false
  await refresh()
}

async function handleImported() {
  isImportModalOpen.value = false
  await refresh()
}

const focusedEntryIndex = ref(-1)

function isAnyModalOpen() {
  return isAddModalOpen.value || isExportModalOpen.value || isImportModalOpen.value
}

function handleLibraryKeydown(e: KeyboardEvent) {
  if (isAnyModalOpen()) return

  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  const list = entries.value
  if (list.length === 0) return

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
      e.preventDefault()
      focusedEntryIndex.value = Math.min(focusedEntryIndex.value + 1, list.length - 1)
      scrollToFocused()
      break
    case 'k':
    case 'ArrowUp':
      e.preventDefault()
      focusedEntryIndex.value = Math.max(focusedEntryIndex.value - 1, 0)
      scrollToFocused()
      break
    case 'Enter': {
      e.preventDefault()
      const entry = list[focusedEntryIndex.value]
      if (entry) {
        if (isSelectionMode.value) {
          toggleEntrySelection(entry.id)
        }
        else {
          router.push(`/app/library/${entry.id}`)
        }
      }
      break
    }
    case 'x':
      if (isSelectionMode.value && focusedEntryIndex.value >= 0) {
        const entry = list[focusedEntryIndex.value]
        if (entry) toggleEntrySelection(entry.id)
      }
      break
    case 'Escape':
      if (isSelectionMode.value) {
        exitSelectionMode()
      }
      break
  }
}

function scrollToFocused() {
  nextTick(() => {
    const el = document.querySelector(`[data-entry-index="${focusedEntryIndex.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleLibraryKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleLibraryKeydown)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Library
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{ totalEntries }} {{ totalEntries === 1 ? 'entry' : 'entries' }}
        </p>
      </div>

      <div class="flex gap-2">
        <UButton
          v-if="!isSelectionMode"
          icon="i-heroicons-check-circle"
          label="Select"
          variant="outline"
          color="neutral"
          @click="isSelectionMode = true"
        />
        <UButton
          v-if="isSelectionMode"
          label="Cancel"
          variant="ghost"
          color="neutral"
          @click="exitSelectionMode"
        />
        <UButton
          icon="i-heroicons-arrow-up-tray"
          label="Import"
          variant="outline"
          color="neutral"
          @click="isImportModalOpen = true"
        />
        <UButton
          icon="i-heroicons-arrow-down-tray"
          label="Export"
          variant="outline"
          color="neutral"
          @click="isExportModalOpen = true"
        />
        <UButton
          icon="i-heroicons-plus"
          label="Add Entry"
          color="primary"
          @click="isAddModalOpen = true"
        />
      </div>
    </div>

    <!-- Filters -->
    <UCard class="p-4">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="Search entries..."
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- Type filter -->
        <USelectMenu
          v-model="selectedTypes"
          :items="entryTypeOptions"
          multiple
          placeholder="All types"
          value-key="value"
          class="w-full lg:w-48"
        />

        <!-- Tag filter -->
        <USelectMenu
          v-model="selectedTags"
          :items="(tags || []).map(t => ({ ...t, description: t.description ?? undefined }))"
          multiple
          placeholder="All tags"
          value-key="id"
          label-key="name"
          class="w-full lg:w-48"
        >
            <template #item-leading="{ item }">
            <span
              class="w-3 h-3 rounded-full shrink-0"
              :style="{ backgroundColor: item.color ?? 'transparent' }"
            />
          </template>
        </USelectMenu>

        <!-- Sort -->
        <USelectMenu
          v-model="sortBy"
          :items="sortOptions"
          value-key="value"
          class="w-full lg:w-40"
        />

        <!-- Sort order toggle -->
        <UButton
          :icon="sortOrder === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
          variant="outline"
          color="neutral"
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
        />

        <!-- View mode toggle -->
        <UFieldGroup>
          <UButton
            icon="i-heroicons-list-bullet"
            :variant="viewMode === 'list' ? 'solid' : 'outline'"
            color="neutral"
            @click="viewMode = 'list'"
          />
          <UButton
            icon="i-heroicons-squares-2x2"
            :variant="viewMode === 'grid' ? 'solid' : 'outline'"
            color="neutral"
            @click="viewMode = 'grid'"
          />
        </UFieldGroup>

        <!-- Clear filters -->
        <UButton
          v-if="searchQuery || selectedTypes.length > 0 || selectedTags.length > 0"
          icon="i-heroicons-x-mark"
          variant="ghost"
          color="neutral"
          @click="clearFilters"
        />
      </div>
    </UCard>

    <!-- Bulk action bar -->
    <div
      v-if="isSelectionMode && selectedEntryIds.length > 0"
      class="sticky top-0 z-10 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 flex flex-wrap items-center gap-2"
    >
      <div class="flex items-center gap-2 mr-2">
        <UCheckbox :model-value="allSelected" @update:model-value="toggleSelectAll" />
        <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
          {{ selectedEntryIds.length }} selected
        </span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <UDropdown
          :items="[
            (tags || []).map(t => ({
              label: t.name,
              onClick: () => bulkAction('addTags', { tagIds: [t.id] }),
            })),
          ]"
          :content="{ align: 'start' }"
        >
          <UButton
            icon="i-heroicons-tag"
            variant="outline"
            color="neutral"
            size="xs"
            :loading="isBulkProcessing"
          >
            Add Tag
          </UButton>
        </UDropdown>
        <UDropdown
          :items="[
            (projects || []).map(p => ({
              label: p.name,
              onClick: () => bulkAction('addToProject', { projectId: p.id }),
            })),
          ]"
          :content="{ align: 'start' }"
        >
          <UButton
            icon="i-heroicons-folder-plus"
            variant="outline"
            color="neutral"
            size="xs"
            :loading="isBulkProcessing"
          >
            Add to Project
          </UButton>
        </UDropdown>
        <UButton
          icon="i-heroicons-star"
          variant="outline"
          color="neutral"
          size="xs"
          :loading="isBulkProcessing"
          @click="bulkAction('favorite')"
        >
          Favorite
        </UButton>
        <UButton
          icon="i-heroicons-arrow-down-tray"
          variant="outline"
          color="neutral"
          size="xs"
          @click="isExportModalOpen = true"
        >
          Export
        </UButton>
        <UButton
          icon="i-heroicons-trash"
          variant="outline"
          color="error"
          size="xs"
          :loading="isBulkProcessing"
          @click="bulkAction('delete')"
        >
          Delete
        </UButton>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty state: search has results but filters excluded all -->
    <UCard v-else-if="entries.length === 0 && (searchQuery || selectedTypes.length || selectedTags.length)" class="text-center py-12">
      <UIcon name="i-heroicons-magnifying-glass" class="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No matching entries
      </h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        Try broadening your search, or remove some filters to see more results.
      </p>
      <UButton
        icon="i-heroicons-x-mark"
        label="Clear filters"
        variant="outline"
        color="neutral"
        class="mt-4"
        @click="clearFilters"
      />
    </UCard>

    <!-- Empty state: library is genuinely empty -->
    <UCard v-else-if="entries.length === 0" class="py-12">
      <div class="text-center max-w-md mx-auto space-y-5">
        <UIcon name="i-heroicons-book-open" class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Your library is empty
          </h3>
          <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Add your first source to start building your bibliography.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row justify-center gap-3">
          <UButton
            icon="i-heroicons-plus"
            label="Quick Add"
            color="primary"
            @click="isAddModalOpen = true"
          />
          <UButton
            icon="i-heroicons-arrow-up-tray"
            label="Import BibTeX"
            variant="outline"
            color="neutral"
            @click="isImportModalOpen = true"
          />
        </div>

        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
          <p class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Quick start tips
          </p>
          <ul class="text-sm text-gray-500 dark:text-gray-400 space-y-1.5 text-left inline-block">
            <li class="flex items-start gap-2">
              <kbd class="shrink-0 px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">{{ navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl' }}+K</kbd>
              <span>Open Quick Add from anywhere</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="shrink-0 px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">DOI</span>
              <span>Paste a DOI like <code class="text-xs">10.1234/example</code> for instant metadata</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="shrink-0 px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">ISBN</span>
              <span>Paste an ISBN like <code class="text-xs">978-0-13-468599-1</code> for books</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="shrink-0 px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">j/k</span>
              <span>Navigate entries with your keyboard</span>
            </li>
          </ul>
        </div>
      </div>
    </UCard>

    <!-- List view -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <UCard
        v-for="(entry, index) in entries"
        :key="entry.id"
        :data-entry-index="index"
        class="p-4 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer"
        :class="{
          'ring-2 ring-primary-500': selectedEntryIds.includes(entry.id),
          'ring-2 ring-primary-300 dark:ring-primary-700 bg-primary-50/50 dark:bg-primary-900/10': focusedEntryIndex === index && !selectedEntryIds.includes(entry.id),
        }"
        @click="handleEntryClick(entry.id)"
      >
        <div class="flex items-start gap-4">
          <UCheckbox
            v-if="isSelectionMode"
            :model-value="selectedEntryIds.includes(entry.id)"
            class="mt-1 shrink-0"
            @click.stop
            @update:model-value="toggleEntrySelection(entry.id)"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-gray-900 dark:text-white truncate">
                {{ entry.title }}
              </h3>
              <UIcon
                v-if="entry.isFavorite"
                name="i-heroicons-star-solid"
                class="w-4 h-4 text-yellow-500 shrink-0"
              />
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ formatAuthors(entry.authors ?? []) }}
              <span v-if="entry.year"> &middot; {{ entry.year }}</span>
            </p>
            <div class="flex items-center gap-2 mt-2">
              <UBadge variant="subtle" size="xs">
                {{ ENTRY_TYPE_LABELS[entry.entryType as keyof typeof ENTRY_TYPE_LABELS] }}
              </UBadge>
              <span
                v-for="tag in entry.tags?.slice(0, 3)"
                :key="tag.id"
                class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                :style="{ backgroundColor: `${tag.color ?? ''}20`, color: tag.color ?? undefined }"
              >
                {{ tag.name }}
              </span>
              <span
                v-if="entry.tags && entry.tags.length > 3"
                class="text-xs text-gray-400"
              >
                +{{ entry.tags.length - 3 }} more
              </span>
            </div>
          </div>
          <div class="text-right text-sm text-gray-400 shrink-0">
            <p v-if="entry.annotationCount" class="flex items-center gap-1 justify-end">
              <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
              {{ entry.annotationCount }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Grid view -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <UCard
        v-for="(entry, index) in entries"
        :key="entry.id"
        :data-entry-index="index"
        class="p-4 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer"
        :class="{
          'ring-2 ring-primary-500': selectedEntryIds.includes(entry.id),
          'ring-2 ring-primary-300 dark:ring-primary-700 bg-primary-50/50 dark:bg-primary-900/10': focusedEntryIndex === index && !selectedEntryIds.includes(entry.id),
        }"
        @click="handleEntryClick(entry.id)"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <UCheckbox
                v-if="isSelectionMode"
                :model-value="selectedEntryIds.includes(entry.id)"
                @click.stop
                @update:model-value="toggleEntrySelection(entry.id)"
              />
              <UBadge variant="subtle" size="xs">
                {{ ENTRY_TYPE_LABELS[entry.entryType as keyof typeof ENTRY_TYPE_LABELS] }}
              </UBadge>
            </div>
            <UIcon
              v-if="entry.isFavorite"
              name="i-heroicons-star-solid"
              class="w-4 h-4 text-yellow-500"
            />
          </div>
          <h3 class="font-medium text-gray-900 dark:text-white line-clamp-2">
            {{ entry.title }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatAuthors(entry.authors) }}
          </p>
          <p v-if="entry.year" class="text-sm text-gray-400">
            {{ entry.year }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="totalEntries"
      />
    </div>

    <!-- Add Entry Modal -->
    <LazyAppEntryFormModal
      v-model:open="isAddModalOpen"
      @created="handleEntryCreated"
    />

    <!-- Export Modal -->
    <LazyAppExportModal
      v-model:open="isExportModalOpen"
      :entry-ids="selectedEntryIds.length > 0 ? selectedEntryIds : undefined"
    />

    <!-- Import Modal -->
    <LazyAppImportModal
      v-model:open="isImportModalOpen"
      @imported="handleImported"
    />
  </div>
</template>
