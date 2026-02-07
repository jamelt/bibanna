<script setup lang="ts">
import type { Project, Entry } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const projectIdentifier = computed(() => route.params.id as string)

const { data: project, pending, refresh } = await useFetch<Project & { entries?: any[]; entryCount?: number }>(
  () => `/api/projects/${projectIdentifier.value}`,
)

const entries = computed(() => project.value?.entries ?? [])

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isAddEntryModalOpen = ref(false)
const isDeleting = ref(false)
const isRemovingEntry = ref<string | null>(null)

const { data: libraryEntries } = await useFetch<{ data: Entry[]; total: number }>('/api/entries', {
  query: { pageSize: 100 },
  lazy: true,
})

const availableEntries = computed(() => {
  if (!libraryEntries.value?.data) return []
  const projectEntryIds = new Set(entries.value.map((e: any) => e.id))
  return libraryEntries.value.data.filter(e => !projectEntryIds.has(e.id))
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

async function addEntryToProject(entryId: string) {
  if (!project.value) return
  try {
    await $fetch(`/api/projects/${project.value.id}/entries`, {
      method: 'POST',
      body: { entryId },
    })
    toast.add({
      title: 'Entry added to project',
      color: 'success',
    })
    isAddEntryModalOpen.value = false
    await refresh()
  }
  catch (e: any) {
    toast.add({
      title: 'Failed to add entry',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
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
          <UDropdown
            :items="[
              [
                { label: 'Edit', icon: 'i-heroicons-pencil', click: () => isEditModalOpen = true },
                { label: 'Export', icon: 'i-heroicons-arrow-down-tray', click: () => {} },
              ],
              [
                {
                  label: project?.isArchived ? 'Restore' : 'Archive',
                  icon: project?.isArchived ? 'i-heroicons-arrow-uturn-up' : 'i-heroicons-archive-box',
                  click: toggleArchive,
                },
                { label: 'Delete', icon: 'i-heroicons-trash', color: 'error' as const, click: () => isDeleteModalOpen = true },
              ],
            ]"
          >
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              variant="outline"
              color="neutral"
            />
          </UDropdown>
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
                @click="isAddEntryModalOpen = true"
              >
                Add Entry
              </UButton>
            </div>
          </div>
        </template>

        <div v-if="entries.length === 0" class="text-center py-10">
          <UIcon name="i-heroicons-book-open" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
          <p class="mt-2 text-gray-500 dark:text-gray-400">
            No entries have been added to this project yet.
          </p>
          <UButton
            icon="i-heroicons-plus"
            variant="soft"
            color="primary"
            class="mt-4"
            @click="isAddEntryModalOpen = true"
          >
            Add from Library
          </UButton>
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
    <UModal v-model:open="isAddEntryModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Add Entry to Project
              </h2>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                color="neutral"
                @click="isAddEntryModalOpen = false"
              />
            </div>
          </template>

          <div v-if="availableEntries.length === 0" class="text-center py-8">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 mx-auto text-green-500" />
            <p class="mt-2 text-gray-500 dark:text-gray-400">
              All your library entries are already in this project!
            </p>
            <UButton
              to="/app/library"
              variant="soft"
              color="primary"
              class="mt-4"
            >
              Go to Library
            </UButton>
          </div>

          <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            <li
              v-for="entry in availableEntries"
              :key="entry.id"
              class="py-3 first:pt-0 last:pb-0"
            >
              <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">
                    {{ entry.title }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ formatAuthors(entry.authors) }}{{ entry.authors?.length && entry.year ? ', ' : '' }}{{ entry.year || 'n.d.' }}
                  </p>
                </div>
                <UButton
                  icon="i-heroicons-plus"
                  size="sm"
                  variant="soft"
                  @click="addEntryToProject(entry.id)"
                >
                  Add
                </UButton>
              </div>
            </li>
          </ul>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

