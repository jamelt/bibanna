<script setup lang="ts">
import type { Project } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const router = useRouter()
const isCreateModalOpen = ref(false)
const showArchived = ref(false)

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
  isCreateModalOpen.value = false
  await refresh()
}
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

      <UButton
        icon="i-heroicons-plus"
        label="New Project"
        color="primary"
        @click="isCreateModalOpen = true"
      />
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

    <!-- Projects grid -->
    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="project in activeProjects"
          :key="project.id"
          class="p-4 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
          @click="router.push(`/app/projects/${project.id}`)"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              :style="{ backgroundColor: project.color + '20' }"
            >
              <UIcon
                name="i-heroicons-folder"
                class="w-5 h-5"
                :style="{ color: project.color }"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 dark:text-white truncate">
                {{ project.name }}
              </h3>
              <p v-if="project.description" class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                {{ project.description }}
              </p>
              <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
                {{ project.entryCount }} {{ project.entryCount === 1 ? 'entry' : 'entries' }}
              </p>
            </div>
            <UDropdown
              :items="[
                [
                  { label: 'Edit', icon: 'i-heroicons-pencil', onClick: () => {} },
                  { label: 'Share', icon: 'i-heroicons-share', onClick: () => {} },
                  { label: 'Export', icon: 'i-heroicons-arrow-down-tray', onClick: () => {} },
                ],
                [
                  { label: 'Archive', icon: 'i-heroicons-archive-box', onClick: () => {} },
                ],
              ]"
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
            </UDropdown>
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
            class="p-4 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
            @click="router.push(`/app/projects/${project.id}`)"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
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
  </div>
</template>
