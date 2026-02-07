<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Project } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const router = useRouter()
const toast = useToast()
const { toggleStar } = useStarredProjects()

const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedProject = ref<Project | undefined>()
const showArchived = ref(false)
const isDeleting = ref(false)
const viewMode = useViewPreferences<'grid' | 'table'>('projects', 'grid')

const { data: projects, pending, refresh } = await useFetch<Project[]>('/api/projects', {
  query: computed(() => ({
    includeArchived: showArchived.value ? 'true' : undefined,
  })),
  watch: [showArchived],
})

const activeProjects = computed(() =>
  (projects.value || []).filter(p => !p.isArchived),
)

const archivedProjects = computed(() =>
  (projects.value || []).filter(p => p.isArchived),
)

async function handleProjectCreated() {
  await refresh()
  isCreateModalOpen.value = false
}

async function handleProjectUpdated() {
  await refresh()
  isEditModalOpen.value = false
  selectedProject.value = undefined
}

function projectSlugOrId(project: Project) {
  return project.slug || project.id
}

function openEditModal(project: Project) {
  selectedProject.value = project
  isEditModalOpen.value = true
}

function openDeleteModal(project: Project) {
  selectedProject.value = project
  isDeleteModalOpen.value = true
}

async function toggleArchive(project: Project) {
  try {
    await $fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      body: { isArchived: !project.isArchived },
    })
    toast.add({
      title: project.isArchived ? 'Project restored' : 'Project archived',
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
  if (!selectedProject.value) return

  isDeleting.value = true
  try {
    await $fetch(`/api/projects/${selectedProject.value.id}`, {
      method: 'DELETE',
    })
    toast.add({
      title: 'Project deleted',
      color: 'success',
    })
    isDeleteModalOpen.value = false
    selectedProject.value = undefined
    await refresh()
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

async function handleToggleStar(project: Project) {
  try {
    const result = await toggleStar(project.id)
    project.isStarred = result.isStarred
    toast.add({
      title: result.isStarred ? 'Project starred' : 'Project unstarred',
      color: 'success',
    })
  }
  catch {
    toast.add({
      title: 'Failed to update project',
      color: 'error',
    })
  }
}

function getDropdownItems(project: Project) {
  return [
    [
      {
        label: project.isStarred ? 'Unstar' : 'Star',
        icon: project.isStarred ? 'i-heroicons-star-solid' : 'i-heroicons-star',
        onSelect: () => handleToggleStar(project),
      },
      { label: 'Edit', icon: 'i-heroicons-pencil', onSelect: () => openEditModal(project) },
      { label: 'Share', icon: 'i-heroicons-share', onSelect: () => router.push(`/app/projects/${projectSlugOrId(project)}?share=true`) },
      { label: 'Export', icon: 'i-heroicons-arrow-down-tray', onSelect: () => router.push(`/app/projects/${projectSlugOrId(project)}?export=true`) },
    ],
    [
      {
        label: project.isArchived ? 'Restore' : 'Archive',
        icon: project.isArchived ? 'i-heroicons-arrow-uturn-up' : 'i-heroicons-archive-box',
        onSelect: () => toggleArchive(project),
      },
      { label: 'Delete', icon: 'i-heroicons-trash', color: 'error' as const, onSelect: () => openDeleteModal(project) },
    ],
  ]
}

const UButton = resolveComponent('UButton')
const UIcon = resolveComponent('UIcon')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function formatProjectDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const projectColumns = computed<TableColumn<Project>[]>(() => [
  {
    id: 'color',
    header: '',
    cell: ({ row }) => {
      const project = row.original
      return h('div', {
        class: 'w-8 h-8 rounded-lg flex items-center justify-center',
        style: { backgroundColor: (project.color || '#4F46E5') + '20' },
      }, [
        h(UIcon, {
          name: project.isArchived ? 'i-heroicons-archive-box' : 'i-heroicons-folder',
          class: 'w-4 h-4',
          style: { color: project.isArchived ? '#9ca3af' : (project.color || '#4F46E5') },
        }),
      ])
    },
    meta: { class: { th: 'w-12', td: 'w-12' } },
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const project = row.original
      return h('div', { class: 'min-w-0' }, [
        h('p', {
          class: 'font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400',
          onClick: (e: Event) => {
            e.stopPropagation()
            router.push(`/app/projects/${projectSlugOrId(project)}`)
          },
        }, project.name),
        project.description
          ? h('p', { class: 'text-xs text-gray-500 dark:text-gray-400 truncate max-w-sm mt-0.5' }, project.description)
          : null,
      ])
    },
  },
  {
    id: 'star',
    header: '',
    cell: ({ row }) => {
      const project = row.original
      return h(UButton, {
        icon: project.isStarred ? 'i-heroicons-star-solid' : 'i-heroicons-star',
        variant: 'ghost',
        color: 'neutral',
        size: 'xs',
        class: project.isStarred ? 'text-amber-400' : 'text-gray-400 hover:text-amber-300',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleToggleStar(project)
        },
      })
    },
    meta: { class: { th: 'w-10', td: 'w-10' } },
  },
  {
    id: 'entryCount',
    header: 'Entries',
    cell: ({ row }) => {
      return h('span', {
        class: 'text-sm text-gray-600 dark:text-gray-400 tabular-nums',
      }, String(row.original.entryCount ?? 0))
    },
    meta: { class: { th: 'w-20', td: 'w-20' } },
  },
  {
    id: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      return h('span', {
        class: 'text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap',
      }, formatProjectDate(row.original.createdAt))
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      return h(UDropdownMenu, {
        content: { align: 'end' },
        items: getDropdownItems(row.original),
        'aria-label': 'Project actions',
      }, () =>
        h(UButton, {
          icon: 'i-heroicons-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          onClick: (e: Event) => e.stopPropagation(),
        }),
      )
    },
    meta: { class: { th: 'w-10', td: 'w-10 text-right' } },
  },
])
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Projects
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Organize your research into focused collections
        </p>
      </div>

      <div class="flex gap-2">
        <UFieldGroup>
          <UButton
            icon="i-heroicons-squares-2x2"
            :variant="viewMode === 'grid' ? 'solid' : 'outline'"
            color="neutral"
            @click="viewMode = 'grid'"
          />
          <UButton
            icon="i-heroicons-table-cells"
            :variant="viewMode === 'table' ? 'solid' : 'outline'"
            color="neutral"
            @click="viewMode = 'table'"
          />
        </UFieldGroup>
        <UButton
          icon="i-heroicons-plus"
          label="New Project"
          color="primary"
          @click="isCreateModalOpen = true"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty state -->
    <UCard v-else-if="!projects?.length" class="text-center py-12">
      <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No projects yet
      </h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Create your first project to start organizing your research
      </p>
      <UButton
        icon="i-heroicons-plus"
        label="Create Project"
        color="primary"
        class="mt-4"
        @click="isCreateModalOpen = true"
      />
    </UCard>

    <!-- Projects table view -->
    <template v-else-if="viewMode === 'table'">
      <UTable
        :data="activeProjects"
        :columns="projectColumns"
        :loading="pending"
        sticky
        class="w-full"
        :ui="{
          root: 'min-w-full',
          tr: 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
          td: 'py-2.5 px-3 text-sm',
          th: 'py-2.5 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        }"
      >
        <template #empty>
          <div class="text-center py-6 text-sm text-gray-500">
            No active projects
          </div>
        </template>
      </UTable>

      <div v-if="archivedProjects.length > 0" class="mt-6">
        <UButton
          :icon="showArchived ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="showArchived = !showArchived"
        >
          Archived ({{ archivedProjects.length }})
        </UButton>

        <UTable
          v-if="showArchived"
          :data="archivedProjects"
          :columns="projectColumns"
          class="w-full mt-3 opacity-70"
          :ui="{
            root: 'min-w-full',
            tr: 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
            td: 'py-2.5 px-3 text-sm',
            th: 'py-2.5 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
          }"
        />
      </div>
    </template>

    <!-- Projects grid view -->
    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="project in activeProjects"
          :key="project.id"
          class="p-4 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
          @click="router.push(`/app/projects/${projectSlugOrId(project)}`)"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              :style="{ backgroundColor: project.color + '20' }"
            >
              <UIcon
                name="i-heroicons-folder"
                class="w-5 h-5"
                :style="{ color: project.color }"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <h3 class="font-medium text-gray-900 dark:text-white truncate">
                  {{ project.name }}
                </h3>
                <UIcon
                  v-if="project.isStarred"
                  name="i-heroicons-star-solid"
                  class="w-4 h-4 text-amber-400 shrink-0"
                />
              </div>
              <p v-if="project.description" class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                {{ project.description }}
              </p>
              <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
                {{ project.entryCount }} {{ project.entryCount === 1 ? 'entry' : 'entries' }}
              </p>
            </div>
            <UDropdownMenu
              :items="getDropdownItems(project)"
              :content="{ side: 'bottom', align: 'end' }"
            >
              <UButton
                icon="i-heroicons-ellipsis-vertical"
                variant="ghost"
                color="neutral"
                size="sm"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop
              />
            </UDropdownMenu>
          </div>
        </UCard>
      </div>

      <!-- Archived projects -->
      <div v-if="archivedProjects.length > 0" class="mt-8">
        <UButton
          :icon="showArchived ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="showArchived = !showArchived"
        >
          Archived ({{ archivedProjects.length }})
        </UButton>

        <div v-if="showArchived" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <UCard
            v-for="project in archivedProjects"
            :key="project.id"
            class="p-4 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group"
            @click="router.push(`/app/projects/${projectSlugOrId(project)}`)"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <UIcon name="i-heroicons-archive-box" class="w-5 h-5 text-gray-400" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-900 dark:text-white truncate">
                  {{ project.name }}
                </h3>
                <p class="text-sm text-gray-400 mt-1">
                  {{ project.entryCount }} entries
                </p>
              </div>
              <UDropdownMenu
                :items="getDropdownItems(project)"
                :content="{ side: 'bottom', align: 'end' }"
              >
                <UButton
                  icon="i-heroicons-ellipsis-vertical"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop
                />
              </UDropdownMenu>
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <!-- Create Project Modal -->
    <LazyAppProjectFormModal
      v-model:open="isCreateModalOpen"
      @created="handleProjectCreated"
    />

    <!-- Edit Project Modal -->
    <LazyAppProjectFormModal
      v-model:open="isEditModalOpen"
      :project="selectedProject"
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
            Are you sure you want to delete <strong class="text-gray-900 dark:text-white">{{ selectedProject?.name }}</strong>?
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
  </div>
</template>
