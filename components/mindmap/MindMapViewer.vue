<script setup lang="ts">
interface Props {
  projectId?: string
  scope?: 'project' | 'library'
}

const props = withDefaults(defineProps<Props>(), {
  scope: 'project',
})

const containerRef = ref<HTMLElement | null>(null)
const isSidebarOpen = ref(false)

const showAuthors = ref(true)
const showTags = ref(true)
const showSameAuthorEdges = ref(true)
const showSimilarEdges = ref(false)

const graphEndpoint = computed(() => {
  if (props.scope === 'library') {
    return '/api/entries/graph'
  }
  return `/api/projects/${props.projectId}/graph`
})

const queryParams = computed(() => ({
  showAuthors: showAuthors.value,
  showTags: showTags.value,
  showSameAuthorEdges: showSameAuthorEdges.value,
  showSimilarEdges: showSimilarEdges.value,
}))

const { data: graphData, pending, refresh } = await useFetch(
  graphEndpoint,
  {
    query: queryParams,
    watch: [queryParams, graphEndpoint],
    lazy: true,
  },
)

const selectedNode = ref<any>(null)
const showNodeDetails = ref(false)

const {
  update,
  zoomToFit,
  exportSVG,
  hoveredNode,
} = useMindMap(containerRef, {
  width: 1200,
  height: 800,
  nodeRadius: 10,
  linkDistance: 120,
  chargeStrength: -400,
  onNodeClick: (node) => {
    selectedNode.value = node
    showNodeDetails.value = true
  },
  onNodeHover: (node) => {
  },
})

watch(graphData, (data) => {
  if (data) {
    update(data.nodes || [], data.edges || [])
    nextTick(() => {
      setTimeout(zoomToFit, 500)
    })
  }
}, { immediate: true })

function handleExportSVG() {
  const svgString = exportSVG()
  if (!svgString) return

  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `mindmap-${props.projectId || 'library'}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

function copyToClipboard() {
  const svgString = exportSVG()
  if (svgString) {
    navigator.clipboard.writeText(svgString)
  }
}

const legend = [
  { type: 'entry', label: 'Entry', color: '#6366f1' },
  { type: 'author', label: 'Author', color: '#10b981' },
  { type: 'tag', label: 'Tag', color: '#f59e0b' },
]

const edgeLegend = [
  { type: 'authored_by', label: 'Authored by', color: '#10b981' },
  { type: 'has_tag', label: 'Has tag', color: '#f59e0b' },
  { type: 'same_author', label: 'Same author', color: '#a855f7' },
  { type: 'similar_to', label: 'Similar topic', color: '#94a3b8' },
]

const stats = computed(() => {
  if (!graphData.value) return { nodes: 0, edges: 0, entries: 0, authors: 0, tags: 0 }

  return {
    nodes: graphData.value.nodes?.length || 0,
    edges: graphData.value.edges?.length || 0,
    entries: graphData.value.nodes?.filter(n => n.type === 'entry').length || 0,
    authors: graphData.value.nodes?.filter(n => n.type === 'author').length || 0,
    tags: graphData.value.nodes?.filter(n => n.type === 'tag').length || 0,
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <UButton
          variant="ghost"
          size="sm"
          icon="i-heroicons-adjustments-horizontal"
          class="lg:hidden"
          @click="isSidebarOpen = true"
        />
        <span class="text-xs sm:text-sm text-gray-500 truncate">
          {{ stats.entries }} entries, {{ stats.authors }} authors, {{ stats.tags }} tags
        </span>
      </div>

      <div class="flex items-center gap-1 sm:gap-2 shrink-0">
        <UButton variant="ghost" size="sm" icon="i-heroicons-arrow-path" class="hidden sm:flex" @click="refresh">
          Refresh
        </UButton>
        <UButton variant="ghost" size="sm" icon="i-heroicons-arrow-path" class="sm:hidden" @click="refresh" />
        <UButton variant="ghost" size="sm" icon="i-heroicons-viewfinder-circle" class="hidden sm:flex" @click="zoomToFit">
          Fit
        </UButton>
        <UButton variant="ghost" size="sm" icon="i-heroicons-viewfinder-circle" class="sm:hidden" @click="zoomToFit" />
        <UDropdownMenu
          :items="[
            [
              { label: 'Export SVG', icon: 'i-heroicons-arrow-down-tray', onSelect: handleExportSVG },
              { label: 'Copy SVG', icon: 'i-heroicons-clipboard', onSelect: copyToClipboard },
            ],
          ]"
        >
          <UButton variant="ghost" size="sm" icon="i-heroicons-ellipsis-vertical" />
        </UDropdownMenu>
      </div>
    </div>

    <div class="flex-1 flex">
      <!-- Filters sidebar - Desktop -->
      <div class="hidden lg:block w-56 border-r border-gray-200 dark:border-gray-700 p-4 space-y-6">
        <div>
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Show Nodes
          </h3>
          <div class="space-y-2">
            <UCheckbox v-model="showAuthors" label="Authors" />
            <UCheckbox v-model="showTags" label="Tags" />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Show Connections
          </h3>
          <div class="space-y-2">
            <UCheckbox v-model="showSameAuthorEdges" label="Same author" />
            <UCheckbox v-model="showSimilarEdges" label="Similar topics" />
          </div>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Node Legend
          </h3>
          <div class="space-y-2">
            <div v-for="item in legend" :key="item.type" class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: item.color }"
              />
              <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Edge Legend
          </h3>
          <div class="space-y-2">
            <div v-for="item in edgeLegend" :key="item.type" class="flex items-center gap-2">
              <div
                class="w-4 h-0.5"
                :style="{ backgroundColor: item.color }"
              />
              <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Graph container -->
      <div class="flex-1 relative bg-gray-50 dark:bg-gray-900">
        <div v-if="pending" class="absolute inset-0 flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
        </div>

        <div v-else-if="!graphData?.nodes?.length" class="absolute inset-0 flex flex-col items-center justify-center">
          <UIcon name="i-heroicons-share" class="w-16 h-16 text-gray-300" />
          <p class="mt-4 text-gray-500">
            {{ scope === 'library' ? 'No entries in your library yet' : 'No entries in this project yet' }}
          </p>
          <p class="text-sm text-gray-400">Add entries to visualize their relationships</p>
        </div>

        <div
          ref="containerRef"
          class="w-full h-full"
        />

        <!-- Hover tooltip -->
        <div
          v-if="hoveredNode"
          class="absolute top-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 max-w-xs"
        >
          <div class="flex items-start gap-2">
            <div
              class="w-3 h-3 rounded-full shrink-0 mt-1"
              :style="{ backgroundColor: legend.find(l => l.type === hoveredNode.type)?.color }"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-white text-sm">
                {{ hoveredNode.label }}
              </p>
              <p class="text-xs text-gray-500 capitalize">
                {{ hoveredNode.type }}
              </p>
              <div v-if="hoveredNode.metadata?.year" class="text-xs text-gray-400 mt-1">
                {{ hoveredNode.metadata.year }}
              </div>
              <div v-if="hoveredNode.metadata?.authors?.length" class="text-xs text-gray-400">
                {{ hoveredNode.metadata.authors.slice(0, 2).join(', ') }}
                {{ hoveredNode.metadata.authors.length > 2 ? '...' : '' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Node details slideover -->
    <USlideover v-model:open="showNodeDetails">
      <template #content="{ close }">
        <div v-if="selectedNode" class="p-6 space-y-4 h-full overflow-y-auto bg-white dark:bg-gray-900">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div
                class="w-4 h-4 rounded-full"
                :style="{ backgroundColor: legend.find(l => l.type === selectedNode.type)?.color }"
              />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedNode.label }}
              </h3>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              size="sm"
              @click="close"
            />
          </div>

          <div>
            <span class="text-xs text-gray-500 uppercase">Type</span>
            <p class="text-gray-900 dark:text-white capitalize">{{ selectedNode.type }}</p>
          </div>

          <div v-if="selectedNode.metadata?.year">
            <span class="text-xs text-gray-500 uppercase">Year</span>
            <p class="text-gray-900 dark:text-white">{{ selectedNode.metadata.year }}</p>
          </div>

          <div v-if="selectedNode.metadata?.entryType">
            <span class="text-xs text-gray-500 uppercase">Entry Type</span>
            <p class="text-gray-900 dark:text-white capitalize">
              {{ selectedNode.metadata.entryType.replace(/_/g, ' ') }}
            </p>
          </div>

          <div v-if="selectedNode.metadata?.authors?.length">
            <span class="text-xs text-gray-500 uppercase">Authors</span>
            <ul class="text-gray-900 dark:text-white">
              <li v-for="author in selectedNode.metadata.authors" :key="author">
                {{ author }}
              </li>
            </ul>
          </div>

          <div v-if="selectedNode.metadata?.annotationCount">
            <span class="text-xs text-gray-500 uppercase">Annotations</span>
            <p class="text-gray-900 dark:text-white">{{ selectedNode.metadata.annotationCount }}</p>
          </div>

          <div v-if="selectedNode.type === 'entry'" class="pt-4">
            <NuxtLink
              :to="`/app/library/${selectedNode.slug || selectedNode.id}`"
              class="text-primary-600 hover:text-primary-700 text-sm"
            >
              View full entry →
            </NuxtLink>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Filters sidebar - Mobile -->
    <USlideover v-model:open="isSidebarOpen" side="left" class="lg:hidden">
      <template #content="{ close }">
        <div class="p-6 space-y-6 h-full overflow-y-auto bg-white dark:bg-gray-900">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Filters & Legend
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              size="sm"
              @click="close"
            />
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Show Nodes
            </h3>
            <div class="space-y-2">
              <UCheckbox v-model="showAuthors" label="Authors" />
              <UCheckbox v-model="showTags" label="Tags" />
            </div>
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Show Connections
            </h3>
            <div class="space-y-2">
              <UCheckbox v-model="showSameAuthorEdges" label="Same author" />
              <UCheckbox v-model="showSimilarEdges" label="Similar topics" />
            </div>
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Node Legend
            </h3>
            <div class="space-y-2">
              <div v-for="item in legend" :key="item.type" class="flex items-center gap-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: item.color }"
                />
                <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.label }}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Edge Legend
            </h3>
            <div class="space-y-2">
              <div v-for="item in edgeLegend" :key="item.type" class="flex items-center gap-2">
                <div
                  class="w-4 h-0.5"
                  :style="{ backgroundColor: item.color }"
                />
                <span class="text-xs text-gray-600 dark:text-gray-400">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
