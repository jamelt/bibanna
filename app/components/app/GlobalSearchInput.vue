<script setup lang="ts">
const { open } = useGlobalSearch()
const isMac = ref(true)

onMounted(() => {
  isMac.value = navigator.platform.toUpperCase().includes('MAC')
})
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-2 w-full px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-sm cursor-pointer"
    data-testid="global-search-trigger"
    @click="open()"
  >
    <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 shrink-0" />
    <span class="flex-1 text-left truncate">Search entries, projects, tags...</span>
    <kbd
      class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-medium text-gray-400 dark:text-gray-500"
    >
      {{ isMac ? '⌘' : 'Ctrl' }}/
    </kbd>
  </button>
</template>
