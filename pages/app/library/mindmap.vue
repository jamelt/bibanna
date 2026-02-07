<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const { hasFeature } = useSubscription()
</script>

<template>
  <div class="h-[calc(100vh-4rem)]">
    <!-- Upgrade prompt for free users -->
    <div v-if="!hasFeature('mindMaps')" class="flex items-center justify-center h-full p-6">
      <UCard class="max-w-lg">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-share" class="w-8 h-8 text-primary-600" />
          </div>
          <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Library Mind Map
          </h2>
          <p class="mt-2 text-gray-500">
            Visualize relationships across your entire library -- authors, tags, and topics all interconnected.
          </p>
          <AppUpgradePrompt feature="mindMaps" required-tier="light" class="mt-6">
            Unlock Mind Maps and other features
          </AppUpgradePrompt>
        </div>
      </UCard>
    </div>

    <!-- Mind Map -->
    <div v-else class="h-full flex flex-col">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/app/library"
            class="text-gray-400 hover:text-gray-600"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div>
            <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
              Library Mind Map
            </h1>
            <p class="text-sm text-gray-500">
              Visualize relationships across all your entries
            </p>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-hidden">
        <MindmapMindMapViewer scope="library" />
      </div>
    </div>
  </div>
</template>
