<script setup lang="ts">
interface Props {
  styleId: string
  entryId?: string
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
})

const { data: preview, pending, error, refresh } = await useFetch('/api/citation/preview', {
  method: 'POST',
  body: computed(() => ({
    styleId: props.styleId,
  })),
  watch: [() => props.styleId],
  lazy: true,
})

const copiedIndex = ref<number | null>(null)

const isNoteStyle = computed(() => preview.value?.category === 'note')
const citationLabel = computed(() => isNoteStyle.value ? 'Footnote' : 'In-text')

async function copyToClipboard(text: string, index: number) {
  await navigator.clipboard.writeText(stripHtml(text))
  copiedIndex.value = index
  setTimeout(() => {
    copiedIndex.value = null
  }, 2000)
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header bar -->
    <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {{ preview?.styleName || 'Citation Preview' }}
        </h3>
        <p v-if="preview?.category" class="text-xs text-gray-500 capitalize">
          {{ preview.category.replace('-', ' ') }} style
        </p>
      </div>
      <UButton
        variant="ghost"
        size="xs"
        color="neutral"
        icon="i-heroicons-arrow-path"
        :loading="pending"
        @click="refresh"
      />
    </div>

    <!-- Content area -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <!-- Loading -->
      <div v-if="pending" class="flex items-center justify-center py-16">
        <div class="text-center space-y-3">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400 mx-auto" />
          <p class="text-sm text-gray-500">Loading preview...</p>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-center justify-center py-16">
        <div class="text-center space-y-3 max-w-xs">
          <UIcon name="i-heroicons-exclamation-circle" class="w-10 h-10 mx-auto text-red-400" />
          <p class="text-sm font-medium text-red-600 dark:text-red-400">Failed to load preview</p>
          <p class="text-xs text-gray-500">
            The citation style could not be fetched. This may be a temporary network issue.
          </p>
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            icon="i-heroicons-arrow-path"
            @click="refresh"
          >
            Try Again
          </UButton>
        </div>
      </div>

      <!-- Document-style preview -->
      <div v-else-if="preview?.samples" class="p-5 lg:p-8">
        <!-- Paper surface -->
        <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 mx-auto max-w-2xl">
          <!-- Page header -->
          <div class="px-8 pt-8 pb-4 border-b border-gray-100 dark:border-gray-800">
            <p class="text-xs font-medium tracking-widest uppercase text-gray-400">
              Bibliography
            </p>
          </div>

          <!-- Bibliography entries -->
          <div class="px-8 py-6 space-y-5">
            <div
              v-for="(sample, index) in preview.samples"
              :key="sample.type"
              class="group"
            >
              <!-- Bibliography entry -->
              <div class="relative">
                <div
                  class="text-sm leading-relaxed text-gray-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none [&_.csl-entry]:pl-8 [&_.csl-entry]:-indent-8"
                  v-html="sample.bibliography"
                />
                <button
                  class="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  @click="copyToClipboard(sample.bibliography, index)"
                >
                  <UIcon
                    :name="copiedIndex === index ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                    class="w-3.5 h-3.5"
                    :class="copiedIndex === index ? 'text-green-500' : 'text-gray-400'"
                  />
                </button>
              </div>

              <!-- Citation annotation -->
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span class="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <span class="font-medium text-gray-400">{{ citationLabel }}:</span>
                  <code class="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono">
                    {{ sample.inText }}
                  </code>
                </span>

                <span v-if="sample.subsequentNote" class="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <span class="font-medium text-gray-400">Subsequent:</span>
                  <code class="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono">
                    {{ sample.subsequentNote }}
                  </code>
                </span>
              </div>

              <!-- Type label -->
              <p class="mt-1 text-[11px] text-gray-400 uppercase tracking-wide">
                {{ sample.type.replace(/_/g, ' ') }}
              </p>

              <!-- Separator -->
              <div
                v-if="index < preview.samples.length - 1"
                class="mt-5 border-t border-dashed border-gray-100 dark:border-gray-800"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex items-center justify-center py-16">
        <div class="text-center space-y-2">
          <UIcon name="i-heroicons-document-text" class="w-8 h-8 mx-auto text-gray-300" />
          <p class="text-sm text-gray-500">Select a style to preview</p>
        </div>
      </div>
    </div>
  </div>
</template>
