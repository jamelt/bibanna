<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const stats = ref([
  { label: 'Total Entries', value: 0, icon: 'i-heroicons-book-open' },
  { label: 'Projects', value: 0, icon: 'i-heroicons-folder' },
  { label: 'Annotations', value: 0, icon: 'i-heroicons-pencil-square' },
  { label: 'Tags', value: 0, icon: 'i-heroicons-tag' },
])

const recentEntries = ref<any[]>([])
const recentProjects = ref<any[]>([])

function projectSlugOrId(project: any) {
  return project.slug || project.id
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Dashboard
      </h1>
      <p class="text-gray-500 dark:text-gray-400">
        Welcome back! Here's an overview of your research.
      </p>
    </div>

    <!-- Stats grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard
        v-for="stat in stats"
        :key="stat.label"
        class="p-4"
      >
        <div class="flex items-center gap-4">
          <div class="shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
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
    </div>

    <!-- Quick actions -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h2>
      </template>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UButton
          icon="i-heroicons-plus"
          label="Add Entry"
          variant="outline"
          color="neutral"
          block
        />
        <UButton
          icon="i-heroicons-folder-plus"
          label="New Project"
          variant="outline"
          color="neutral"
          block
        />
        <UButton
          icon="i-heroicons-arrow-up-tray"
          label="Import"
          variant="outline"
          color="neutral"
          block
        />
        <UButton
          icon="i-heroicons-arrow-down-tray"
          label="Export"
          variant="outline"
          color="neutral"
          block
        />
      </div>
    </UCard>

    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recent entries -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Entries
            </h2>
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

        <div v-if="recentEntries.length === 0" class="text-center py-8">
          <UIcon name="i-heroicons-book-open" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
          <p class="mt-2 text-gray-500 dark:text-gray-400">
            No entries yet
          </p>
          <UButton
            to="/app/library"
            variant="soft"
            color="primary"
            class="mt-4"
          >
            Add Your First Entry
          </UButton>
        </div>

        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li
            v-for="entry in recentEntries"
            :key="entry.id"
            class="py-3 first:pt-0 last:pb-0"
          >
            <NuxtLink
              :to="`/app/library/${entry.id}`"
              class="block hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 py-2 rounded-lg transition-colors"
            >
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ entry.title }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ entry.authors }} &middot; {{ entry.year }}
              </p>
            </NuxtLink>
          </li>
        </ul>
      </UCard>

      <!-- Recent projects -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Projects
            </h2>
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

        <div v-if="recentProjects.length === 0" class="text-center py-8">
          <UIcon name="i-heroicons-folder" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
          <p class="mt-2 text-gray-500 dark:text-gray-400">
            No projects yet
          </p>
          <UButton
            to="/app/projects"
            variant="soft"
            color="primary"
            class="mt-4"
          >
            Create Your First Project
          </UButton>
        </div>

        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li
            v-for="project in recentProjects"
            :key="project.id"
            class="py-3 first:pt-0 last:pb-0"
          >
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
  </div>
</template>
