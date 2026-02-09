<script setup lang="ts">
import type { Tag, Entry } from '~/shared/types'

const props = defineProps<{
  open: boolean
  tag: Tag | undefined
  projectId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: [tag: Tag]
  delete: [tag: Tag]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const entries = ref<Entry[]>([])
const loadingEntries = ref(false)

watch(() => props.tag, async (tag) => {
  if (!tag) {
    entries.value = []
    return
  }

  loadingEntries.value = true
  try {
    const params: Record<string, any> = { tagIds: tag.id, pageSize: 10, page: 1 }
    if (props.projectId) params.projectId = props.projectId
    const data = await $fetch<{ data: Entry[] }>('/api/entries', { params })
    entries.value = data.data
  }
  catch {
    entries.value = []
  }
  finally {
    loadingEntries.value = false
  }
}, { immediate: true })

const viewAllLink = computed(() => {
  if (!props.tag) return '/'
  if (props.projectId) {
    return { path: `/app/projects/${props.projectId}`, query: { tagIds: props.tag.id } }
  }
  return { path: '/app/library', query: { tagIds: props.tag.id } }
})

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <USlideover v-model:open="isOpen">
    <template #content>
      <div v-if="tag" class="flex flex-col h-full">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="w-5 h-5 rounded-full shrink-0"
                :style="{ backgroundColor: tag.color }"
              />
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {{ tag.name }}
              </h2>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              @click="isOpen = false"
            />
          </div>

          <p v-if="tag.description" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {{ tag.description }}
          </p>

          <div class="mt-4 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span class="tabular-nums">{{ tag.entryCount ?? 0 }} {{ (tag.entryCount ?? 0) === 1 ? 'entry' : 'entries' }}</span>
            <span v-if="tag.groupName" class="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {{ tag.groupName }}
            </span>
            <span>Created {{ formatDate(tag.createdAt) }}</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Recent Entries
          </h3>

          <div v-if="loadingEntries" class="flex justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
          </div>

          <div v-else-if="entries.length === 0" class="text-center py-8">
            <UIcon name="i-heroicons-book-open" class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
            <p class="mt-2 text-sm text-gray-400 dark:text-gray-500">
              No entries with this tag yet
            </p>
          </div>

          <div v-else class="space-y-2">
            <NuxtLink
              v-for="entry in entries"
              :key="entry.id"
              :to="`/app/library/${entry.id}`"
              class="block p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              @click="isOpen = false"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                {{ entry.title }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <p v-if="entry.authors?.length" class="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {{ entry.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ') }}
                </p>
                <span v-if="entry.year" class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {{ entry.year }}
                </span>
              </div>
            </NuxtLink>

            <NuxtLink
              v-if="(tag.entryCount ?? 0) > entries.length"
              :to="viewAllLink"
              class="block text-center py-2 text-xs text-primary-600 dark:text-primary-400 hover:underline"
              @click="isOpen = false"
            >
              View all {{ tag.entryCount }} entries
            </NuxtLink>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <UButton
            variant="outline"
            color="neutral"
            class="flex-1"
            icon="i-heroicons-pencil"
            @click="emit('edit', tag)"
          >
            Edit
          </UButton>
          <UButton
            variant="outline"
            color="error"
            class="flex-1"
            icon="i-heroicons-trash"
            @click="emit('delete', tag)"
          >
            Delete
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
