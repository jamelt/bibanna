<script setup lang="ts">
import type { Project, Entry, Tag } from '~/shared/types'
import { ENTRY_TYPE_LABELS } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { open: openQuickAdd } = useQuickAdd()
const { onEntryCreated } = useEntryEvents()
const { toggleStar } = useStarredProjects()

const projectIdentifier = computed(() => route.params.id as string)

const {
  data: project,
  pending,
  refresh: refreshProject,
} = await useFetch<Project & { entries?: any[]; entryCount?: number }>(
  () => `/api/projects/${projectIdentifier.value}`,
)

const entrySearchQuery = ref('')
const selectedTypes = ref<string[]>([])
const showUntagged = ref(route.query.untagged === 'true')
const selectedTags = ref<string[]>(
  (() => {
    if (showUntagged.value) return []
    const tagIds = route.query.tagIds
    if (!tagIds) return []
    if (Array.isArray(tagIds)) return tagIds.filter(Boolean) as string[]
    return tagIds.split(',').filter(Boolean)
  })(),
)
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(50)
const viewMode = useViewPreferences<'list' | 'table'>('projectEntries', 'table')

const projectId = computed(() => project.value?.id)
const q = computed(() => entrySearchQuery.value || undefined)
const entryTypesQuery = computed(() =>
  selectedTypes.value.length > 0 ? selectedTypes.value : undefined,
)
const tagIdsQuery = computed(() => (selectedTags.value.length > 0 ? selectedTags.value : undefined))
const untaggedQuery = computed(() => showUntagged.value || undefined)

const {
  data: entriesData,
  pending: entriesPending,
  refresh: refreshEntries,
} = useFetch('/api/entries', {
  query: {
    projectId,
    q,
    entryTypes: entryTypesQuery,
    tagIds: tagIdsQuery,
    untagged: untaggedQuery,
    sortBy,
    sortOrder,
    page,
    pageSize,
  },
})

const entries = computed(() => entriesData.value?.data ?? [])
const totalEntries = computed(() => entriesData.value?.total ?? 0)
const totalPages = computed(() => entriesData.value?.totalPages ?? 1)

watch([entrySearchQuery, selectedTypes, selectedTags], () => {
  page.value = 1
})

watch(showUntagged, (val) => {
  if (val) selectedTags.value = []
  page.value = 1
})

watch(selectedTags, (val) => {
  if (val.length > 0) showUntagged.value = false
})

const { data: userTags } = await useFetch<Tag[]>('/api/tags', { lazy: true })

const entryTypeOptions = Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isExportModalOpen = ref(false)
const isAddEntryModalOpen = ref(false)
const isTagInsightsOpen = ref(false)
const isDeleting = ref(false)
const isRemovingEntry = ref<string | null>(null)
const isAddingEntries = ref(false)
const selectedEntryIds = ref<Set<string>>(new Set())
const tableSelectedIds = ref<string[]>([])
const modalSearchQuery = ref('')
const isBulkProcessing = ref(false)
const bulkTagIds = ref<string[]>([])
const isBulkTagPickerOpen = ref(false)
const bulkTagMode = ref<'add' | 'remove'>('add')

async function refresh() {
  await Promise.all([refreshProject(), refreshEntries()])
}

async function bulkAction(action: string, extra: Record<string, unknown> = {}) {
  if (tableSelectedIds.value.length === 0) return
  isBulkProcessing.value = true
  try {
    const result = await $fetch<{ affected: number; action: string }>('/api/entries/bulk', {
      method: 'POST',
      body: {
        entryIds: tableSelectedIds.value,
        action,
        ...extra,
      },
    })
    toast.add({
      title: `${result.action} completed`,
      description: `${result.affected} entries affected.`,
      color: 'success',
    })
    tableSelectedIds.value = []
    await refreshEntries()
  } catch (err: any) {
    toast.add({
      title: 'Bulk action failed',
      description: err.data?.message || 'Please try again.',
      color: 'error',
    })
  } finally {
    isBulkProcessing.value = false
  }
}

async function applyBulkTags() {
  if (bulkTagIds.value.length === 0) return
  const action = bulkTagMode.value === 'add' ? 'addTags' : 'removeTags'
  await bulkAction(action, { tagIds: bulkTagIds.value })
  bulkTagIds.value = []
  isBulkTagPickerOpen.value = false
}

function openBulkTagPicker(mode: 'add' | 'remove') {
  bulkTagMode.value = mode
  bulkTagIds.value = []
  isBulkTagPickerOpen.value = true
}

function clearFilters() {
  entrySearchQuery.value = ''
  selectedTypes.value = []
  selectedTags.value = []
  showUntagged.value = false
  page.value = 1
}

const hasActiveFilters = computed(
  () =>
    entrySearchQuery.value ||
    selectedTypes.value.length > 0 ||
    selectedTags.value.length > 0 ||
    showUntagged.value,
)

function handleInsightsTagClick(tagId: string) {
  selectedTags.value = [tagId]
  showUntagged.value = false
  isTagInsightsOpen.value = false
}

function handleInsightsTagPairClick(tagIdA: string, tagIdB: string) {
  selectedTags.value = [tagIdA, tagIdB]
  showUntagged.value = false
  isTagInsightsOpen.value = false
}

function handleInsightsUntagged() {
  showUntagged.value = true
  isTagInsightsOpen.value = false
}

const { data: libraryEntries } = await useFetch<{
  data: Entry[]
  total: number
}>('/api/entries', {
  query: { pageSize: 100 },
  lazy: true,
})

const availableEntries = computed(() => {
  if (!libraryEntries.value?.data) return []
  const projectEntryIds = new Set(entries.value.map((e: any) => e.id))
  return libraryEntries.value.data.filter((e) => !projectEntryIds.has(e.id))
})

const filteredAvailableEntries = computed(() => {
  if (!modalSearchQuery.value) return availableEntries.value

  const query = modalSearchQuery.value.toLowerCase()
  return availableEntries.value.filter((entry) => {
    const titleMatch = entry.title?.toLowerCase().includes(query)
    const authorsMatch = entry.authors?.some((a: any) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(query),
    )
    const yearMatch = entry.year?.toString().includes(query)
    return titleMatch || authorsMatch || yearMatch
  })
})

const modalAllSelected = computed({
  get: () =>
    filteredAvailableEntries.value.length > 0 &&
    filteredAvailableEntries.value.every((e) => selectedEntryIds.value.has(e.id)),
  set: (value: boolean) => {
    if (value) {
      filteredAvailableEntries.value.forEach((e) => selectedEntryIds.value.add(e.id))
    } else {
      filteredAvailableEntries.value.forEach((e) => selectedEntryIds.value.delete(e.id))
    }
  },
})

function projectSlugOrId(p: Project | null | undefined) {
  if (!p) return projectIdentifier.value
  return p.slug || p.id
}

function openCompanion() {
  if (!project.value) return
  router.push(`/app/projects/${project.value.id}/companion`)
}

function openMindMap() {
  if (!project.value) return
  router.push(`/app/projects/${project.value.id}/mindmap`)
}

async function handleToggleStar() {
  if (!project.value) return
  try {
    const result = await toggleStar(project.value.id)
    project.value.isStarred = result.isStarred
    toast.add({
      title: result.isStarred ? 'Project starred' : 'Project unstarred',
      color: 'success',
    })
  } catch {
    toast.add({
      title: 'Failed to update project',
      color: 'error',
    })
  }
}

async function handleProjectUpdated() {
  isEditModalOpen.value = false
  await refresh()
}

async function toggleArchive() {
  if (!project.value) return
  try {
    await $fetch(`/api/projects/${project.value.id}`, {
      method: 'PUT',
      body: { isArchived: !project.value.isArchived },
    })
    toast.add({
      title: project.value.isArchived ? 'Project restored' : 'Project archived',
      color: 'success',
    })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Failed to update project',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  }
}

async function deleteProject() {
  if (!project.value) return

  isDeleting.value = true
  try {
    await $fetch(`/api/projects/${project.value.id}`, {
      method: 'DELETE',
    })
    toast.add({
      title: 'Project deleted',
      color: 'success',
    })
    router.push('/app/projects')
  } catch (e: any) {
    toast.add({
      title: 'Failed to delete project',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  } finally {
    isDeleting.value = false
  }
}

async function addSelectedEntriesToProject() {
  if (!project.value || selectedEntryIds.value.size === 0) return

  isAddingEntries.value = true
  try {
    await Promise.all(
      Array.from(selectedEntryIds.value).map((entryId) =>
        $fetch(`/api/projects/${project.value.id}/entries`, {
          method: 'POST',
          body: { entryId },
        }),
      ),
    )

    const count = selectedEntryIds.value.size
    toast.add({
      title: `${count} ${count === 1 ? 'entry' : 'entries'} added to project`,
      color: 'success',
    })

    closeAddEntryModal()
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Failed to add entries',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  } finally {
    isAddingEntries.value = false
  }
}

function quickAddToProject() {
  if (!project.value) return
  openQuickAdd(project.value.id)
}

function openAddEntryModal() {
  selectedEntryIds.value.clear()
  modalSearchQuery.value = ''
  isAddEntryModalOpen.value = true
}

function closeAddEntryModal() {
  selectedEntryIds.value.clear()
  modalSearchQuery.value = ''
  isAddEntryModalOpen.value = false
}

function toggleEntrySelection(entryId: string) {
  if (selectedEntryIds.value.has(entryId)) {
    selectedEntryIds.value.delete(entryId)
  } else {
    selectedEntryIds.value.add(entryId)
  }
}

async function removeEntryFromProject(entryId: string) {
  if (!project.value) return
  isRemovingEntry.value = entryId
  try {
    await $fetch(`/api/projects/${project.value.id}/entries/${entryId}`, {
      method: 'DELETE',
    })
    toast.add({
      title: 'Entry removed from project',
      color: 'success',
    })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Failed to remove entry',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  } finally {
    isRemovingEntry.value = null
  }
}

function formatAuthors(authors: any[]) {
  if (!authors?.length) return ''
  if (authors.length === 1) {
    return authors[0].lastName
  }
  if (authors.length === 2) {
    return `${authors[0].lastName} & ${authors[1].lastName}`
  }
  return `${authors[0].lastName} et al.`
}

onEntryCreated(() => {
  refresh()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Not found -->
    <UCard v-else-if="!project" class="text-center py-12">
      <UIcon name="i-heroicons-folder-open" class="w-16 h-16 mx-auto text-gray-300" />
      <h2 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">Project not found</h2>
      <UButton to="/app/projects" class="mt-4"> Back to Projects </UButton>
    </UCard>

    <!-- Project detail -->
    <div v-else class="space-y-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm text-gray-500">
        <NuxtLink to="/app/projects" class="hover:text-gray-700 dark:hover:text-gray-300">
          Projects
        </NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        <span class="text-gray-900 dark:text-white truncate">
          {{ project.name }}
        </span>
      </nav>

      <!-- Header: Project identity -->
      <div class="flex items-start gap-3">
        <div
          class="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center mt-0.5"
          :style="{ backgroundColor: (project.color || '#4F46E5') + '20' }"
        >
          <UIcon
            name="i-heroicons-folder"
            class="w-5 h-5"
            :style="{ color: project.color || '#4F46E5' }"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ project.name }}
            </h1>
            <button
              type="button"
              class="shrink-0 p-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              :title="project.isStarred ? 'Unstar project' : 'Star project'"
              @click="handleToggleStar"
            >
              <UIcon
                :name="project.isStarred ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
                class="w-5 h-5 transition-colors"
                :class="project.isStarred ? 'text-amber-400' : 'text-gray-400 hover:text-amber-300'"
              />
            </button>
          </div>
          <p v-if="project.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ project.description }}
          </p>
          <p class="text-sm text-gray-400 mt-1">
            {{ project.entryCount || 0 }}
            {{ (project.entryCount || 0) === 1 ? 'entry' : 'entries' }}
          </p>
        </div>
      </div>

      <!-- Toolbar: Actions -->
      <div class="flex items-center gap-2">
        <UButton icon="i-heroicons-plus" size="sm" @click="quickAddToProject"> New Entry </UButton>
        <UButton
          icon="i-heroicons-book-open"
          size="sm"
          variant="outline"
          color="neutral"
          class="hidden sm:flex"
          @click="openAddEntryModal"
        >
          From Library
        </UButton>

        <UFieldGroup size="sm">
          <UButton
            icon="i-heroicons-list-bullet"
            :variant="viewMode === 'list' ? 'solid' : 'outline'"
            color="neutral"
            @click="viewMode = 'list'"
          />
          <UButton
            icon="i-heroicons-table-cells"
            :variant="viewMode === 'table' ? 'solid' : 'outline'"
            color="neutral"
            @click="viewMode = 'table'"
          />
        </UFieldGroup>

        <UButton
          icon="i-heroicons-sparkles"
          label="Research Companion"
          variant="outline"
          color="primary"
          size="sm"
          class="hidden sm:flex"
          @click="openCompanion"
        />
        <UButton
          icon="i-heroicons-pencil-square"
          label="Annotations"
          variant="outline"
          color="neutral"
          size="sm"
          class="hidden sm:flex"
          :to="`/app/annotations?projectId=${project?.id}`"
        />
        <UButton
          icon="i-heroicons-share"
          label="Mind Map"
          variant="outline"
          color="neutral"
          size="sm"
          class="hidden sm:flex"
          @click="openMindMap"
        />
        <UButton
          icon="i-heroicons-chart-bar-square"
          label="Tag Insights"
          variant="outline"
          color="neutral"
          size="sm"
          class="hidden sm:flex"
          @click="isTagInsightsOpen = true"
        />
        <UButton
          icon="i-heroicons-arrow-down-tray"
          label="Export"
          variant="outline"
          color="neutral"
          size="sm"
          class="hidden sm:flex"
          @click="isExportModalOpen = true"
        />

        <!-- Mobile overflow menu -->
        <UDropdownMenu
          :items="[
            [
              {
                label: 'From Library',
                icon: 'i-heroicons-book-open',
                onSelect: openAddEntryModal,
              },
              {
                label: 'Research Companion',
                icon: 'i-heroicons-sparkles',
                onSelect: openCompanion,
              },
              {
                label: 'Annotations',
                icon: 'i-heroicons-pencil-square',
                onSelect: () => router.push(`/app/annotations?projectId=${project?.id}`),
              },
              {
                label: 'Mind Map',
                icon: 'i-heroicons-share',
                onSelect: openMindMap,
              },
              {
                label: 'Tag Insights',
                icon: 'i-heroicons-chart-bar-square',
                onSelect: () => (isTagInsightsOpen.value = true),
              },
              {
                label: 'Export',
                icon: 'i-heroicons-arrow-down-tray',
                onSelect: () => (isExportModalOpen = true),
              },
            ],
            [
              {
                label: 'Edit',
                icon: 'i-heroicons-pencil',
                onSelect: () => (isEditModalOpen = true),
              },
            ],
            [
              {
                label: project?.isArchived ? 'Restore' : 'Archive',
                icon: project?.isArchived
                  ? 'i-heroicons-arrow-uturn-up'
                  : 'i-heroicons-archive-box',
                onSelect: toggleArchive,
              },
              {
                label: 'Delete',
                icon: 'i-heroicons-trash',
                color: 'error' as const,
                onSelect: () => (isDeleteModalOpen = true),
              },
            ],
          ]"
          :content="{ align: 'end' }"
          class="sm:hidden"
        >
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            variant="outline"
            color="neutral"
            size="sm"
          />
        </UDropdownMenu>

        <!-- Desktop context menu (Edit, Archive, Delete) -->
        <UDropdownMenu
          :items="[
            [
              {
                label: 'Edit',
                icon: 'i-heroicons-pencil',
                onSelect: () => (isEditModalOpen = true),
              },
            ],
            [
              {
                label: project?.isArchived ? 'Restore' : 'Archive',
                icon: project?.isArchived
                  ? 'i-heroicons-arrow-uturn-up'
                  : 'i-heroicons-archive-box',
                onSelect: toggleArchive,
              },
              {
                label: 'Delete',
                icon: 'i-heroicons-trash',
                color: 'error' as const,
                onSelect: () => (isDeleteModalOpen = true),
              },
            ],
          ]"
          :content="{ align: 'end' }"
          class="hidden sm:inline-flex"
        >
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            variant="outline"
            color="neutral"
            size="sm"
          />
        </UDropdownMenu>
      </div>

      <!-- Entries section -->
      <div class="space-y-3">
        <!-- Filter bar -->
        <div class="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
          <div class="flex-1 min-w-64">
            <UInput
              v-model="entrySearchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search entries..."
              size="sm"
            />
          </div>
          <USelectMenu
            v-model="selectedTypes"
            :items="entryTypeOptions"
            multiple
            placeholder="All types"
            value-key="value"
            size="sm"
            class="w-full lg:w-36"
          />
          <USelectMenu
            v-model="selectedTags"
            :items="
              (userTags || []).map((t) => ({
                ...t,
                description: t.description ?? undefined,
              }))
            "
            multiple
            placeholder="All tags"
            value-key="id"
            label-key="name"
            size="sm"
            class="w-full lg:w-36"
            :disabled="showUntagged"
          >
            <template #item-leading="{ item }">
              <span
                class="w-3 h-3 rounded-full shrink-0"
                :style="{ backgroundColor: item.color ?? 'transparent' }"
              />
            </template>
          </USelectMenu>
          <UButton
            icon="i-heroicons-tag"
            label="Untagged"
            :variant="showUntagged ? 'soft' : 'outline'"
            :color="showUntagged ? 'primary' : 'neutral'"
            size="sm"
            class="shrink-0"
            @click="showUntagged = !showUntagged"
          />
          <UButton
            v-if="hasActiveFilters"
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="clearFilters"
          />
        </div>

        <!-- Bulk action bar -->
        <div
          v-if="tableSelectedIds.length > 0 && viewMode === 'table'"
          class="sticky top-0 z-10 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 space-y-2"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-primary-700 dark:text-primary-300 mr-2">
              {{ tableSelectedIds.length }} selected
            </span>
            <div class="flex flex-wrap gap-1.5">
              <UButton
                icon="i-heroicons-tag"
                variant="outline"
                color="neutral"
                size="xs"
                :loading="isBulkProcessing"
                @click="openBulkTagPicker('add')"
              >
                Add Tags
              </UButton>
              <UButton
                icon="i-heroicons-tag"
                variant="outline"
                color="neutral"
                size="xs"
                :loading="isBulkProcessing"
                @click="openBulkTagPicker('remove')"
              >
                Remove Tags
              </UButton>
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
                icon="i-heroicons-x-mark"
                variant="outline"
                color="error"
                size="xs"
                :loading="isBulkProcessing"
                @click="bulkAction('removeFromProject', { projectId: project?.id })"
              >
                Remove from Project
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

          <div
            v-if="isBulkTagPickerOpen"
            class="flex items-center gap-2 pt-1 border-t border-primary-200 dark:border-primary-700"
          >
            <span class="text-xs font-medium text-primary-600 dark:text-primary-400">
              {{ bulkTagMode === 'add' ? 'Add' : 'Remove' }} tags:
            </span>
            <USelectMenu
              v-model="bulkTagIds"
              :items="
                (userTags || []).map((t) => ({
                  ...t,
                  description: t.description ?? undefined,
                }))
              "
              multiple
              placeholder="Select tags..."
              value-key="id"
              label-key="name"
              class="flex-1 max-w-xs"
            >
              <template #item-leading="{ item }">
                <span
                  class="w-3 h-3 rounded-full shrink-0"
                  :style="{ backgroundColor: item.color ?? 'transparent' }"
                />
              </template>
            </USelectMenu>
            <UButton
              size="xs"
              color="primary"
              :disabled="bulkTagIds.length === 0"
              :loading="isBulkProcessing"
              @click="applyBulkTags"
            >
              Apply ({{ bulkTagIds.length }})
            </UButton>
            <UButton size="xs" variant="ghost" color="neutral" @click="isBulkTagPickerOpen = false">
              Cancel
            </UButton>
          </div>
        </div>

        <!-- Empty state -->
        <UCard v-if="entries.length === 0 && !entriesPending && !hasActiveFilters" class="py-10">
          <div class="text-center">
            <UIcon
              name="i-heroicons-book-open"
              class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
            />
            <p class="mt-2 font-medium text-gray-700 dark:text-gray-300">
              No entries in this project yet
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add a new source or pull in entries from your library.
            </p>
            <div class="flex justify-center gap-3 mt-5">
              <UButton
                icon="i-heroicons-plus-circle"
                variant="soft"
                color="primary"
                @click="quickAddToProject"
              >
                New Entry
              </UButton>
              <UButton
                icon="i-heroicons-book-open"
                variant="soft"
                color="neutral"
                @click="openAddEntryModal"
              >
                From Library
              </UButton>
            </div>
          </div>
        </UCard>

        <!-- Filtered empty state -->
        <UCard v-else-if="entries.length === 0 && hasActiveFilters" class="text-center py-10">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
          />
          <p class="mt-2 font-medium text-gray-700 dark:text-gray-300">No matching entries</p>
          <UButton
            icon="i-heroicons-x-mark"
            label="Clear filters"
            variant="outline"
            color="neutral"
            size="sm"
            class="mt-3"
            @click="clearFilters"
          />
        </UCard>

        <!-- Table view -->
        <AppEntryTable
          v-else-if="viewMode === 'table'"
          :data="entries"
          :loading="entriesPending"
          :selectable="true"
          :show-project-column="false"
          :project-id="project?.id"
          :tags="userTags ?? []"
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @update:selected-ids="(ids) => (tableSelectedIds = ids)"
          @update:sort-by="
            (v) => {
              sortBy = v
              page = 1
            }
          "
          @update:sort-order="(v) => (sortOrder = v)"
          @remove-from-project="removeEntryFromProject"
          @tag-click="
            (tagId) => {
              if (!selectedTags.includes(tagId)) {
                selectedTags.push(tagId)
                page = 1
              }
            }
          "
          @refresh="refreshEntries"
        />

        <!-- List view -->
        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li v-for="entry in entries" :key="entry.id" class="py-3 first:pt-0 last:pb-0 group">
            <div
              class="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 py-2 rounded-lg transition-colors"
            >
              <NuxtLink :to="`/app/library/${entry.id}`" class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {{ entry.title }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatAuthors(entry.authors)
                  }}{{ entry.authors?.length && entry.year ? ', ' : '' }}{{ entry.year || 'n.d.' }}
                </p>
              </NuxtLink>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                size="xs"
                class="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
                :loading="isRemovingEntry === entry.id"
                title="Remove from project"
                @click="removeEntryFromProject(entry.id)"
              />
            </div>
          </li>
        </ul>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center">
          <UPagination v-model:page="page" :items-per-page="pageSize" :total="totalEntries" />
        </div>
      </div>

      <!-- Canonical slug hint (for future) -->
      <div class="text-xs text-gray-400">
        Project URL identifier: {{ projectSlugOrId(project) }}
      </div>
    </div>

    <!-- Edit Project Modal -->
    <LazyAppProjectFormModal
      v-model:open="isEditModalOpen"
      :project="project ?? undefined"
      @updated="handleProjectUpdated"
    />

    <!-- Export Modal -->
    <LazyAppExportModal v-model:open="isExportModalOpen" :project-id="project?.id" />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-5 h-5 text-red-600 dark:text-red-400"
                />
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Delete Project</h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete
            <strong class="text-gray-900 dark:text-white">{{ project?.name }}</strong
            >? This action cannot be undone. All entries will remain in your library but will be
            removed from this project.
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="outline" color="neutral" @click="isDeleteModalOpen = false">
                Cancel
              </UButton>
              <UButton color="error" :loading="isDeleting" @click="deleteProject">
                Delete Project
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Add Entry Modal -->
    <UModal v-model:open="isAddEntryModalOpen" :ui="{ width: 'sm:max-w-3xl' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  Add Entries to Project
                </h2>
                <p v-if="availableEntries.length > 0" class="text-sm text-gray-500 mt-1">
                  {{ selectedEntryIds.size }} of {{ availableEntries.length }} selected
                </p>
              </div>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="closeAddEntryModal"
              />
            </div>
          </template>

          <div v-if="availableEntries.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-check-circle" class="w-16 h-16 mx-auto text-green-500" />
            <p class="mt-4 text-lg font-medium text-gray-900 dark:text-white">All entries added!</p>
            <p class="mt-1 text-gray-500 dark:text-gray-400">
              All your library entries are already in this project.
            </p>
            <UButton to="/app/library" variant="soft" color="primary" class="mt-6">
              Go to Library
            </UButton>
          </div>

          <div v-else class="space-y-4">
            <!-- Search bar -->
            <div class="w-full">
              <UInput
                v-model="modalSearchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search entries by title, author, or year..."
                size="lg"
                class="w-full"
              />
            </div>

            <!-- Select all -->
            <div
              class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700"
            >
              <UCheckbox
                v-model="modalAllSelected"
                :label="`Select all ${filteredAvailableEntries.length > 0 ? `(${filteredAvailableEntries.length})` : ''}`"
              />
              <UButton
                v-if="selectedEntryIds.size > 0"
                variant="ghost"
                size="xs"
                @click="selectedEntryIds.clear()"
              >
                Clear selection
              </UButton>
            </div>

            <!-- Entries list -->
            <div v-if="filteredAvailableEntries.length === 0" class="text-center py-8">
              <UIcon
                name="i-heroicons-magnifying-glass"
                class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
              />
              <p class="mt-2 text-gray-500 dark:text-gray-400">
                No entries found matching "{{ modalSearchQuery }}"
              </p>
            </div>

            <ul
              v-else
              class="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto"
            >
              <li
                v-for="entry in filteredAvailableEntries"
                :key="entry.id"
                class="py-3 first:pt-0 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 rounded-lg transition-colors cursor-pointer"
                @click="toggleEntrySelection(entry.id)"
              >
                <div class="flex items-start gap-3">
                  <UCheckbox
                    :model-value="selectedEntryIds.has(entry.id)"
                    class="mt-1"
                    @click.stop
                    @update:model-value="toggleEntrySelection(entry.id)"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ entry.title }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {{ formatAuthors(entry.authors)
                      }}{{ entry.authors?.length && entry.year ? ', ' : ''
                      }}{{ entry.year || 'n.d.' }}
                    </p>
                    <div v-if="entry.entryType" class="mt-1">
                      <UBadge size="xs" variant="subtle" color="neutral">
                        {{ entry.entryType.replace(/_/g, ' ') }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <template v-if="availableEntries.length > 0" #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="outline" color="neutral" @click="closeAddEntryModal">
                Cancel
              </UButton>
              <UButton
                :disabled="selectedEntryIds.size === 0"
                :loading="isAddingEntries"
                @click="addSelectedEntriesToProject"
              >
                Add
                {{ selectedEntryIds.size > 0 ? `(${selectedEntryIds.size})` : '' }}
                {{ selectedEntryIds.size === 1 ? 'Entry' : 'Entries' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Tag Insights Slideover -->
    <USlideover v-model:open="isTagInsightsOpen">
      <template #content>
        <div class="flex flex-col h-full">
          <div
            class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
          >
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Tag Insights</h2>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              @click="isTagInsightsOpen = false"
            />
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <LazyAppTagAnalytics
              v-if="project?.id"
              :tags="userTags || []"
              :project-id="project.id"
              @select-tag="handleInsightsTagClick"
              @select-tag-pair="handleInsightsTagPairClick"
              @select-untagged="handleInsightsUntagged"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
