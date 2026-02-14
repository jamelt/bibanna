<script setup lang="ts">
import type { Project } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { hasFeature } = useSubscription()

const { data: projects, pending } = await useFetch<{ items: Project[]; total: number }>(
  '/api/projects',
  {
    query: { pageSize: 50 },
  },
)

const projectsWithEntries = computed(() => {
  if (!projects.value?.items) return []
  return projects.value.items.filter((p) => (p.entryCount ?? 0) > 0 && !p.isArchived)
})

const emptyProjects = computed(() => {
  if (!projects.value?.items) return []
  return projects.value.items.filter((p) => (p.entryCount ?? 0) === 0 && !p.isArchived)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mind Maps</h1>
        <p class="mt-1 text-gray-500">
          Visualize relationships between your sources, authors, and topics
        </p>
      </div>
    </div>

    <!-- Upgrade prompt for free users -->
    <UCard
      v-if="!hasFeature('mindMaps')"
      class="bg-linear-to-r from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border-primary-200 dark:border-primary-800"
    >
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div
          class="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0"
        >
          <UIcon name="i-heroicons-share" class="w-10 h-10 text-primary-600" />
        </div>
        <div class="flex-1 text-center md:text-left">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Unlock Mind Map Visualization
          </h2>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Upgrade to Light or Pro to visualize your research with interactive mind maps. See
            connections between entries, authors, and topics at a glance.
          </p>
          <div class="mt-4">
            <UButton to="/app/subscription" color="primary"> Upgrade Now </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Loading -->
    <div v-else-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Projects with entries -->
    <div v-else-if="projectsWithEntries.length > 0" class="space-y-4">
      <h2 class="text-lg font-medium text-gray-900 dark:text-white">
        Select a project to view its mind map
      </h2>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="project in projectsWithEntries"
          :key="project.id"
          :to="`/app/projects/${project.id}/mindmap`"
          class="group"
        >
          <UCard
            :ui="{ body: { padding: 'p-4' } }"
            class="h-full transition-all hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                :style="{ backgroundColor: (project.color || '#4F46E5') + '20' }"
              >
                <UIcon
                  name="i-heroicons-share"
                  class="w-5 h-5"
                  :style="{ color: project.color || '#4F46E5' }"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3
                  class="font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600"
                >
                  {{ project.name }}
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  {{ project.entryCount }} {{ project.entryCount === 1 ? 'entry' : 'entries' }}
                </p>
                <p v-if="project.description" class="text-sm text-gray-400 mt-1 line-clamp-2">
                  {{ project.description }}
                </p>
              </div>
              <UIcon
                name="i-heroicons-arrow-right"
                class="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors shrink-0"
              />
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </div>

    <!-- No projects with entries -->
    <UCard v-else class="text-center py-12">
      <UIcon
        name="i-heroicons-folder-open"
        class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600"
      />
      <h2 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No projects with entries yet
      </h2>
      <p class="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Create a project and add some entries to start visualizing your research with mind maps.
      </p>
      <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <UButton to="/app/projects" variant="outline"> View Projects </UButton>
        <UButton to="/app/library" color="primary"> Go to Library </UButton>
      </div>
    </UCard>

    <!-- Projects without entries -->
    <div v-if="hasFeature('mindMaps') && emptyProjects.length > 0" class="pt-4">
      <h3 class="text-sm font-medium text-gray-500 mb-3">
        Projects without entries (add entries to enable mind map)
      </h3>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="project in emptyProjects"
          :key="project.id"
          :to="`/app/projects/${project.id}`"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <div
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: project.color || '#4F46E5' }"
          />
          {{ project.name }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
