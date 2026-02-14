<script setup lang="ts">
import type { AnnotationType, Annotation, Project } from '~/shared/types'
import { ANNOTATION_TYPE_LABELS } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()

const page = ref(1)
const pageSize = ref(20)
const searchQuery = ref('')
const typeFilter = ref('')
const projectFilter = ref<string | null>((route.query.projectId as string) || null)
const sortBy = ref('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const viewMode = useViewPreferences<'list' | 'table'>('annotations', 'list')

const debouncedSearch = refDebounced(searchQuery, 300)

const queryParams = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  search: debouncedSearch.value || undefined,
  type: typeFilter.value || undefined,
  projectId: projectFilter.value || undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}))

const {
  data: annotationsData,
  pending,
  refresh,
} = await useFetch('/api/annotations', {
  query: queryParams,
  watch: [queryParams],
})

const { data: projectsData } = await useFetch<Project[]>('/api/projects', { lazy: true })

const annotations = computed(() => annotationsData.value?.data || [])
const total = computed(() => annotationsData.value?.total || 0)
const totalPages = computed(() => annotationsData.value?.totalPages || 1)

const isEditModalOpen = ref(false)
const editingEntryId = ref('')
const editingAnnotation = ref<Annotation | undefined>(undefined)

const annotationTypeOptions = [
  { label: 'All Types', value: '' },
  ...Object.entries(ANNOTATION_TYPE_LABELS).map(([value, label]) => ({
    label,
    value,
  })),
]

const sortOptions = [
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'createdAt', label: 'Date Created' },
  { value: 'entryTitle', label: 'Source Title' },
  { value: 'annotationType', label: 'Type' },
  { value: 'entryYear', label: 'Year' },
]

const typeColorMap: Record<string, string> = {
  descriptive: 'info',
  evaluative: 'warning',
  reflective: 'success',
  summary: 'neutral',
  critical: 'error',
  custom: 'neutral',
}

const hasActiveFilters = computed(
  () => !!(searchQuery.value || typeFilter.value || projectFilter.value),
)

const selectedProjectName = computed(() => {
  if (!projectFilter.value || !projectsData.value) return null
  const p = projectsData.value.find((p) => p.id === projectFilter.value)
  return p?.name || null
})

function formatAuthors(authors: any[]) {
  if (!authors || authors.length === 0) return 'Unknown Author'
  if (authors.length === 1) {
    return `${authors[0].lastName}, ${authors[0].firstName}`
  }
  return `${authors[0].lastName}, ${authors[0].firstName} et al.`
}

function truncateContent(content: string, maxLength = 200) {
  const stripped = content
    .replace(/[#*_~`>\-[\]()]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
  if (stripped.length <= maxLength) return stripped
  return stripped.slice(0, maxLength).trim() + '...'
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function clearFilters() {
  searchQuery.value = ''
  typeFilter.value = ''
  projectFilter.value = null
  page.value = 1
}

function openEditModal(annotation: any) {
  editingEntryId.value = annotation.entryId
  editingAnnotation.value = {
    id: annotation.id,
    entryId: annotation.entryId,
    userId: '',
    content: annotation.content,
    annotationType: annotation.annotationType,
    highlights: annotation.highlights || [],
    sortOrder: annotation.sortOrder || 0,
    createdAt: new Date(annotation.createdAt),
    updatedAt: new Date(annotation.updatedAt),
  }
  isEditModalOpen.value = true
}

async function handleAnnotationSaved() {
  isEditModalOpen.value = false
  editingAnnotation.value = undefined
  editingEntryId.value = ''
  await refresh()
}

watch([debouncedSearch, typeFilter, projectFilter], () => {
  page.value = 1
})

// Keyboard navigation
const focusedIndex = ref(-1)

function handleKeydown(e: KeyboardEvent) {
  if (isEditModalOpen.value) return
  if (viewMode.value === 'table') return

  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    return

  const list = annotations.value
  if (list.length === 0) return

  switch (e.key) {
    case 'j':
    case 'ArrowDown':
      e.preventDefault()
      focusedIndex.value = Math.min(focusedIndex.value + 1, list.length - 1)
      scrollToFocused()
      break
    case 'k':
    case 'ArrowUp':
      e.preventDefault()
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      scrollToFocused()
      break
    case 'Enter': {
      e.preventDefault()
      const annotation = list[focusedIndex.value]
      if (annotation) {
        router.push(`/app/library/${annotation.entryId}`)
      }
      break
    }
    case 'e': {
      const annotation = list[focusedIndex.value]
      if (annotation) {
        e.preventDefault()
        openEditModal(annotation)
      }
      break
    }
    case 'Escape':
      focusedIndex.value = -1
      break
  }
}

function scrollToFocused() {
  nextTick(() => {
    const el = document.querySelector(`[data-annotation-index="${focusedIndex.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Annotations
          <span v-if="selectedProjectName" class="text-primary-500">
            &middot; {{ selectedProjectName }}
          </span>
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{ total }} {{ total === 1 ? 'annotation' : 'annotations'
          }}{{ selectedProjectName ? '' : ' across your library' }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/app/library"
          icon="i-heroicons-book-open"
          label="Library"
          variant="outline"
          color="neutral"
          size="sm"
        />
        <div class="w-px h-5 bg-gray-200 dark:bg-gray-700" />
        <UFieldGroup>
          <UButton
            icon="i-heroicons-list-bullet"
            :variant="viewMode === 'list' ? 'solid' : 'outline'"
            color="neutral"
            size="xs"
            @click="viewMode = 'list'"
          />
          <UButton
            icon="i-heroicons-table-cells"
            :variant="viewMode === 'table' ? 'solid' : 'outline'"
            color="neutral"
            size="xs"
            @click="viewMode = 'table'"
          />
        </UFieldGroup>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
      <div class="flex-1">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search annotations..."
          size="sm"
        />
      </div>

      <USelectMenu
        v-model="typeFilter"
        :items="annotationTypeOptions"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-full lg:w-40"
      />

      <USelectMenu
        v-model="projectFilter"
        :items="[
          { id: null, name: 'All projects' },
          ...(projectsData || []).map((p) => ({ id: p.id, name: p.name })),
        ]"
        placeholder="All projects"
        value-key="id"
        label-key="name"
        size="sm"
        class="w-full lg:w-40"
      />

      <USelectMenu
        v-model="sortBy"
        :items="sortOptions"
        value-key="value"
        size="sm"
        class="w-full lg:w-36"
      />

      <UButton
        :icon="sortOrder === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
        variant="outline"
        color="neutral"
        size="xs"
        @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
      />

      <UButton
        v-if="hasActiveFilters"
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="clearFilters"
      />
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty state: filters active but no results -->
    <UCard v-else-if="annotations.length === 0 && hasActiveFilters" class="text-center py-12">
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600"
      />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No matching annotations
      </h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        Try broadening your search, or remove some filters to see more results.
      </p>
      <UButton
        icon="i-heroicons-x-mark"
        label="Clear filters"
        variant="outline"
        color="neutral"
        class="mt-4"
        @click="clearFilters"
      />
    </UCard>

    <!-- Empty state: no annotations at all -->
    <UCard v-else-if="annotations.length === 0" class="py-12">
      <div class="text-center max-w-md mx-auto space-y-5">
        <UIcon
          name="i-heroicons-pencil-square"
          class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600"
        />
        <div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">No annotations yet</h3>
          <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Annotations let you record your thoughts, summaries, and critiques on sources. Open any
            entry in your library to add your first annotation.
          </p>
        </div>
        <UButton
          to="/app/library"
          icon="i-heroicons-book-open"
          label="Go to Library"
          color="primary"
        />
      </div>
    </UCard>

    <!-- Table view -->
    <AppAnnotationTable
      v-else-if="viewMode === 'table'"
      :data="annotations"
      :loading="pending"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      @update:sort-by="
        (v) => {
          sortBy = v
          page = 1
        }
      "
      @update:sort-order="(v) => (sortOrder = v)"
      @edit="openEditModal"
    />

    <!-- List view -->
    <div v-else class="space-y-2">
      <div
        v-for="(annotation, index) in annotations"
        :key="annotation.id"
        :data-annotation-index="index"
      >
        <UCard
          class="p-4 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer"
          :class="{
            'ring-2 ring-primary-300 dark:ring-primary-700 bg-primary-50/50 dark:bg-primary-900/10':
              focusedIndex === index,
          }"
        >
          <NuxtLink :to="`/app/library/${annotation.entryId}`" class="block space-y-2">
            <!-- Entry context + type badge -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-gray-400 shrink-0" />
                <span class="text-sm font-medium text-primary-600 dark:text-primary-400 truncate">
                  {{ annotation.entryTitle }}
                </span>
              </div>
              <UBadge
                :color="(typeColorMap[annotation.annotationType] as any) || 'neutral'"
                variant="subtle"
                size="xs"
                class="shrink-0"
              >
                {{ ANNOTATION_TYPE_LABELS[annotation.annotationType as AnnotationType] }}
              </UBadge>
            </div>

            <!-- Content preview -->
            <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              {{ truncateContent(annotation.content) }}
            </p>
          </NuxtLink>

          <!-- Footer with edit button -->
          <div
            class="flex items-center justify-between mt-2 text-xs text-gray-400 dark:text-gray-500"
          >
            <span>
              {{ formatAuthors(annotation.entryAuthors)
              }}{{ annotation.entryYear ? ` · ${annotation.entryYear}` : '' }}
            </span>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-heroicons-pencil"
                variant="ghost"
                color="neutral"
                size="xs"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Edit annotation"
                @click.prevent="openEditModal(annotation)"
              />
              <span>{{ formatDate(annotation.updatedAt) }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center">
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>

    <!-- Edit Annotation Modal -->
    <LazyAppAnnotationEditorModal
      v-model:open="isEditModalOpen"
      :entry-id="editingEntryId"
      :annotation="editingAnnotation"
      @saved="handleAnnotationSaved"
    />
  </div>
</template>
