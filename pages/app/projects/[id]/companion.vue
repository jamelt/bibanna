<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const projectId = route.params.id as string

const { hasFeature } = useSubscription()

const { data: project, pending } = await useFetch(`/api/projects/${projectId}`)
</script>

<template>
  <div class="h-[calc(100vh-4rem)]">
    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center h-full">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Project not found -->
    <div v-else-if="!project" class="flex flex-col items-center justify-center h-full">
      <UIcon name="i-heroicons-folder-open" class="w-16 h-16 text-gray-300" />
      <h2 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        Project not found
      </h2>
      <NuxtLink to="/app/projects" class="mt-2 text-primary-600">
        Back to projects
      </NuxtLink>
    </div>

    <!-- Upgrade prompt for non-Pro users -->
    <div v-else-if="!hasFeature('researchCompanion')" class="flex items-center justify-center h-full p-6">
      <UCard class="max-w-lg">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-academic-cap" class="w-8 h-8 text-primary-600" />
          </div>
          <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Research Companion
          </h2>
          <p class="mt-2 text-gray-500">
            Get AI-powered research assistance with your project sources. Ask questions, verify facts, brainstorm ideas, and identify research gaps.
          </p>
          <AppUpgradePrompt feature="researchCompanion" required-tier="pro" class="mt-6">
            Unlock Research Companion and other Pro features
          </AppUpgradePrompt>
        </div>
      </UCard>
    </div>

    <!-- Research Companion -->
    <div v-else class="h-full flex flex-col">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="`/app/projects/${projectId}`"
            class="text-gray-400 hover:text-gray-600"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div>
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
              Research Companion
            </h1>
            <p class="text-sm text-gray-500">
              {{ project.name }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-hidden">
        <CompanionResearchCompanion :project-id="projectId" />
      </div>
    </div>
  </div>
</template>
