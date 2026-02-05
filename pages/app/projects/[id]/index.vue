<script setup lang="ts">
import type { Project } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()

const projectIdentifier = computed(() => route.params.id as string)

const { data: project, pending, refresh } = await useFetch<Project & { entries?: any[]; entryCount?: number }>(
  () => `/api/projects/${projectIdentifier.value}`,
)

const entries = computed(() => project.value?.entries ?? [])

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
        </div>
      </div>

      <!-- Entries list -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Entries
            </h2>
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-heroicons-arrow-path"
              @click="refresh"
            >
              Refresh
            </UButton>
          </div>
        </template>

        <div v-if="entries.length === 0" class="text-center py-10">
          <UIcon name="i-heroicons-book-open" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
          <p class="mt-2 text-gray-500 dark:text-gray-400">
            No entries have been added to this project yet.
          </p>
          <UButton
            to="/app/library"
            variant="soft"
            color="primary"
            class="mt-4"
          >
            Add from Library
          </UButton>
        </div>

        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <li
            v-for="entry in entries"
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
                {{ entry.year || 'n.d.' }}
              </p>
            </NuxtLink>
          </li>
        </ul>
      </UCard>

      <!-- Canonical slug hint (for future) -->
      <div class="text-xs text-gray-400">
        Project URL identifier: {{ projectSlugOrId(project) }}
      </div>
    </div>
  </div>
</template>

