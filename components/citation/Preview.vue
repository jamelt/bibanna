<script setup lang="ts">
interface Props {
  styleId: string
  entryId?: string
}

const props = defineProps<Props>()

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

const hasBibliography = computed(() =>
  preview.value?.samples?.some((s: any) => s.bibliography && stripHtml(s.bibliography).trim()),
)

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
        <div class="citation-paper bg-white dark:bg-gray-900 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 mx-auto max-w-2xl">
          <!-- Page header -->
          <div class="px-8 pt-8 pb-4 border-b border-gray-100 dark:border-gray-800">
            <p class="text-xs font-medium tracking-widest uppercase text-gray-400">
              {{ hasBibliography ? 'Bibliography' : 'Footnotes' }}
            </p>
          </div>

          <!-- Entries -->
          <div class="px-8 py-6 space-y-5">
            <div
              v-for="(sample, index) in preview.samples"
              :key="sample.type"
              class="group"
            >
              <!-- Bibliography entry (when available) -->
              <div v-if="sample.bibliography && stripHtml(sample.bibliography).trim()" class="relative">
                <div
                  class="bib-entry text-sm leading-relaxed text-gray-800 dark:text-gray-200 max-w-none"
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

              <!-- Footnote-only: show the first citation as primary display -->
              <div v-else-if="sample.inText" class="relative">
                <div
                  class="bib-entry text-sm leading-relaxed text-gray-800 dark:text-gray-200 max-w-none"
                  v-html="sample.inText"
                />
                <button
                  class="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  @click="copyToClipboard(sample.inText, index)"
                >
                  <UIcon
                    :name="copiedIndex === index ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                    class="w-3.5 h-3.5"
                    :class="copiedIndex === index ? 'text-green-500' : 'text-gray-400'"
                  />
                </button>
              </div>

              <!-- Citation annotations -->
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <!-- Only show in-text label when we have a bibliography (otherwise in-text is the main display) -->
                <span v-if="hasBibliography && sample.inText" class="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <span class="font-medium text-gray-400">{{ citationLabel }}:</span>
                  <code
                    class="inline-cite px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono"
                    v-html="sample.inText"
                  />
                </span>

                <span v-if="sample.subsequentNote" class="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <span class="font-medium text-gray-400">Subsequent:</span>
                  <code
                    class="inline-cite px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono"
                    v-html="sample.subsequentNote"
                  />
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

<style scoped>
/* CSL bibliography: numbered styles use csl-left-margin + csl-right-inline */
.bib-entry :deep(.csl-left-margin) {
  display: inline;
  padding-right: 0.5em;
}

.bib-entry :deep(.csl-right-inline) {
  display: inline;
}

/* Author-date styles: hanging indent (entries with no csl-left-margin child) */
.bib-entry :deep(.csl-entry) {
  padding-left: 2em;
  text-indent: -2em;
}

/* Reset hanging indent for numbered styles that use left-margin layout */
.bib-entry :deep(.csl-entry:has(.csl-left-margin)) {
  padding-left: 0;
  text-indent: 0;
}

/* Fallback for browsers without :has() support - use csl-bib-body second-field-align */
.bib-entry :deep(.csl-bib-body[data-second-field-align]) .csl-entry {
  padding-left: 0;
  text-indent: 0;
}

/* In-text citation: render inline HTML */
.inline-cite :deep(sup) {
  font-size: 0.75em;
  vertical-align: super;
  line-height: 0;
}

.inline-cite :deep(i),
.inline-cite :deep(em) {
  font-style: italic;
}

.inline-cite :deep(b),
.inline-cite :deep(strong) {
  font-weight: 600;
}

/* Inline HTML in footnote-only primary display */
.bib-entry :deep(i),
.bib-entry :deep(em) {
  font-style: italic;
}

.bib-entry :deep(span[style*="small-caps"]) {
  font-variant: small-caps;
}
</style>
