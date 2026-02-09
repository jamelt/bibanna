<script setup lang="ts">
import type { Tag } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const router = useRouter()
const toast = useToast()
const { tags, fetchTags, createTag, deleteTag: removeTag, mergeTags, optimisticRemove, optimisticRestore, permanentDelete, TAG_COLORS } = useTags()

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isMergeModalOpen = ref(false)
const isDetailPanelOpen = ref(false)
const isShortcutsModalOpen = ref(false)
const isImportModalOpen = ref(false)
const selectedTag = ref<Tag | undefined>()
const detailTag = ref<Tag | undefined>()
const isDeleting = ref(false)
const isMerging = ref(false)
const isImporting = ref(false)
const importText = ref('')
const importStrategy = ref<'skip' | 'merge'>('skip')

const pinnedTagIds = ref(new Set<string>())
const recentTagIds = ref<string[]>([])
const pendingDeleteTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const draggedTagId = ref<string | null>(null)

const quickCreateInput = ref('')
const isQuickCreating = ref(false)

const mergeSourceIds = ref<string[]>([])
const mergeTargetId = ref<string | null>(null)

const searchQuery = ref('')
const sortBy = ref('name-asc')
const sortOptions = [
  { label: 'Name (A\u2013Z)', value: 'name-asc' },
  { label: 'Name (Z\u2013A)', value: 'name-desc' },
  { label: 'Most Entries', value: 'entries-desc' },
  { label: 'Fewest Entries', value: 'entries-asc' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
]

const viewMode = ref<'grid' | 'list'>('grid')
onMounted(() => {
  const saved = localStorage.getItem('tags-view-mode')
  if (saved === 'grid' || saved === 'list') viewMode.value = saved

  const savedPinned = localStorage.getItem('pinned-tag-ids')
  if (savedPinned) {
    try { pinnedTagIds.value = new Set(JSON.parse(savedPinned)) }
    catch { /* ignore */ }
  }
  const savedRecent = localStorage.getItem('recent-tag-ids')
  if (savedRecent) {
    try { recentTagIds.value = JSON.parse(savedRecent) }
    catch { /* ignore */ }
  }

  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
watch(viewMode, (mode) => {
  if (import.meta.client) localStorage.setItem('tags-view-mode', mode)
})

const isSelecting = ref(false)
const selectedIds = ref(new Set<string>())

function toggleSelect(tagId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(tagId)) next.delete(tagId)
  else next.add(tagId)
  selectedIds.value = next
}

function clearSelection() {
  selectedIds.value = new Set()
  isSelecting.value = false
}

function toggleSelectAll() {
  if (selectedIds.value.size === paginatedTags.value.length) {
    selectedIds.value = new Set()
  }
  else {
    selectedIds.value = new Set(paginatedTags.value.map(t => t.id))
  }
}

const currentPage = ref(1)
const pageSize = 50
const focusedIndex = ref(-1)
const searchInputRef = ref<any>()

const shortcuts = [
  { key: '/', description: 'Focus search' },
  { key: 'Esc', description: 'Clear search & selection' },
  { key: 'j / k', description: 'Navigate tags' },
  { key: 'Enter', description: 'Open tag details' },
  { key: 'e', description: 'Edit focused tag' },
  { key: 'd', description: 'Delete focused tag' },
  { key: 's', description: 'Toggle selection mode' },
  { key: '?', description: 'Show keyboard shortcuts' },
]

await fetchTags(true)

const filteredAndSortedTags = computed(() => {
  let result = [...tags.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(q)
      || t.description?.toLowerCase().includes(q),
    )
  }

  switch (sortBy.value) {
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'name-desc':
      result.sort((a, b) => b.name.localeCompare(a.name))
      break
    case 'entries-desc':
      result.sort((a, b) => (b.entryCount ?? 0) - (a.entryCount ?? 0))
      break
    case 'entries-asc':
      result.sort((a, b) => (a.entryCount ?? 0) - (b.entryCount ?? 0))
      break
    case 'newest':
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'oldest':
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      break
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredAndSortedTags.value.length / pageSize))

const paginatedTags = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredAndSortedTags.value.slice(start, start + pageSize)
})

watch([searchQuery, sortBy], () => {
  currentPage.value = 1
  focusedIndex.value = -1
})

const hasGroups = computed(() => paginatedTags.value.some(t => t.groupName))

const collapsedGroups = ref(new Set<string>())

function toggleGroup(groupName: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(groupName)) next.delete(groupName)
  else next.add(groupName)
  collapsedGroups.value = next
}

interface DisplayItem {
  isHeader: boolean
  groupName: string
  groupCount: number
  tag: Tag | null
  flatIndex: number
}

const displayItems = computed((): DisplayItem[] => {
  const paginated = paginatedTags.value

  if (!hasGroups.value) {
    return paginated.map((tag, i) => ({
      isHeader: false,
      groupName: '',
      groupCount: 0,
      tag,
      flatIndex: i,
    }))
  }

  const flatIndexMap = new Map<string, number>()
  paginated.forEach((tag, i) => flatIndexMap.set(tag.id, i))

  const groups = new Map<string, Tag[]>()
  const ungrouped: Tag[] = []
  for (const tag of paginated) {
    if (tag.groupName) {
      if (!groups.has(tag.groupName)) groups.set(tag.groupName, [])
      groups.get(tag.groupName)!.push(tag)
    }
    else {
      ungrouped.push(tag)
    }
  }

  const items: DisplayItem[] = []

  for (const [gn, gt] of groups.entries()) {
    items.push({ isHeader: true, groupName: gn, groupCount: gt.length, tag: null, flatIndex: -1 })
    if (!collapsedGroups.value.has(gn)) {
      for (const tag of gt) {
        items.push({ isHeader: false, groupName: '', groupCount: 0, tag, flatIndex: flatIndexMap.get(tag.id) ?? -1 })
      }
    }
  }

  if (ungrouped.length > 0) {
    items.push({ isHeader: true, groupName: 'Ungrouped', groupCount: ungrouped.length, tag: null, flatIndex: -1 })
    for (const tag of ungrouped) {
      items.push({ isHeader: false, groupName: '', groupCount: 0, tag, flatIndex: flatIndexMap.get(tag.id) ?? -1 })
    }
  }

  return items
})

function togglePin(tagId: string) {
  const next = new Set(pinnedTagIds.value)
  if (next.has(tagId)) next.delete(tagId)
  else next.add(tagId)
  pinnedTagIds.value = next
  if (import.meta.client) localStorage.setItem('pinned-tag-ids', JSON.stringify([...next]))
}

function trackRecentTag(tagId: string) {
  const ids = [tagId, ...recentTagIds.value.filter(id => id !== tagId)].slice(0, 5)
  recentTagIds.value = ids
  if (import.meta.client) localStorage.setItem('recent-tag-ids', JSON.stringify(ids))
}

const pinnedTags = computed(() => tags.value.filter(t => pinnedTagIds.value.has(t.id)))

const recentTags = computed(() => {
  return recentTagIds.value
    .map(id => tags.value.find(t => t.id === id))
    .filter((t): t is Tag => !!t && !pinnedTagIds.value.has(t.id))
    .slice(0, 5)
})

const mergePreviewCount = computed(() => {
  if (!mergeTargetId.value || mergeSourceIds.value.length === 0) return 0
  const target = tags.value.find(t => t.id === mergeTargetId.value)
  const sources = tags.value.filter(t => mergeSourceIds.value.includes(t.id))
  return (target?.entryCount ?? 0) + sources.reduce((sum, t) => sum + (t.entryCount ?? 0), 0)
})

function getTagVisualWeight(entryCount: number): string {
  if (entryCount === 0) return 'opacity-60'
  return ''
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function handleQuickCreate() {
  const value = quickCreateInput.value.trim()
  if (!value || isQuickCreating.value) return

  isQuickCreating.value = true
  try {
    const names = value.includes(',')
      ? value.split(',').map(s => s.trim()).filter(Boolean)
      : [value]

    let created = 0
    for (const name of names) {
      try {
        await createTag(name)
        created++
      }
      catch (e: any) {
        if (!e.data?.message?.includes('already exists')) {
          toast.add({ title: `Failed to create "${name}"`, color: 'error' })
        }
      }
    }

    if (created > 0) {
      toast.add({
        title: created === 1 ? 'Tag created' : `${created} tags created`,
        color: 'success',
      })
    }
    quickCreateInput.value = ''
  }
  finally {
    isQuickCreating.value = false
  }
}

function openEditModal(tag: Tag) {
  selectedTag.value = tag
  isEditModalOpen.value = true
}

function openDeleteModal(tag: Tag) {
  selectedTag.value = tag
  isDeleteModalOpen.value = true
}

function openDetailPanel(tag: Tag) {
  detailTag.value = tag
  isDetailPanelOpen.value = true
}

function viewEntries(tag: Tag) {
  trackRecentTag(tag.id)
  router.push({
    path: '/app/library',
    query: { tagIds: tag.id },
  })
}

function handleCardClick(tag: Tag) {
  if (isSelecting.value) {
    toggleSelect(tag.id)
    return
  }
  viewEntries(tag)
}

async function handleDeleteTag() {
  if (!selectedTag.value) return

  const tagToDelete = selectedTag.value
  isDeleteModalOpen.value = false
  isDetailPanelOpen.value = false
  selectedTag.value = undefined

  optimisticRemove(tagToDelete.id)

  if (pendingDeleteTimeout.value) clearTimeout(pendingDeleteTimeout.value)

  const timeout = setTimeout(async () => {
    try {
      await permanentDelete(tagToDelete.id)
    }
    catch {
      optimisticRestore(tagToDelete)
      toast.add({ title: 'Failed to delete tag', color: 'error' })
    }
    pendingDeleteTimeout.value = null
  }, 5000)

  pendingDeleteTimeout.value = timeout

  toast.add({
    title: `"${tagToDelete.name}" deleted`,
    color: 'neutral',
    actions: [{
      label: 'Undo',
      color: 'primary' as const,
      variant: 'solid' as const,
      click: () => {
        clearTimeout(timeout)
        optimisticRestore(tagToDelete)
        pendingDeleteTimeout.value = null
      },
    }],
    duration: 5000,
  })
}

async function handleBulkDelete() {
  if (selectedIds.value.size === 0) return
  const count = selectedIds.value.size

  for (const id of selectedIds.value) {
    try { await removeTag(id) }
    catch { /* continue */ }
  }

  toast.add({ title: `${count} tag(s) deleted`, color: 'success' })
  clearSelection()
}

function openMergeModal() {
  mergeSourceIds.value = []
  mergeTargetId.value = null
  isMergeModalOpen.value = true
}

function openBulkMerge() {
  mergeSourceIds.value = [...selectedIds.value]
  mergeTargetId.value = null
  isMergeModalOpen.value = true
  isSelecting.value = false
}

async function handleMerge() {
  if (mergeSourceIds.value.length === 0 || !mergeTargetId.value) return

  isMerging.value = true
  try {
    await mergeTags(mergeSourceIds.value, mergeTargetId.value)
    toast.add({
      title: 'Tags merged',
      description: `${mergeSourceIds.value.length} tag(s) merged into target.`,
      color: 'success',
    })
    isMergeModalOpen.value = false
    clearSelection()
  }
  catch (e: any) {
    toast.add({
      title: 'Failed to merge tags',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  }
  finally {
    isMerging.value = false
  }
}

function handleTagUpdated() {
  isEditModalOpen.value = false
  isDetailPanelOpen.value = false
  selectedTag.value = undefined
  fetchTags(true)
}

function handleTagCreated() {
  fetchTags(true)
}

function handleDetailEdit(tag: Tag) {
  isDetailPanelOpen.value = false
  openEditModal(tag)
}

function handleDetailDelete(tag: Tag) {
  isDetailPanelOpen.value = false
  openDeleteModal(tag)
}

function handleAnalyticsTagClick(tagId: string) {
  const tag = tags.value.find(t => t.id === tagId)
  if (tag) openDetailPanel(tag)
}

function handleAnalyticsTagPairClick(tagIdA: string, tagIdB: string) {
  router.push({ path: '/app/library', query: { tagIds: [tagIdA, tagIdB].join(',') } })
}

const mergeTargetOptions = computed(() => {
  return tags.value.filter(t => !mergeSourceIds.value.includes(t.id))
})

const mergeSourceOptions = computed(() => {
  return tags.value.filter(t => t.id !== mergeTargetId.value)
})

function getDropdownItems(tag: Tag) {
  return [
    [
      { label: 'Details', icon: 'i-heroicons-information-circle', onSelect: () => openDetailPanel(tag) },
      {
        label: pinnedTagIds.value.has(tag.id) ? 'Unpin' : 'Pin',
        icon: pinnedTagIds.value.has(tag.id) ? 'i-heroicons-star' : 'i-heroicons-star',
        onSelect: () => togglePin(tag.id),
      },
      { label: 'Edit', icon: 'i-heroicons-pencil', onSelect: () => openEditModal(tag) },
      { label: 'View entries', icon: 'i-heroicons-book-open', onSelect: () => viewEntries(tag) },
    ],
    [
      { label: 'Delete', icon: 'i-heroicons-trash', color: 'error' as const, onSelect: () => openDeleteModal(tag) },
    ],
  ]
}

async function exportTags(format: 'json' | 'csv') {
  try {
    const data = await $fetch(`/api/tags/export`, { params: { format } })
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv' : 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tags.${format}`
    a.click()
    URL.revokeObjectURL(url)
    toast.add({ title: `Tags exported as ${format.toUpperCase()}`, color: 'success' })
  }
  catch {
    toast.add({ title: 'Export failed', color: 'error' })
  }
}

async function handleImport() {
  if (!importText.value.trim()) return

  isImporting.value = true
  try {
    const parsed = JSON.parse(importText.value.trim())
    const tagsData = Array.isArray(parsed) ? parsed : parsed.tags
    if (!Array.isArray(tagsData)) {
      toast.add({ title: 'Invalid format: expected an array of tags', color: 'error' })
      return
    }

    const result = await $fetch<{ imported: number; skipped: number; updated: number }>('/api/tags/import', {
      method: 'POST',
      body: { tags: tagsData, strategy: importStrategy.value },
    })

    const parts = []
    if (result.imported > 0) parts.push(`${result.imported} imported`)
    if (result.skipped > 0) parts.push(`${result.skipped} skipped`)
    if (result.updated > 0) parts.push(`${result.updated} updated`)

    toast.add({ title: `Tags import complete: ${parts.join(', ')}`, color: 'success' })
    isImportModalOpen.value = false
    importText.value = ''
    fetchTags(true)
  }
  catch (e: any) {
    toast.add({
      title: 'Import failed',
      description: e.data?.message || e.message || 'Invalid JSON format',
      color: 'error',
    })
  }
  finally {
    isImporting.value = false
  }
}

function handleDragStart(tag: Tag, e: DragEvent) {
  draggedTagId.value = tag.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tag.id)
  }
}

function handleDrop(targetTag: Tag, e: DragEvent) {
  e.preventDefault()
  if (!draggedTagId.value || draggedTagId.value === targetTag.id) return

  mergeSourceIds.value = [draggedTagId.value]
  mergeTargetId.value = targetTag.id
  isMergeModalOpen.value = true
  draggedTagId.value = null
}

function handleDragEnd() {
  draggedTagId.value = null
}

function getHeaderMenuItems() {
  return [
    [
      { label: 'Export as JSON', icon: 'i-heroicons-arrow-down-tray', onSelect: () => exportTags('json') },
      { label: 'Export as CSV', icon: 'i-heroicons-table-cells', onSelect: () => exportTags('csv') },
    ],
    [
      { label: 'Import tags', icon: 'i-heroicons-arrow-up-tray', onSelect: () => { isImportModalOpen.value = true } },
    ],
  ]
}

function handleKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    if (e.key === 'Escape') {
      (e.target as HTMLElement).blur()
      searchQuery.value = ''
    }
    return
  }

  switch (e.key) {
    case '/':
      e.preventDefault()
      if (searchInputRef.value) {
        const el = searchInputRef.value.$el as HTMLElement
        const input = el?.querySelector?.('input') as HTMLInputElement | null
        ;(input ?? el)?.focus()
      }
      break
    case 'Escape':
      searchQuery.value = ''
      clearSelection()
      focusedIndex.value = -1
      break
    case 'j':
      e.preventDefault()
      focusedIndex.value = Math.min(focusedIndex.value + 1, paginatedTags.value.length - 1)
      break
    case 'k':
      e.preventDefault()
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      break
    case 'Enter':
      if (focusedIndex.value >= 0 && focusedIndex.value < paginatedTags.value.length) {
        openDetailPanel(paginatedTags.value[focusedIndex.value])
      }
      break
    case 'e':
      if (focusedIndex.value >= 0 && focusedIndex.value < paginatedTags.value.length) {
        openEditModal(paginatedTags.value[focusedIndex.value])
      }
      break
    case 'd':
      if (focusedIndex.value >= 0 && focusedIndex.value < paginatedTags.value.length) {
        openDeleteModal(paginatedTags.value[focusedIndex.value])
      }
      break
    case 's':
      isSelecting.value = !isSelecting.value
      if (!isSelecting.value) selectedIds.value = new Set()
      break
    case '?':
      isShortcutsModalOpen.value = true
      break
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Tags
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{ tags.length }} {{ tags.length === 1 ? 'tag' : 'tags' }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
          <button
            class="p-1.5 rounded-md transition-colors"
            :class="viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="viewMode = 'grid'"
          >
            <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
          </button>
          <button
            class="p-1.5 rounded-md transition-colors"
            :class="viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="viewMode = 'list'"
          >
            <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
          </button>
        </div>

        <UButton
          v-if="tags.length > 0"
          :icon="isSelecting ? 'i-heroicons-x-mark' : 'i-heroicons-check-circle'"
          :label="isSelecting ? 'Cancel' : 'Select'"
          variant="outline"
          :color="isSelecting ? 'primary' : 'neutral'"
          @click="isSelecting ? clearSelection() : (isSelecting = true)"
        />

        <UButton
          v-if="tags.length >= 2 && !isSelecting"
          icon="i-heroicons-arrows-pointing-in"
          label="Merge Tags"
          variant="outline"
          color="neutral"
          @click="openMergeModal"
        />

        <UDropdownMenu
          v-if="tags.length > 0"
          :items="getHeaderMenuItems()"
          :content="{ side: 'bottom', align: 'end' }"
        >
          <UButton
            icon="i-heroicons-ellipsis-horizontal"
            variant="ghost"
            color="neutral"
            size="sm"
          />
        </UDropdownMenu>

        <UButton
          icon="i-heroicons-question-mark-circle"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="isShortcutsModalOpen = true"
        />
      </div>
    </div>

    <!-- Quick create -->
    <UCard class="p-4">
      <form class="flex gap-2" @submit.prevent="handleQuickCreate">
        <UInput
          v-model="quickCreateInput"
          icon="i-heroicons-tag"
          placeholder="Create tags quickly - use commas for multiple"
          class="flex-1"
          :disabled="isQuickCreating"
          @keydown.enter.prevent="handleQuickCreate"
        />
        <UButton
          type="submit"
          icon="i-heroicons-plus"
          color="primary"
          :loading="isQuickCreating"
          :disabled="!quickCreateInput.trim()"
        >
          Add
        </UButton>
      </form>
    </UCard>

    <!-- Search + Sort -->
    <div v-if="tags.length > 0" class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <UInput
        ref="searchInputRef"
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search tags..."
        class="flex-1 w-full"
      />
      <div class="flex items-center gap-3">
        <button
          v-if="isSelecting"
          class="text-xs text-primary-600 dark:text-primary-400 hover:underline shrink-0"
          @click="toggleSelectAll"
        >
          {{ selectedIds.size === paginatedTags.length ? 'Deselect all' : 'Select all' }}
        </button>
        <USelectMenu
          v-model="sortBy"
          :items="sortOptions"
          value-key="value"
          label-key="label"
          class="w-full sm:w-48"
        />
      </div>
    </div>

    <!-- Pinned & Recent -->
    <div v-if="pinnedTags.length > 0 || recentTags.length > 0" class="space-y-3">
      <div v-if="pinnedTags.length > 0">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Pinned
        </h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in pinnedTags"
            :key="tag.id"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            @click="viewEntries(tag)"
          >
            <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: tag.color }" />
            {{ tag.name }}
          </button>
        </div>
      </div>
      <div v-if="recentTags.length > 0">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Recent
        </h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in recentTags"
            :key="tag.id"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            @click="viewEntries(tag)"
          >
            <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: tag.color }" />
            {{ tag.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Analytics -->
    <LazyAppTagAnalytics
      v-if="tags.length > 0"
      :tags="tags"
      @select-tag="handleAnalyticsTagClick"
      @select-tag-pair="handleAnalyticsTagPairClick"
    />

    <!-- Empty state: no tags -->
    <div v-if="!tags.length" class="text-center py-12">
      <UIcon name="i-heroicons-tag" class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No tags yet
      </h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Type tag names above to create them instantly
      </p>
    </div>

    <!-- Empty search results -->
    <div v-else-if="filteredAndSortedTags.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No matching tags
      </h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        No tags match "{{ searchQuery }}"
      </p>
      <UButton
        class="mt-4"
        variant="outline"
        color="neutral"
        @click="searchQuery = ''"
      >
        Clear search
      </UButton>
    </div>

    <!-- Grid view -->
    <TransitionGroup
      v-else-if="viewMode === 'grid'"
      tag="div"
      class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3"
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
      move-class="transition-transform duration-300 ease-out"
    >
      <div
        v-for="item in displayItems"
        :key="item.isHeader ? `header-${item.groupName}` : `tag-${item.flatIndex}`"
        :class="{ 'col-span-full': item.isHeader }"
      >
        <button
          v-if="item.isHeader"
          class="flex items-center gap-2 pt-3"
          @click="toggleGroup(item.groupName)"
        >
          <UIcon
            :name="collapsedGroups.has(item.groupName) ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-down'"
            class="w-4 h-4 text-gray-400"
          />
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {{ item.groupName }}
          </h3>
          <span class="text-xs text-gray-400">{{ item.groupCount }}</span>
        </button>

        <UCard
          v-else
          draggable="true"
          class="relative p-3 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
          :class="[
            { 'ring-2 ring-primary-500': focusedIndex === item.flatIndex && !isSelecting },
            { 'ring-2 ring-primary-300 dark:ring-primary-600 scale-[1.02]': draggedTagId && draggedTagId !== item.tag?.id },
            { 'opacity-50 scale-95': draggedTagId === item.tag?.id },
            getTagVisualWeight(item.tag?.entryCount ?? 0),
          ]"
          @click="handleCardClick(item.tag!)"
          @dragstart="handleDragStart(item.tag!, $event)"
          @dragover.prevent
          @drop="handleDrop(item.tag!, $event)"
          @dragend="handleDragEnd"
        >
          <div v-if="isSelecting" class="absolute top-2 left-2 z-10" @click.stop="toggleSelect(item.tag!.id)">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer"
              :class="selectedIds.has(item.tag!.id)
                ? 'bg-primary-600 border-primary-600'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-primary-400'"
            >
              <UIcon v-if="selectedIds.has(item.tag!.id)" name="i-heroicons-check" class="w-3 h-3 text-white" />
            </div>
          </div>

          <div class="flex items-start justify-between gap-2" :class="{ 'pl-7': isSelecting }">
            <div class="flex items-start gap-2 min-w-0">
              <span
                class="w-4 h-4 rounded-full shrink-0 mt-0.5"
                :style="{ backgroundColor: item.tag!.color }"
              />
              <UTooltip :text="item.tag!.name">
                <span class="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight">
                  {{ item.tag!.name }}
                </span>
              </UTooltip>
            </div>
            <UDropdownMenu
              :items="getDropdownItems(item.tag!)"
              :content="{ side: 'bottom', align: 'end' }"
            >
              <UButton
                icon="i-heroicons-ellipsis-vertical"
                variant="ghost"
                color="neutral"
                size="xs"
                class="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
                @click.stop
              />
            </UDropdownMenu>
          </div>
          <p v-if="item.tag!.description" class="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-6 line-clamp-1">
            {{ item.tag!.description }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-6">
            {{ item.tag!.entryCount ?? 0 }} {{ (item.tag!.entryCount ?? 0) === 1 ? 'entry' : 'entries' }}
          </p>
        </UCard>
      </div>
    </TransitionGroup>

    <!-- List view -->
    <TransitionGroup
      v-else
      tag="div"
      class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-800"
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-x-2"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-2"
    >
      <div
        v-for="item in displayItems"
        :key="item.isHeader ? `header-${item.groupName}` : `tag-${item.flatIndex}`"
      >
        <button
          v-if="item.isHeader"
          class="flex items-center gap-2 px-4 py-2 w-full bg-gray-50 dark:bg-gray-800/50"
          @click="toggleGroup(item.groupName)"
        >
          <UIcon
            :name="collapsedGroups.has(item.groupName) ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-down'"
            class="w-4 h-4 text-gray-400"
          />
          <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {{ item.groupName }}
          </h3>
          <span class="text-xs text-gray-400">{{ item.groupCount }}</span>
        </button>

        <div
          v-else
          draggable="true"
          class="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group transition-colors"
          :class="[
            { 'bg-primary-50 dark:bg-primary-900/10': focusedIndex === item.flatIndex && !isSelecting },
            { 'bg-primary-50 dark:bg-primary-900/10': draggedTagId && draggedTagId !== item.tag?.id },
            { 'opacity-50': draggedTagId === item.tag?.id },
            getTagVisualWeight(item.tag?.entryCount ?? 0),
          ]"
          @click="handleCardClick(item.tag!)"
          @dragstart="handleDragStart(item.tag!, $event)"
          @dragover.prevent
          @drop="handleDrop(item.tag!, $event)"
          @dragend="handleDragEnd"
        >
          <div v-if="isSelecting" class="shrink-0" @click.stop="toggleSelect(item.tag!.id)">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer"
              :class="selectedIds.has(item.tag!.id)
                ? 'bg-primary-600 border-primary-600'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-primary-400'"
            >
              <UIcon v-if="selectedIds.has(item.tag!.id)" name="i-heroicons-check" class="w-3 h-3 text-white" />
            </div>
          </div>

          <span
            class="w-4 h-4 rounded-full shrink-0"
            :style="{ backgroundColor: item.tag!.color }"
          />
          <div class="flex-1 min-w-0">
            <span class="font-medium text-sm text-gray-900 dark:text-white">
              {{ item.tag!.name }}
            </span>
            <span v-if="item.tag!.description" class="ml-3 text-xs text-gray-400 dark:text-gray-500">
              {{ item.tag!.description }}
            </span>
          </div>
          <span v-if="item.tag!.groupName" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0 hidden lg:block">
            {{ item.tag!.groupName }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
            {{ item.tag!.entryCount ?? 0 }} {{ (item.tag!.entryCount ?? 0) === 1 ? 'entry' : 'entries' }}
          </span>
          <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden sm:block">
            {{ formatDate(item.tag!.createdAt) }}
          </span>
          <UDropdownMenu
            :items="getDropdownItems(item.tag!)"
            :content="{ side: 'bottom', align: 'end' }"
          >
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              variant="ghost"
              color="neutral"
              size="xs"
              class="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </div>
    </TransitionGroup>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between pt-2">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Showing {{ (currentPage - 1) * pageSize + 1 }}&ndash;{{ Math.min(currentPage * pageSize, filteredAndSortedTags.length) }}
        of {{ filteredAndSortedTags.length }}
      </p>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-heroicons-chevron-left"
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        />
        <span class="px-3 text-sm text-gray-600 dark:text-gray-400 tabular-nums">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <UButton
          icon="i-heroicons-chevron-right"
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        />
      </div>
    </div>

    <!-- Floating selection bar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="selectedIds.size > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full shadow-2xl px-6 py-3 flex items-center gap-4 z-50"
      >
        <span class="text-sm font-medium">{{ selectedIds.size }} selected</span>
        <div class="w-px h-5 bg-gray-700 dark:bg-gray-300" />
        <button class="text-sm hover:text-red-400 transition-colors flex items-center gap-1.5" @click="handleBulkDelete">
          <UIcon name="i-heroicons-trash" class="w-4 h-4" />
          Delete
        </button>
        <button
          v-if="selectedIds.size >= 2"
          class="text-sm hover:text-primary-400 transition-colors flex items-center gap-1.5"
          @click="openBulkMerge"
        >
          <UIcon name="i-heroicons-arrows-pointing-in" class="w-4 h-4" />
          Merge
        </button>
        <button class="hover:text-gray-400 transition-colors" @click="clearSelection">
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
    </Transition>

    <!-- Tag Detail Panel -->
    <LazyAppTagDetailPanel
      v-model:open="isDetailPanelOpen"
      :tag="detailTag"
      @edit="handleDetailEdit"
      @delete="handleDetailDelete"
    />

    <!-- Edit Tag Modal -->
    <LazyAppTagFormModal
      v-model:open="isEditModalOpen"
      :tag="selectedTag"
      @updated="handleTagUpdated"
      @created="handleTagCreated"
    />

    <!-- Delete confirmation -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Tag
              </h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong class="text-gray-900 dark:text-white">{{ selectedTag?.name }}</strong>?
            This will remove the tag from {{ selectedTag?.entryCount ?? 0 }} {{ (selectedTag?.entryCount ?? 0) === 1 ? 'entry' : 'entries' }}.
            The entries themselves will not be deleted.
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="outline"
                color="neutral"
                @click="isDeleteModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                :loading="isDeleting"
                @click="handleDeleteTag"
              >
                Delete Tag
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Merge Tags Modal -->
    <UModal v-model:open="isMergeModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-arrows-pointing-in" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Merge Tags
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Combine tags into one, reassigning all entries
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Merge these tags (will be deleted)">
              <USelectMenu
                v-model="mergeSourceIds"
                :items="mergeSourceOptions"
                multiple
                placeholder="Select tags to merge..."
                value-key="id"
                label-key="name"
              >
                <template #item-leading="{ item }">
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: (item as Tag).color }"
                  />
                </template>
              </USelectMenu>
            </UFormField>

            <div class="flex justify-center">
              <UIcon name="i-heroicons-arrow-down" class="w-5 h-5 text-gray-400" />
            </div>

            <UFormField label="Into this tag (will be kept)">
              <USelectMenu
                v-model="mergeTargetId"
                :items="mergeTargetOptions"
                placeholder="Select target tag..."
                value-key="id"
                label-key="name"
              >
                <template #item-leading="{ item }">
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: (item as Tag).color }"
                  />
                </template>
              </USelectMenu>
            </UFormField>

            <div v-if="mergeSourceIds.length > 0 && mergeTargetId" class="space-y-3">
              <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Preview
                </h4>
                <div class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: tags.find(t => t.id === mergeTargetId)?.color }"
                  />
                  <span class="font-medium text-sm text-gray-900 dark:text-white">
                    {{ tags.find(t => t.id === mergeTargetId)?.name }}
                  </span>
                  <span class="ml-auto text-xs text-gray-400 tabular-nums">
                    ~{{ mergePreviewCount }} entries after merge
                  </span>
                </div>
              </div>

              <UAlert
                icon="i-heroicons-information-circle"
                color="info"
                :title="`${mergeSourceIds.length} tag(s) will be deleted and their entries will be reassigned to the target tag.`"
              />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="outline"
                color="neutral"
                @click="isMergeModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="isMerging"
                :disabled="mergeSourceIds.length === 0 || !mergeTargetId"
                @click="handleMerge"
              >
                Merge Tags
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Import Tags Modal -->
    <UModal v-model:open="isImportModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Import Tags
              </h2>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                @click="isImportModalOpen = false"
              />
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Paste a JSON array of tags. Each tag should have at least a <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">name</code> field.
              Optional fields: <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">color</code>,
              <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">description</code>,
              <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">groupName</code>.
            </p>

            <UTextarea
              v-model="importText"
              :rows="8"
              placeholder='[{ "name": "Political Science", "color": "#4F46E5" }]'
              class="w-full font-mono text-xs"
            />

            <UFormField label="Duplicate handling">
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input v-model="importStrategy" type="radio" value="skip" class="text-primary-600">
                  Skip existing
                </label>
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input v-model="importStrategy" type="radio" value="merge" class="text-primary-600">
                  Merge (update existing)
                </label>
              </div>
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="outline"
                color="neutral"
                @click="isImportModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="isImporting"
                :disabled="!importText.trim()"
                @click="handleImport"
              >
                Import
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Keyboard Shortcuts -->
    <UModal v-model:open="isShortcutsModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                @click="isShortcutsModalOpen = false"
              />
            </div>
          </template>

          <div class="space-y-3">
            <div v-for="shortcut in shortcuts" :key="shortcut.key" class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ shortcut.description }}</span>
              <kbd class="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                {{ shortcut.key }}
              </kbd>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
