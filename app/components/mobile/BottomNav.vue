<script setup lang="ts">
const route = useRoute()

const navItems = [
  { icon: 'i-heroicons-home', label: 'Home', to: '/app' },
  { icon: 'i-heroicons-book-open', label: 'Library', to: '/app/library' },
  { icon: 'i-heroicons-plus-circle', label: 'Add', to: '/app?action=quick-add', isAction: true },
  { icon: 'i-heroicons-folder', label: 'Projects', to: '/app/projects' },
  { icon: 'i-heroicons-cog-6-tooth', label: 'Settings', to: '/app/settings' },
]

function isActive(to: string) {
  if (to.includes('?')) {
    return route.path === to.split('?')[0]
  }
  // Exact match for root paths (e.g., '/app') to prevent highlighting on child routes
  if (to === '/app') {
    return route.path === '/app'
  }
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 safe-area-bottom md:hidden"
  >
    <div class="flex items-center justify-around h-16">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center w-full h-full transition-colors"
        :class="[
          item.isAction
            ? 'text-white'
            : isActive(item.to)
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400',
        ]"
      >
        <div
          v-if="item.isAction"
          class="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-primary-500 shadow-lg"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
        </div>
        <template v-else>
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span class="mt-1 text-xs">{{ item.label }}</span>
        </template>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
