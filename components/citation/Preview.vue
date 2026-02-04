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
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-gray-900 dark:text-white">
          Citation Preview
        </h3>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-heroicons-arrow-path"
          :loading="pending"
          @click="refresh"
        >
          Refresh
        </UButton>
      </div>
    </template>

    <div v-if="pending" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <div v-else-if="error" class="text-center py-8">
      <UIcon name="i-heroicons-exclamation-circle" class="w-8 h-8 mx-auto text-red-400" />
      <p class="mt-2 text-sm text-red-500">Failed to load preview</p>
    </div>

    <div v-else-if="preview?.samples" class="space-y-6">
      <div
        v-for="(sample, index) in preview.samples"
        :key="sample.type"
        class="space-y-2"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {{ sample.type.replace(/_/g, ' ') }}
          </span>
          <UButton
            variant="ghost"
            size="xs"
            :icon="copiedIndex === index ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
            @click="copyToClipboard(sample.bibliography, index)"
          >
            {{ copiedIndex === index ? 'Copied' : 'Copy' }}
          </UButton>
        </div>

        <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div
            class="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
            v-html="sample.bibliography"
          />
        </div>

        <div class="flex items-center gap-2 text-xs text-gray-500">
          <span>In-text:</span>
          <code class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            {{ sample.inText }}
          </code>
        </div>
      </div>
    </div>

    <template #footer>
      <p class="text-xs text-gray-400">
        Style: {{ preview?.styleName || 'Loading...' }}
      </p>
    </template>
  </UCard>
</template>
