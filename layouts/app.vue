<script setup lang="ts">
const { user, logout } = useAuth();
const {
  open: openQuickAdd,
  close: closeQuickAdd,
  isOpen: isQuickAddOpen,
  defaultProjectId: quickAddProjectId,
} = useQuickAdd();
const { notifyEntryCreated } = useEntryEvents();
const { starredProjects, projectRoute } = useStarredProjects();

const colorMode = useColorMode();
const isDark = computed({
  get: () => colorMode.value === "dark",
  set: (value) => {
    colorMode.preference = value ? "dark" : "light";
  },
});

const isSidebarOpen = ref(true);
const isMobileMenuOpen = ref(false);
const isFeedbackOpen = ref(false);
const isUserMenuOpen = ref(false);
const userMenuRef = ref(null);
const isProjectsPopoverOpen = ref(false);
const projectsPopoverRef = ref(null);

onClickOutside(projectsPopoverRef, () => {
  isProjectsPopoverOpen.value = false;
});

onClickOutside(userMenuRef, () => {
  isUserMenuOpen.value = false;
});

const navigation = [
  { name: "Dashboard", to: "/app", icon: "i-heroicons-home", exact: true },
  { name: "Projects", to: "/app/projects", icon: "i-heroicons-folder" },
  { name: "Library", to: "/app/library", icon: "i-heroicons-book-open" },
  { name: "Annotations", to: "/app/annotations", icon: "i-heroicons-pencil-square" },
  { name: "Tags", to: "/app/tags", icon: "i-heroicons-tag" },
  { name: "Citation Styles", to: "/app/settings/citation-styles", icon: "i-heroicons-document-text" },
  { name: "Mind Maps", to: "/app/mindmaps", icon: "i-heroicons-share" },
];

const adminNavigation = [
  { name: "Admin Dashboard", to: "/app/admin", icon: "i-heroicons-chart-bar-square", exact: true },
  { name: "Users", to: "/app/admin/users", icon: "i-heroicons-users" },
  { name: "Feedback", to: "/app/admin/feedback", icon: "i-heroicons-inbox" },
  { name: "Announcements", to: "/app/admin/announcements", icon: "i-heroicons-megaphone" },
  { name: "Feature Flags", to: "/app/admin/feature-flags", icon: "i-heroicons-flag" },
  { name: "Audit Log", to: "/app/admin/audit-log", icon: "i-heroicons-clipboard-document-list" },
];

const { data: activeAnnouncements } = useFetch("/api/announcements/active", {
  default: () => [],
});

const dismissedAnnouncements = ref<Set<string>>(new Set());

const visibleAnnouncements = computed(() =>
  (activeAnnouncements.value || []).filter(
    (a: any) => !dismissedAnnouncements.value.has(a.id),
  ),
);

function dismissAnnouncement(id: string) {
  dismissedAnnouncements.value.add(id);
}

const adminRole = useState<string | null>('admin-role', () => null)

onMounted(async () => {
  if (adminRole.value === null) {
    try {
      const profile = await $fetch<{ role: string }>('/api/admin/me')
      adminRole.value = profile.role
    }
    catch {
      adminRole.value = 'user'
    }
  }
})

const isAdmin = computed(
  () => adminRole.value === 'admin' || adminRole.value === 'support',
);

const { session } = useUserSession()
const isImpersonating = computed(() => !!(session.value as any)?.impersonatedBy)
const impersonator = computed(() => (session.value as any)?.impersonatedBy)

async function stopImpersonation() {
  await $fetch('/api/admin/stop-impersonation', { method: 'POST' })
  window.location.href = '/app/admin/users'
}

const subscriptionStatus = ref<any>(null)

onMounted(async () => {
  try {
    const sub = await $fetch<any>('/api/subscription')
    subscriptionStatus.value = sub?.subscription
  }
  catch {}
})

const isPaymentPastDue = computed(() => subscriptionStatus.value?.status === 'past_due')
const graceEndsAt = computed(() => subscriptionStatus.value?.graceEndsAt ? new Date(subscriptionStatus.value.graceEndsAt) : null)
const graceDaysLeft = computed(() => {
  if (!graceEndsAt.value) return 0
  return Math.max(0, Math.ceil((graceEndsAt.value.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
})

const feedbackForm = ref({ type: "general", subject: "", content: "" });
const feedbackSubmitting = ref(false);
const feedbackSuccess = ref(false);

async function submitFeedback() {
  feedbackSubmitting.value = true;
  try {
    await $fetch("/api/feedback", {
      method: "POST",
      body: feedbackForm.value,
    });
    feedbackSuccess.value = true;
    feedbackForm.value = { type: "general", subject: "", content: "" };
    setTimeout(() => {
      isFeedbackOpen.value = false;
      feedbackSuccess.value = false;
    }, 2000);
  } finally {
    feedbackSubmitting.value = false;
  }
}

const announcementBannerColors: Record<string, string> = {
  info: "bg-blue-600",
  warning: "bg-amber-600",
  maintenance: "bg-gray-600",
  release: "bg-green-600",
};
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
        <span class="hidden sm:inline opacity-90"
          >&mdash; {{ announcement.content }}</span
        >
        <button
          class="ml-2 opacity-70 hover:opacity-100"
          @click="dismissAnnouncement(announcement.id)"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Impersonation Banner -->
    <div
      v-if="isImpersonating"
      class="bg-red-600 px-4 py-2 text-white text-sm flex items-center justify-center gap-3 relative z-50"
    >
      <UIcon name="i-heroicons-eye" class="w-4 h-4" />
      <span>
        You are impersonating this user.
        Logged in as <strong>{{ impersonator?.email }}</strong>.
      </span>
      <UButton
        label="Stop Impersonating"
        size="xs"
        color="white"
        variant="solid"
        @click="stopImpersonation"
      />
    </div>

    <!-- Payment Failure Warning -->
    <div
      v-if="isPaymentPastDue && !isImpersonating"
      class="bg-amber-500 px-4 py-2 text-white text-sm flex items-center justify-center gap-3 relative z-50"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
      <span>
        Your payment failed.
        <template v-if="graceDaysLeft > 0">
          Please update your payment method within <strong>{{ graceDaysLeft }} day{{ graceDaysLeft !== 1 ? 's' : '' }}</strong> to avoid losing access to your plan.
        </template>
        <template v-else>
          Your grace period has expired. Please update your payment method to restore access.
        </template>
      </span>
      <UButton
        label="Update Payment"
        size="xs"
        color="white"
        variant="solid"
        @click="navigateTo('/app/settings/billing')"
      />
    </div>

    <!-- Mobile sidebar overlay -->
    <USlideover v-model:open="isMobileMenuOpen" side="left" class="lg:hidden" :close="false">
      <template #content="{ close }">
        <div class="flex h-full flex-col bg-white dark:bg-gray-800 p-4">
          <div class="flex items-center justify-between mb-8">
            <NuxtLink to="/app" class="flex items-center gap-2" @click="close()">
              <UIcon
                name="i-heroicons-book-open"
                class="w-8 h-8 text-primary-500"
              />
              <span class="text-xl font-bold text-gray-900 dark:text-white"
                >Bibanna</span
              >
            </NuxtLink>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              @click="close()"
            />
          </div>

          <nav class="flex-1 space-y-1">
            <template v-for="item in navigation" :key="item.name">
              <NuxtLink
                :to="item.to"
                class="group flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                @click="close()"
              >
                <UIcon :name="item.icon" class="w-5 h-5" />
                {{ item.name }}
              </NuxtLink>

              <!-- Starred projects nested under Projects -->
              <div
                v-if="item.name === 'Projects' && starredProjects.length > 0"
                class="ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-0.5"
              >
                <NuxtLink
                  v-for="starred in starredProjects"
                  :key="starred.id"
                  :to="projectRoute(starred)"
                  class="group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  @click="close()"
                >
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :style="{ backgroundColor: starred.color }"
                  />
                  <span class="truncate">{{ starred.name }}</span>
                </NuxtLink>
              </div>
            </template>

            <template v-if="isAdmin">
              <div class="pt-4 pb-1">
                <p class="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Admin</p>
              </div>
              <NuxtLink
                v-for="item in adminNavigation"
                :key="item.name"
                :to="item.to"
                class="group flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                @click="close()"
              >
                <UIcon :name="item.icon" class="w-5 h-5" />
                {{ item.name }}
              </NuxtLink>
            </template>
          </nav>
        </div>
      </template>
    </USlideover>

    <!-- Desktop sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden lg:flex lg:flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300"
      :class="isSidebarOpen ? 'w-64' : 'w-20'"
    >
      <div
        class="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700"
      >
        <NuxtLink
          v-if="isSidebarOpen"
          to="/app"
          class="flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-book-open"
            class="w-8 h-8 text-primary-500"
          />
          <span class="text-xl font-bold text-gray-900 dark:text-white"
            >Bibanna</span
          >
        </NuxtLink>
        <UIcon
          v-else
          name="i-heroicons-book-open"
          class="w-8 h-8 text-primary-500 mx-auto"
        />
      </div>

      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <template v-for="item in navigation" :key="item.name">
          <UTooltip
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

          <!-- Starred projects nested under Projects -->
          <div
            v-if="item.name === 'Projects' && isSidebarOpen && starredProjects.length > 0"
            class="ml-5 pl-3 border-l-2 border-gray-200 dark:border-gray-700 space-y-0.5 mt-0.5"
          >
            <NuxtLink
              v-for="starred in starredProjects"
              :key="starred.id"
              :to="projectRoute(starred)"
              class="group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
            >
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :style="{ backgroundColor: starred.color }"
              />
              <span class="truncate">{{ starred.name }}</span>
            </NuxtLink>
          </div>
        </template>
      </nav>

      <!-- Admin section -->
      <div v-if="isAdmin" class="px-4 pb-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <p v-if="isSidebarOpen" class="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Admin
        </p>
        <UTooltip
          v-for="item in adminNavigation"
          :key="item.name"
          :text="item.name"
          :content="{ side: 'right' }"
        >
          <NuxtLink
            :to="item.to"
            :exact="item.exact"
            class="group flex items-center gap-3 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
          >
            <UIcon :name="item.icon" class="w-4 h-4 shrink-0" />
            <span v-if="isSidebarOpen" class="truncate">{{ item.name }}</span>
          </NuxtLink>
        </UTooltip>
      </div>

      <div class="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <UButton
          :icon="
            isSidebarOpen
              ? 'i-heroicons-chevron-double-left'
              : 'i-heroicons-chevron-double-right'
          "
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
      <header
        class="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur"
      >
        <UButton
          icon="i-heroicons-bars-3"
          variant="ghost"
          color="neutral"
          class="lg:hidden"
          @click="isMobileMenuOpen = true"
        />

        <!-- Search -->
        <div class="flex-1 max-w-xl">
          <AppGlobalSearchInput />
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
          <!-- Notifications -->
          <UButton
            v-if="visibleAnnouncements.length > 0"
            icon="i-heroicons-bell"
            variant="ghost"
            color="neutral"
          />

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
                :text="(user as any)?.name ? (user as any).name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : (user as { email?: string })?.email?.slice(0, 2).toUpperCase() || 'U'"
                size="md"
                class="cursor-pointer"
              />
            </UButton>

            <div
              v-if="isUserMenuOpen"
              class="absolute right-0 top-full mt-2 w-56 z-50"
            >
              <UCard :ui="{ body: { padding: 'p-1' } }">
                <div class="space-y-1">
                  <div class="px-2 py-2 mb-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {{ (user as any)?.name || 'User' }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ (user as any)?.email || '' }}
                    </p>
                  </div>
                  <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>

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
                    to="/app/admin"
                    class="group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click="isUserMenuOpen = false"
                  >
                    <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    Admin Panel
                  </NuxtLink>

                  <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                  <button
                    type="button"
                    class="w-full group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    @click="isDark = !isDark; isUserMenuOpen = false"
                  >
                    <UIcon :name="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    {{ isDark ? 'Light mode' : 'Dark mode' }}
                  </button>
                  <button
                    type="button"
                    class="w-full group flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    @click="isFeedbackOpen = true; isUserMenuOpen = false"
                  >
                    <UIcon name="i-heroicons-chat-bubble-left-ellipsis" class="w-4 h-4 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400" />
                    Send Feedback
                  </button>

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
      <main class="p-4 lg:p-6 pb-20 lg:pb-6">
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
          :to="navigation[0].to"
          class="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400"
        >
          <UIcon :name="navigation[0].icon" class="w-6 h-6" />
          <span class="text-xs">{{ navigation[0].name }}</span>
        </NuxtLink>

        <!-- Projects button with popover for starred projects -->
        <div ref="projectsPopoverRef" class="relative">
          <button
            type="button"
            class="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 dark:text-gray-400"
            :class="{ 'text-primary-500 dark:text-primary-400': $route.path.startsWith('/app/projects') }"
            @click="starredProjects.length > 0 ? isProjectsPopoverOpen = !isProjectsPopoverOpen : navigateTo('/app/projects')"
          >
            <UIcon name="i-heroicons-folder" class="w-6 h-6" />
            <span class="text-xs">Projects</span>
          </button>

          <!-- Starred projects popover -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-2 scale-95"
          >
            <div
              v-if="isProjectsPopoverOpen"
              class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden"
            >
              <div class="px-3 pt-3 pb-1.5">
                <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Starred
                </p>
              </div>
              <div class="px-1.5 pb-1.5 space-y-0.5 max-h-48 overflow-y-auto">
                <NuxtLink
                  v-for="starred in starredProjects"
                  :key="starred.id"
                  :to="projectRoute(starred)"
                  class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  @click="isProjectsPopoverOpen = false"
                >
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :style="{ backgroundColor: starred.color }"
                  />
                  <span class="truncate">{{ starred.name }}</span>
                </NuxtLink>
              </div>
              <div class="border-t border-gray-100 dark:border-gray-700 px-1.5 py-1.5">
                <NuxtLink
                  to="/app/projects"
                  class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  @click="isProjectsPopoverOpen = false"
                >
                  <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
                  All Projects
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </div>

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
          :to="navigation[2].to"
          class="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400"
        >
          <UIcon :name="navigation[2].icon" class="w-6 h-6" />
          <span class="text-xs">{{ navigation[2].name }}</span>
        </NuxtLink>

        <NuxtLink
          :to="navigation[4].to"
          class="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 dark:text-gray-400"
          active-class="text-primary-500 dark:text-primary-400"
        >
          <UIcon :name="navigation[4].icon" class="w-6 h-6" />
          <span class="text-xs">{{ navigation[4].name }}</span>
        </NuxtLink>
      </div>
    </nav>

    <AppQuickAddModal
      v-model:open="isQuickAddOpen"
      :default-project-id="quickAddProjectId"
      @created="notifyEntryCreated"
    />

    <AppGlobalSearch />

    <!-- Feedback Modal -->
    <UModal v-model:open="isFeedbackOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">Send Feedback</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Found a bug? Have a suggestion? We'd love to hear from you.
          </p>

          <div v-if="feedbackSuccess" class="text-center py-4">
            <UIcon
              name="i-heroicons-check-circle"
              class="w-12 h-12 text-green-500 mx-auto mb-2"
            />
            <p class="text-green-600 dark:text-green-400 font-medium">
              Thank you for your feedback!
            </p>
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
            <UInput v-model="feedbackForm.subject" placeholder="Subject" />
            <UTextarea
              v-model="feedbackForm.content"
              placeholder="Describe your feedback in detail..."
              :rows="4"
            />
            <div class="flex gap-2 justify-end">
              <UButton
                label="Cancel"
                variant="ghost"
                color="neutral"
                @click="isFeedbackOpen = false"
              />
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
