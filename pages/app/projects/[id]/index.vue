<script setup lang="ts">
import type { Project, Entry } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { open: openQuickAdd } = useQuickAdd()
const { onEntryCreated } = useEntryEvents()

const projectIdentifier = computed(() => route.params.id as string)

const { data: project, pending, refresh } = await useFetch<Project & { entries?: any[]; entryCount?: number }>(
  () => `/api/projects/${projectIdentifier.value}`,
)

const entries = computed(() => project.value?.entries ?? [])

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isExportModalOpen = ref(false)
const isAddEntryModalOpen = ref(false)
const isDeleting = ref(false)
const isRemovingEntry = ref<string | null>(null)
const isAddingEntries = ref(false)
const selectedEntryIds = ref<Set<string>>(new Set())
const searchQuery = ref('')

const { data: libraryEntries } = await useFetch<{ data: Entry[]; total: number }>('/api/entries', {
  query: { pageSize: 100 },
  lazy: true,
})

const availableEntries = computed(() => {
  if (!libraryEntries.value?.data) return []
  const projectEntryIds = new Set(entries.value.map((e: any) => e.id))
  return libraryEntries.value.data.filter(e => !projectEntryIds.has(e.id))
})

const filteredAvailableEntries = computed(() => {
  if (!searchQuery.value) return availableEntries.value

  const query = searchQuery.value.toLowerCase()
  return availableEntries.value.filter(entry => {
    const titleMatch = entry.title?.toLowerCase().includes(query)
    const authorsMatch = entry.authors?.some((a: any) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(query)
    )
    const yearMatch = entry.year?.toString().includes(query)
    return titleMatch || authorsMatch || yearMatch
  })
})

const allSelected = computed({
  get: () => filteredAvailableEntries.value.length > 0 && filteredAvailableEntries.value.every(e => selectedEntryIds.value.has(e.id)),
  set: (value: boolean) => {
    if (value) {
      filteredAvailableEntries.value.forEach(e => selectedEntryIds.value.add(e.id))
    } else {
      filteredAvailableEntries.value.forEach(e => selectedEntryIds.value.delete(e.id))
    }
  }
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
  }
  catch (e: any) {
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
  }
  catch (e: any) {
    toast.add({
      title: 'Failed to delete project',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  }
  finally {
    isDeleting.value = false
  }
}

async function addSelectedEntriesToProject() {
  if (!project.value || selectedEntryIds.value.size === 0) return

  isAddingEntries.value = true
  try {
    await Promise.all(
      Array.from(selectedEntryIds.value).map(entryId =>
        $fetch(`/api/projects/${project.value.id}/entries`, {
          method: 'POST',
          body: { entryId },
        })
      )
    )

    const count = selectedEntryIds.value.size
    toast.add({
      title: `${count} ${count === 1 ? 'entry' : 'entries'} added to project`,
      color: 'success',
    })

    closeAddEntryModal()
    await refresh()
  }
  catch (e: any) {
    toast.add({
      title: 'Failed to add entries',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  }
  finally {
    isAddingEntries.value = false
  }
}

function quickAddToProject() {
  if (!project.value) return
  openQuickAdd(project.value.id)
}

function openAddEntryModal() {
  selectedEntryIds.value.clear()
  searchQuery.value = ''
  isAddEntryModalOpen.value = true
}

function closeAddEntryModal() {
  selectedEntryIds.value.clear()
  searchQuery.value = ''
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
  }
  catch (e: any) {
    toast.add({
      title: 'Failed to remove entry',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  }
  finally {
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
      <h2 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        Project not found
      </h2>
      <UButton to="/app/projects" class="mt-4">
        Back to Projects
      </UButton>
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

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: (project.color || '#4F46E5') + '20' }"
          >
            <UIcon
              name="i-heroicons-folder"
              class="w-5 h-5"
              :style="{ color: project.color || '#4F46E5' }"
            />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ project.name }}
            </h1>
            <p v-if="project.description" class="text-gray-500 dark:text-gray-400 mt-1">
              {{ project.description }}
            </p>
            <p class="text-sm text-gray-400 mt-1">
              {{ project.entryCount || 0 }} {{ (project.entryCount || 0) === 1 ? 'entry' : 'entries' }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            icon="i-heroicons-sparkles"
            variant="outline"
            color="primary"
            @click="openCompanion"
          >
            Research Companion
          </UButton>
          <UButton
            icon="i-heroicons-share"
            variant="outline"
            color="neutral"
            @click="openMindMap"
          >
            Mind Map
          </UButton>
          <UDropdownMenu
            :items="[
              [
                { label: 'Edit', icon: 'i-heroicons-pencil', onSelect: () => isEditModalOpen = true },
                { label: 'Export', icon: 'i-heroicons-arrow-down-tray', onSelect: () => isExportModalOpen.value = true },
              ],
              [
                {
                  label: project?.isArchived ? 'Restore' : 'Archive',
                  icon: project?.isArchived ? 'i-heroicons-arrow-uturn-up' : 'i-heroicons-archive-box',
                  onSelect: toggleArchive,
                },
                { label: 'Delete', icon: 'i-heroicons-trash', color: 'error' as const, onSelect: () => isDeleteModalOpen = true },
              ],
            ]"
          >
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              variant="outline"
              color="neutral"
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Entries list -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Entries
            </h2>
            <div class="flex gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                icon="i-heroicons-arrow-path"
                @click="refresh"
              >
                Refresh
              </UButton>
              <UButton
                icon="i-heroicons-plus"
                size="sm"
                @click="quickAddToProject"
              >
                New Entry
              </UButton>
              <UButton
                icon="i-heroicons-book-open"
                size="sm"
                variant="outline"
                color="neutral"
                @click="openAddEntryModal"
              >
                From Library
              </UButton>
            </div>
          </div>
        </template>

        <div v-if="entries.length === 0" class="text-center py-10">
          <UIcon name="i-heroicons-book-open" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
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

        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li
            v-for="entry in entries"
            :key="entry.id"
            class="py-3 first:pt-0 last:pb-0 group"
          >
            <div class="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 py-2 rounded-lg transition-colors">
              <NuxtLink
                :to="`/app/library/${entry.id}`"
                class="flex-1 min-w-0"
              >
                <p class="font-medium text-gray-900 dark:text-white truncate">
                  {{ entry.title }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatAuthors(entry.authors) }}{{ entry.authors?.length && entry.year ? ', ' : '' }}{{ entry.year || 'n.d.' }}
                </p>
              </NuxtLink>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                size="xs"
                class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                :loading="isRemovingEntry === entry.id"
                title="Remove from project"
                @click="removeEntryFromProject(entry.id)"
              />
            </div>
          </li>
        </ul>
      </UCard>

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
    <LazyAppExportModal
      v-model:open="isExportModalOpen"
      :project-id="project?.id"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Project
              </h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong class="text-gray-900 dark:text-white">{{ project?.name }}</strong>?
            This action cannot be undone. All entries will remain in your library but will be removed from this project.
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
                @click="deleteProject"
              >
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
            <p class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              All entries added!
            </p>
            <p class="mt-1 text-gray-500 dark:text-gray-400">
              All your library entries are already in this project.
            </p>
            <UButton
              to="/app/library"
              variant="soft"
              color="primary"
              class="mt-6"
            >
              Go to Library
            </UButton>
          </div>

          <div v-else class="space-y-4">
            <!-- Search bar -->
            <div class="w-full">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search entries by title, author, or year..."
                size="lg"
                class="w-full"
              />
            </div>

            <!-- Select all -->
            <div class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <UCheckbox
                v-model="allSelected"
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
              <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p class="mt-2 text-gray-500 dark:text-gray-400">
                No entries found matching "{{ searchQuery }}"
              </p>
            </div>

            <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
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
                      {{ formatAuthors(entry.authors) }}{{ entry.authors?.length && entry.year ? ', ' : '' }}{{ entry.year || 'n.d.' }}
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
              <UButton
                variant="outline"
                color="neutral"
                @click="closeAddEntryModal"
              >
                Cancel
              </UButton>
              <UButton
                :disabled="selectedEntryIds.size === 0"
                :loading="isAddingEntries"
                @click="addSelectedEntriesToProject"
              >
                Add {{ selectedEntryIds.size > 0 ? `(${selectedEntryIds.size})` : '' }} {{ selectedEntryIds.size === 1 ? 'Entry' : 'Entries' }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

