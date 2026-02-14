<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const token = route.params.token as string

const { data: sharedProject, pending, error } = await useFetch(`/api/shared/${token}`)

const selectedEntryId = ref<string | null>(null)

function formatAuthors(authors: any[]): string {
  if (!authors?.length) return 'Unknown'
  return authors.map((a) => `${a.firstName || ''} ${a.lastName}`.trim()).join(', ')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center h-screen">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Error / Not Found -->
    <div
      v-else-if="error || !sharedProject"
      class="flex flex-col items-center justify-center h-screen"
    >
      <UIcon name="i-heroicons-link-slash" class="w-16 h-16 text-gray-300" />
      <h1 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
        Link not found or expired
      </h1>
      <p class="mt-2 text-gray-500">This shared link may have been revoked or has expired.</p>
      <NuxtLink to="/" class="mt-4 text-primary-600 hover:text-primary-700">
        Go to homepage
      </NuxtLink>
    </div>

    <!-- Shared Project View -->
    <div v-else>
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <UIcon name="i-heroicons-share" class="w-4 h-4" />
                <span>Shared by {{ sharedProject.owner.name }}</span>
                <UBadge variant="subtle" size="xs">
                  {{ sharedProject.permission }}
                </UBadge>
              </div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ sharedProject.project.name }}
              </h1>
              <p v-if="sharedProject.project.description" class="mt-1 text-gray-500">
                {{ sharedProject.project.description }}
              </p>
            </div>
            <NuxtLink to="/signup">
              <UButton color="primary"> Sign up to create your own </UButton>
            </NuxtLink>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid lg:grid-cols-3 gap-8">
          <!-- Entries list -->
          <div class="lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Bibliography</h2>
              <span class="text-sm text-gray-500"> {{ sharedProject.entryCount }} entries </span>
            </div>

            <div v-if="sharedProject.entries.length === 0" class="text-center py-12">
              <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-300" />
              <p class="mt-2 text-gray-500">No entries in this project</p>
            </div>

            <div v-else class="space-y-3">
              <UCard
                v-for="entry in sharedProject.entries"
                :key="entry.id"
                :ui="{ body: { padding: 'p-4' } }"
                class="cursor-pointer hover:ring-1 hover:ring-primary-500 transition-all"
                @click="selectedEntryId = selectedEntryId === entry.id ? null : entry.id"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    :class="[
                      entry.entryType === 'book'
                        ? 'bg-blue-100 text-blue-600'
                        : entry.entryType === 'journal_article'
                          ? 'bg-green-100 text-green-600'
                          : entry.entryType === 'website'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-gray-100 text-gray-600',
                    ]"
                  >
                    <UIcon
                      :name="
                        entry.entryType === 'book'
                          ? 'i-heroicons-book-open'
                          : entry.entryType === 'journal_article'
                            ? 'i-heroicons-document-text'
                            : entry.entryType === 'website'
                              ? 'i-heroicons-globe-alt'
                              : 'i-heroicons-document'
                      "
                      class="w-5 h-5"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-gray-900 dark:text-white">
                      {{ entry.title }}
                    </h3>
                    <p class="text-sm text-gray-500 mt-0.5">
                      {{ formatAuthors(entry.authors) }}
                      <span v-if="entry.year"> · {{ entry.year }}</span>
                    </p>
                    <UBadge variant="subtle" size="xs" class="mt-2">
                      {{ entry.entryType.replace(/_/g, ' ') }}
                    </UBadge>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <!-- Sidebar -->
          <div>
            <UCard>
              <template #header>
                <h3 class="font-semibold text-gray-900 dark:text-white">About this project</h3>
              </template>

              <dl class="space-y-4 text-sm">
                <div>
                  <dt class="text-gray-500">Owner</dt>
                  <dd class="text-gray-900 dark:text-white">{{ sharedProject.owner.name }}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">Entries</dt>
                  <dd class="text-gray-900 dark:text-white">{{ sharedProject.entryCount }}</dd>
                </div>
                <div>
                  <dt class="text-gray-500">Your access</dt>
                  <dd class="text-gray-900 dark:text-white capitalize">
                    {{ sharedProject.permission }}
                  </dd>
                </div>
                <div>
                  <dt class="text-gray-500">Created</dt>
                  <dd class="text-gray-900 dark:text-white">
                    {{ new Date(sharedProject.project.createdAt).toLocaleDateString() }}
                  </dd>
                </div>
              </dl>

              <template #footer>
                <div class="text-center">
                  <p class="text-sm text-gray-500 mb-3">Want to create your own bibliographies?</p>
                  <NuxtLink to="/signup">
                    <UButton block variant="soft"> Create free account </UButton>
                  </NuxtLink>
                </div>
              </template>
            </UCard>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
        <div class="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Powered by
            <NuxtLink to="/" class="text-primary-600 hover:text-primary-700">AnnoBib</NuxtLink>
            · The modern bibliography manager for researchers
          </p>
        </div>
      </footer>
    </div>
  </div>
</template>
