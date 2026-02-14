<script setup lang="ts">
import type { Tag } from '~/shared/types'

interface CoOccurrence {
  tagAId: string
  tagAName: string
  tagAColor: string
  tagBId: string
  tagBName: string
  tagBColor: string
  sharedCount: number
}

interface UnderusedTag {
  id: string
  name: string
  color: string
  entryCount: number
}

interface TagStats {
  coOccurrence: CoOccurrence[]
  untaggedEntries: number
  totalEntries: number
  underusedTags: UnderusedTag[]
}

const props = defineProps<{
  tags: Tag[]
  projectId?: string
}>()

const emit = defineEmits<{
  'select-tag': [tagId: string]
  'select-tag-pair': [tagIdA: string, tagIdB: string]
  'select-untagged': []
}>()

const isOpen = ref(false)
const stats = ref<TagStats | null>(null)
const loading = ref(false)
const error = ref('')

async function loadStats() {
  if (stats.value) return
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (props.projectId) params.projectId = props.projectId
    stats.value = await $fetch<TagStats>('/api/tags/stats', { params })
  } catch {
    error.value = 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

function invalidateStats() {
  stats.value = null
  if (isOpen.value) loadStats()
}

watch(isOpen, (open) => {
  if (open) loadStats()
})

watch(
  () => props.projectId,
  () => {
    invalidateStats()
  },
)

const topTags = computed(() => {
  return [...props.tags]
    .filter((t) => (t.entryCount ?? 0) > 0)
    .sort((a, b) => (b.entryCount ?? 0) - (a.entryCount ?? 0))
    .slice(0, 15)
})

const maxEntryCount = computed(() => {
  return Math.max(...topTags.value.map((t) => t.entryCount ?? 0), 1)
})

const heading = computed(() => (props.projectId ? 'Tag Analytics for This Project' : 'Analytics'))

const untaggedLink = computed(() => {
  if (props.projectId) return undefined
  return '/app/library?untagged=true'
})

function handleUntaggedClick() {
  if (props.projectId) {
    emit('select-untagged')
  }
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-gray-500" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ heading }}</span>
      </div>
      <UIcon
        :name="isOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="w-4 h-4 text-gray-400"
      />
    </button>

    <div v-if="isOpen" class="border-t border-gray-200 dark:border-gray-700 p-4 space-y-6">
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
      </div>

      <div v-else-if="error" class="text-center py-4">
        <p class="text-sm text-red-500">{{ error }}</p>
      </div>

      <template v-else>
        <!-- Alerts -->
        <div v-if="stats" class="flex flex-wrap gap-3">
          <component
            :is="untaggedLink ? 'NuxtLink' : 'button'"
            v-if="stats.untaggedEntries > 0"
            :to="untaggedLink || undefined"
            class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
            @click="handleUntaggedClick"
          >
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0" />
            {{ stats.untaggedEntries }} of {{ stats.totalEntries }} entries have no tags
            <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 ml-auto shrink-0" />
          </component>
          <div
            v-if="stats.underusedTags.length > 0"
            class="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs"
          >
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 shrink-0" />
            {{ stats.underusedTags.length }} tags have 0-1 entries
          </div>
        </div>

        <!-- Distribution: entries per tag -->
        <div v-if="topTags.length > 0">
          <h4
            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
          >
            Entries per Tag
          </h4>
          <div class="space-y-1">
            <button
              v-for="tag in topTags"
              :key="tag.id"
              class="w-full flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 group/row"
              @click="emit('select-tag', tag.id)"
            >
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: tag.color }" />
              <span
                class="text-xs text-gray-600 dark:text-gray-400 w-32 truncate shrink-0 text-left"
              >
                {{ tag.name }}
              </span>
              <div class="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${((tag.entryCount ?? 0) / maxEntryCount) * 100}%`,
                    backgroundColor: tag.color,
                    minWidth: (tag.entryCount ?? 0) > 0 ? '4px' : '0px',
                  }"
                />
              </div>
              <span
                class="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right shrink-0"
              >
                {{ tag.entryCount ?? 0 }}
              </span>
              <UIcon
                name="i-heroicons-chevron-right"
                class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
              />
            </button>
          </div>
        </div>

        <!-- Co-occurrence -->
        <div v-if="stats?.coOccurrence?.length">
          <h4
            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
          >
            Frequently Co-occurring Tags
          </h4>
          <div class="space-y-1">
            <UTooltip
              v-for="(pair, idx) in stats.coOccurrence.slice(0, 10)"
              :key="idx"
              text="View entries with both tags"
            >
              <button
                class="w-full flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg text-xs cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 group/pair"
                @click="emit('select-tag-pair', pair.tagAId, pair.tagBId)"
              >
                <span class="flex items-center gap-1.5">
                  <span
                    class="w-2.5 h-2.5 rounded-full"
                    :style="{ backgroundColor: pair.tagAColor }"
                  />
                  <span class="text-gray-700 dark:text-gray-300">{{ pair.tagAName }}</span>
                </span>
                <UIcon
                  name="i-heroicons-arrows-right-left"
                  class="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0"
                />
                <span class="flex items-center gap-1.5">
                  <span
                    class="w-2.5 h-2.5 rounded-full"
                    :style="{ backgroundColor: pair.tagBColor }"
                  />
                  <span class="text-gray-700 dark:text-gray-300">{{ pair.tagBName }}</span>
                </span>
                <span class="ml-auto text-gray-400 tabular-nums">{{ pair.sharedCount }}</span>
                <UIcon
                  name="i-heroicons-chevron-right"
                  class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0 opacity-0 group-hover/pair:opacity-100 transition-opacity"
                />
              </button>
            </UTooltip>
          </div>
        </div>

        <!-- Underused tags -->
        <div v-if="stats?.underusedTags?.length">
          <h4
            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3"
          >
            Underused Tags (0-1 entries)
          </h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in stats.underusedTags"
              :key="tag.id"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300"
              @click="emit('select-tag', tag.id)"
            >
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: tag.color }" />
              {{ tag.name }}
              <span class="text-gray-400 dark:text-gray-500">({{ tag.entryCount }})</span>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
