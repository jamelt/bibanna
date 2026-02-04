<script setup lang="ts">
const { user } = useAuth()

const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value) => {
    colorMode.preference = value ? 'dark' : 'light'
  },
})

const isSidebarOpen = ref(true)
const isMobileMenuOpen = ref(false)

const navigation = [
  { name: 'Dashboard', to: '/app', icon: 'i-heroicons-home' },
  { name: 'Library', to: '/app/library', icon: 'i-heroicons-book-open' },
  { name: 'Projects', to: '/app/projects', icon: 'i-heroicons-folder' },
  { name: 'Tags', to: '/app/tags', icon: 'i-heroicons-tag' },
  { name: 'Mind Maps', to: '/app/mindmaps', icon: 'i-heroicons-share' },
]

const userNavigation = [
  { name: 'Settings', to: '/app/settings', icon: 'i-heroicons-cog-6-tooth' },
  { name: 'Subscription', to: '/app/subscription', icon: 'i-heroicons-credit-card' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Mobile sidebar overlay -->
    <USlideover v-model="isMobileMenuOpen" side="left" class="lg:hidden">
      <div class="flex h-full flex-col bg-white dark:bg-gray-800 p-4">
        <div class="flex items-center justify-between mb-8">
          <NuxtLink to="/app" class="flex items-center gap-2">
            <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-primary-500" />
            <span class="text-xl font-bold text-gray-900 dark:text-white">Bibanna</span>
          </NuxtLink>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="neutral"
            @click="isMobileMenuOpen = false"
          />
        </div>

        <nav class="flex-1 space-y-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.to"
            class="group flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
            @click="isMobileMenuOpen = false"
          >
            <UIcon :name="item.icon" class="w-5 h-5" />
            {{ item.name }}
          </NuxtLink>
        </nav>
      </div>
    </USlideover>

    <!-- Desktop sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden lg:flex lg:flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300"
      :class="isSidebarOpen ? 'w-64' : 'w-20'"
    >
      <div class="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <NuxtLink v-if="isSidebarOpen" to="/app" class="flex items-center gap-2">
          <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-primary-500" />
          <span class="text-xl font-bold text-gray-900 dark:text-white">Bibanna</span>
        </NuxtLink>
        <UIcon v-else name="i-heroicons-book-open" class="w-8 h-8 text-primary-500 mx-auto" />
      </div>

      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <UTooltip
          v-for="item in navigation"
          :key="item.name"
          :text="item.name"
          :content="{ side: 'right' }"
        >
          <NuxtLink
            :to="item.to"
            class="group flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
          >
            <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="isSidebarOpen" class="truncate">{{ item.name }}</span>
          </NuxtLink>
        </UTooltip>
      </nav>

      <div class="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <UTooltip
          v-for="item in userNavigation"
          :key="item.name"
          :text="item.name"
          :content="{ side: 'right' }"
        >
          <NuxtLink
            :to="item.to"
            class="group flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
          >
            <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="isSidebarOpen" class="truncate">{{ item.name }}</span>
          </NuxtLink>
        </UTooltip>

        <UButton
          :icon="isSidebarOpen ? 'i-heroicons-chevron-double-left' : 'i-heroicons-chevron-double-right'"
          variant="ghost"
          color="neutral"
          :class="isSidebarOpen ? '' : 'mx-auto'"
          block
          @click="isSidebarOpen = !isSidebarOpen"
        />
      </div>
    </aside>

    <!-- Main content -->
    <div
      class="transition-all duration-300"
      :class="isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'"
    >
      <!-- Top header -->
      <header class="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
        <UButton
          icon="i-heroicons-bars-3"
          variant="ghost"
          color="neutral"
          class="lg:hidden"
          @click="isMobileMenuOpen = true"
        />

        <!-- Search -->
        <div class="flex-1 max-w-xl">
          <UInput
            icon="i-heroicons-magnifying-glass"
            placeholder="Search entries, projects, tags..."
            size="sm"
            class="w-full"
          />
        </div>

        <!-- Quick add button -->
        <UButton
          icon="i-heroicons-plus"
          label="Quick Add"
          color="primary"
          class="hidden sm:flex"
        />
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          class="sm:hidden"
        />

        <!-- Theme toggle -->
        <UButton
          :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
          variant="ghost"
          color="neutral"
          @click="isDark = !isDark"
        />

        <!-- Notifications -->
        <UButton
          icon="i-heroicons-bell"
          variant="ghost"
          color="neutral"
        />

        <!-- User menu -->
        <UDropdown
          :items="[
            [
              { label: 'Profile', icon: 'i-heroicons-user', to: '/app/settings/profile' },
              { label: 'Settings', icon: 'i-heroicons-cog-6-tooth', to: '/app/settings' },
            ],
            [
              { label: 'Sign out', icon: 'i-heroicons-arrow-right-on-rectangle', onClick: () => {} },
            ],
          ]"
          :content="{ side: 'bottom', align: 'end' }"
        >
          <UAvatar
            :text="(user as { email?: string })?.email?.slice(0, 2).toUpperCase() || 'U'"
            size="sm"
            class="cursor-pointer"
          />
        </UDropdown>
      </header>

      <!-- Page content -->
      <main class="p-4 lg:p-6">
        <slot />
      </main>
    </div>

    <!-- Mobile bottom navigation -->
    <nav class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-pb">
      <div class="flex justify-around py-2">
        <NuxtLink
          v-for="item in navigation.slice(0, 5)"
          :key="item.name"
          :to="item.to"
          class="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span class="text-xs">{{ item.name }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
