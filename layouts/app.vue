<script setup lang="ts">
const { user, logout } = useAuth()
const { open: openQuickAdd, close: closeQuickAdd, isOpen: isQuickAddOpen } = useQuickAdd()

const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value) => {
    colorMode.preference = value ? 'dark' : 'light'
  },
})

const isSidebarOpen = ref(true)
const isMobileMenuOpen = ref(false)
const isFeedbackOpen = ref(false)
const isUserMenuOpen = ref(false)
const userMenuRef = ref(null)

onClickOutside(userMenuRef, () => {
  isUserMenuOpen.value = false
})

const navigation = [
  { name: 'Dashboard', to: '/app', icon: 'i-heroicons-home', exact: true },
  { name: 'Library', to: '/app/library', icon: 'i-heroicons-book-open' },
  { name: 'Projects', to: '/app/projects', icon: 'i-heroicons-folder' },
  { name: 'Tags', to: '/app/tags', icon: 'i-heroicons-tag' },
  { name: 'Mind Maps', to: '/app/mindmaps', icon: 'i-heroicons-share' },
]

const { data: activeAnnouncements } = useFetch('/api/announcements/active', {
  default: () => [],
})

const dismissedAnnouncements = ref<Set<string>>(new Set())

const visibleAnnouncements = computed(() =>
  (activeAnnouncements.value || []).filter((a: any) => !dismissedAnnouncements.value.has(a.id)),
)

function dismissAnnouncement(id: string) {
  dismissedAnnouncements.value.add(id)
}

const { data: adminCheck } = useFetch('/api/admin/me', {
  default: () => null,
  onResponseError() { /* silently fail for non-admins */ },
})

const isAdmin = computed(() => adminCheck.value?.role === 'admin' || adminCheck.value?.role === 'support')

const feedbackForm = ref({ type: 'general', subject: '', content: '' })
const feedbackSubmitting = ref(false)
const feedbackSuccess = ref(false)

async function submitFeedback() {
  feedbackSubmitting.value = true
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: feedbackForm.value,
    })
    feedbackSuccess.value = true
    feedbackForm.value = { type: 'general', subject: '', content: '' }
    setTimeout(() => {
      isFeedbackOpen.value = false
      feedbackSuccess.value = false
    }, 2000)
  }
  finally {
    feedbackSubmitting.value = false
  }
}

const announcementBannerColors: Record<string, string> = {
  info: 'bg-blue-600',
  warning: 'bg-amber-600',
  maintenance: 'bg-gray-600',
  release: 'bg-green-600',
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Global Announcement Banners -->
    <div v-if="visibleAnnouncements.length" class="relative z-50">
      <div
        v-for="announcement in visibleAnnouncements"
        :key="announcement.id"
        :class="announcementBannerColors[announcement.type] || 'bg-blue-600'"
        class="px-4 py-2 text-white text-sm flex items-center justify-center gap-3"
      >
        <span class="font-medium">{{ announcement.title }}</span>
        <span class="hidden sm:inline opacity-90">&mdash; {{ announcement.content }}</span>
        <button
          class="ml-2 opacity-70 hover:opacity-100"
          @click="dismissAnnouncement(announcement.id)"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
    </div>

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
            <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />
            <span v-if="isSidebarOpen" class="truncate">{{ item.name }}</span>
          </NuxtLink>
        </UTooltip>
      </nav>

      <div class="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
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
          data-testid="quick-add-button"
          @click="openQuickAdd"
        />
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          class="sm:hidden"
          data-testid="quick-add-button-mobile"
          @click="openQuickAdd"
        />

        <div class="flex items-center gap-4 ml-auto">
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

          <!-- Feedback -->
          <UButton
            icon="i-heroicons-chat-bubble-left-ellipsis"
            variant="ghost"
            color="neutral"
            @click="isFeedbackOpen = true"
          />

          <!-- User menu -->
          <!-- User menu -->
          <div ref="userMenuRef" class="relative">
            <UButton
              color="white"
              variant="ghost"
              class="p-0 rounded-full"
              data-testid="user-menu-trigger"
              @click="isUserMenuOpen = !isUserMenuOpen"
            >
              <UAvatar
                :text="(user as { email?: string })?.email?.slice(0, 2).toUpperCase() || 'U'"
                size="sm"
                class="cursor-pointer"
              />
            </UButton>

            <div
              v-if="isUserMenuOpen"
              class="absolute right-0 top-full mt-2 w-56 z-50"
            >
              <UCard :ui="{ body: { padding: 'p-1' } }">
                <div class="space-y-1">
                  <NuxtLink
                    to="/app/settings/profile"
                    class="group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="isUserMenuOpen = false"
                  >
                    <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    Profile
                  </NuxtLink>
                  <NuxtLink
                    to="/app/settings"
                    class="group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="isUserMenuOpen = false"
                  >
                    <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    Settings
                  </NuxtLink>
                  <NuxtLink
                    to="/app/subscription"
                    class="group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="isUserMenuOpen = false"
                  >
                    <UIcon name="i-heroicons-credit-card" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    Subscription
                  </NuxtLink>
                  
                  <div v-if="isAdmin" class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  
                  <NuxtLink
                    v-if="isAdmin"
                    to="/admin"
                    class="group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="isUserMenuOpen = false"
                  >
                    <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    Admin Panel
                  </NuxtLink>

                  <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                  <button
                    class="w-full group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    @click="logout"
                  >
                    <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    Sign out
                  </button>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-4 lg:p-6">
        <slot />
      </main>
    </div>

    <!-- Mobile bottom navigation (hidden when Quick Add is open to prevent overlap) -->
    <nav
      class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-pb transition-opacity"
      :class="{ 'opacity-0 pointer-events-none': isQuickAddOpen }"
    >
      <div class="flex justify-around items-center py-2">
        <NuxtLink
          v-for="item in navigation.slice(0, 2)"
          :key="item.name"
          :to="item.to"
          class="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span class="text-xs">{{ item.name }}</span>
        </NuxtLink>
        <button
          type="button"
          class="flex flex-col items-center justify-center -mt-4 w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg"
          data-testid="quick-add-fab"
          aria-label="Quick Add"
          @click="openQuickAdd"
        >
          <UIcon name="i-heroicons-plus" class="w-6 h-6" />
        </button>
        <NuxtLink
          v-for="item in navigation.slice(2, 5)"
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

    <AppQuickAddModal
      v-model:open="isQuickAddOpen"
      @update:open="(val: boolean) => { if (!val) closeQuickAdd() }"
    />

    <!-- Feedback Modal -->
    <UModal v-model:open="isFeedbackOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">Send Feedback</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Found a bug? Have a suggestion? We'd love to hear from you.
          </p>

          <div v-if="feedbackSuccess" class="text-center py-4">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p class="text-green-600 dark:text-green-400 font-medium">Thank you for your feedback!</p>
          </div>

          <template v-else>
            <USelect
              v-model="feedbackForm.type"
              :items="[
                { label: 'General Feedback', value: 'general' },
                { label: 'Bug Report', value: 'bug' },
                { label: 'Feature Request', value: 'feature_request' },
                { label: 'Complaint', value: 'complaint' },
              ]"
            />
            <UInput
              v-model="feedbackForm.subject"
              placeholder="Subject"
            />
            <UTextarea
              v-model="feedbackForm.content"
              placeholder="Describe your feedback in detail..."
              :rows="4"
            />
            <div class="flex gap-2 justify-end">
              <UButton label="Cancel" variant="ghost" color="neutral" @click="isFeedbackOpen = false" />
              <UButton
                label="Submit"
                color="primary"
                :loading="feedbackSubmitting"
                :disabled="!feedbackForm.subject || !feedbackForm.content"
                @click="submitFeedback"
              />
            </div>
          </template>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
