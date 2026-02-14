<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const router = useRouter()
const { open: openQuickAdd } = useQuickAdd()

const isCreateProjectOpen = ref(false)
const isExportModalOpen = ref(false)
const isImportModalOpen = ref(false)

const { data: entriesData } = await useFetch('/api/entries', {
  query: { page: 1, pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' },
})

const { data: projectsData } = await useFetch('/api/projects')

const { data: tagsData } = await useFetch('/api/tags')

const { data: annotationsData } = await useFetch('/api/annotations', {
  query: { page: 1, pageSize: 1 },
})

const stats = computed(() => {
  const totalEntries = entriesData.value?.total || 0
  const totalProjects = projectsData.value?.length || 0
  const totalAnnotations = annotationsData.value?.total || 0
  const totalTags = tagsData.value?.length || 0

  return [
    {
      label: 'Total Entries',
      value: totalEntries,
      icon: 'i-heroicons-book-open',
      to: '/app/library',
    },
    { label: 'Projects', value: totalProjects, icon: 'i-heroicons-folder', to: '/app/projects' },
    {
      label: 'Annotations',
      value: totalAnnotations,
      icon: 'i-heroicons-pencil-square',
      to: '/app/annotations',
    },
    { label: 'Tags', value: totalTags, icon: 'i-heroicons-tag', to: '/app/tags' },
  ]
})

const recentEntries = computed(() => entriesData.value?.data || [])
const recentProjects = computed(() => (projectsData.value || []).slice(0, 5))

function projectSlugOrId(project: any) {
  return project.slug || project.id
}

function formatAuthors(authors: any[]) {
  if (!authors || authors.length === 0) return 'Unknown Author'
  return authors
    .map((a: any) => `${a.lastName}, ${a.firstName}${a.middleName ? ` ${a.middleName}` : ''}`)
    .join('; ')
}

async function handleProjectCreated() {
  isCreateProjectOpen.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p class="text-gray-500 dark:text-gray-400">
        Welcome back! Here's an overview of your research.
      </p>
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink v-for="stat in stats" :key="stat.label" :to="stat.to" class="group">
        <UCard
          class="h-full p-4 transition-shadow duration-200 group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary-200 dark:group-hover:ring-primary-800 cursor-pointer"
        >
          <div
            class="flex flex-col items-center justify-center text-center h-full min-h-[120px] gap-3"
          >
            <div
              class="shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center"
            >
              <UIcon :name="stat.icon" class="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stat.value }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ stat.label }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Quick actions -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
      </template>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UButton
          icon="i-heroicons-plus"
          label="Add Entry"
          variant="outline"
          color="neutral"
          block
          data-testid="dashboard-quick-action-add-entry"
          @click="openQuickAdd"
        />
        <UButton
          icon="i-heroicons-folder-plus"
          label="New Project"
          variant="outline"
          color="neutral"
          block
          data-testid="dashboard-quick-action-new-project"
          @click="isCreateProjectOpen = true"
        />
        <UButton
          icon="i-heroicons-arrow-up-tray"
          label="Import"
          variant="outline"
          color="neutral"
          block
          data-testid="dashboard-quick-action-import"
          @click="isImportModalOpen = true"
        />
        <UButton
          icon="i-heroicons-arrow-down-tray"
          label="Export"
          variant="outline"
          color="neutral"
          block
          data-testid="dashboard-quick-action-export"
          @click="isExportModalOpen = true"
        />
      </div>
    </UCard>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recent entries -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Entries</h2>
            <UButton
              to="/app/library"
              variant="ghost"
              color="neutral"
              size="sm"
              trailing-icon="i-heroicons-arrow-right"
            >
              View All
            </UButton>
          </div>
        </template>

        <div v-if="recentEntries.length === 0" class="text-center py-8 space-y-3">
          <UIcon
            name="i-heroicons-book-open"
            class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
          />
          <div>
            <p class="font-medium text-gray-700 dark:text-gray-300">No entries yet</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Use Quick Add (<kbd
                class="px-1 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded"
                >{{ navigator?.platform?.includes('Mac') ? '⌘' : 'Ctrl' }}+K</kbd
              >) to add your first source.
            </p>
          </div>
          <div class="flex justify-center gap-2">
            <UButton
              icon="i-heroicons-plus"
              variant="soft"
              color="primary"
              size="sm"
              @click="openQuickAdd()"
            >
              Quick Add
            </UButton>
            <UButton
              icon="i-heroicons-arrow-up-tray"
              variant="soft"
              color="neutral"
              size="sm"
              @click="isImportModalOpen = true"
            >
              Import
            </UButton>
          </div>
        </div>

        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li v-for="entry in recentEntries" :key="entry.id" class="py-3 first:pt-0 last:pb-0">
            <NuxtLink
              :to="`/app/library/${entry.id}`"
              class="block hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 py-2 rounded-lg transition-colors"
            >
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ entry.title }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ formatAuthors(entry.authors) }}{{ entry.year ? ` · ${entry.year}` : '' }}
              </p>
            </NuxtLink>
          </li>
        </ul>
      </UCard>

      <!-- Recent projects -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Projects</h2>
            <UButton
              to="/app/projects"
              variant="ghost"
              color="neutral"
              size="sm"
              trailing-icon="i-heroicons-arrow-right"
            >
              View All
            </UButton>
          </div>
        </template>

        <div v-if="recentProjects.length === 0" class="text-center py-8 space-y-3">
          <UIcon
            name="i-heroicons-folder"
            class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
          />
          <div>
            <p class="font-medium text-gray-700 dark:text-gray-300">No projects yet</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Projects let you group related entries for a class, paper, or research topic.
            </p>
          </div>
          <UButton
            icon="i-heroicons-folder-plus"
            variant="soft"
            color="primary"
            size="sm"
            @click="isCreateProjectOpen = true"
          >
            Create a project
          </UButton>
        </div>

        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li v-for="project in recentProjects" :key="project.id" class="py-3 first:pt-0 last:pb-0">
            <NuxtLink
              :to="`/app/projects/${projectSlugOrId(project)}`"
              class="block hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 py-2 rounded-lg transition-colors"
            >
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ project.name }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ project.entryCount }} entries
              </p>
            </NuxtLink>
          </li>
        </ul>
      </UCard>
    </div>

    <LazyAppProjectFormModal v-model:open="isCreateProjectOpen" @created="handleProjectCreated" />

    <LazyAppExportModal v-model:open="isExportModalOpen" />

    <LazyAppImportModal v-model:open="isImportModalOpen" @imported="router.push('/app/library')" />
  </div>
</template>
