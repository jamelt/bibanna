<script setup lang="ts">
import type { Project, Tag } from '~/shared/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  imported: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const toast = useToast()

const bibtexContent = ref('')
const selectedProjectId = ref<string | null>(null)
const selectedTagIds = ref<string[]>([])
const isImporting = ref(false)
const previewCount = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const { data: projects } = useFetch<Project[]>('/api/projects', { lazy: true })
const { data: tags } = useFetch<Tag[]>('/api/tags', { lazy: true })

const canImport = computed(() => bibtexContent.value.trim().length > 0)

watch(bibtexContent, (value) => {
  if (!value.trim()) {
    previewCount.value = null
    return
  }
  const matches = value.match(/@\w+\s*\{/g)
  previewCount.value = matches ? matches.length : 0
})

function handleFileDrop(event: DragEvent) {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file) readFile(file)
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) readFile(file)
}

function readFile(file: File) {
  if (!file.name.endsWith('.bib') && !file.name.endsWith('.bibtex') && file.type !== 'text/plain') {
    toast.add({
      title: 'Unsupported file type',
      description: 'Please upload a .bib or .bibtex file.',
      color: 'error',
    })
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    bibtexContent.value = (e.target?.result as string) || ''
  }
  reader.readAsText(file)
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleImport() {
  if (!canImport.value) return

  isImporting.value = true
  try {
    const result = await $fetch<{
      imported: number
      skipped: number
      total: number
    }>('/api/entries/import', {
      method: 'POST',
      body: {
        bibtex: bibtexContent.value,
        projectId: selectedProjectId.value || undefined,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
      },
    })

    let description = `${result.imported} of ${result.total} entries imported.`
    if (result.skipped > 0) {
      description += ` ${result.skipped} skipped (tier limit).`
    }

    toast.add({
      title: 'Import complete',
      description,
      color: 'success',
    })

    emit('imported')
    resetAndClose()
  }
  catch (err: any) {
    toast.add({
      title: 'Import failed',
      description: err.data?.message || 'Please check the BibTeX format and try again.',
      color: 'error',
    })
  }
  finally {
    isImporting.value = false
  }
}

function resetAndClose() {
  bibtexContent.value = ''
  selectedProjectId.value = null
  selectedTagIds.value = []
  previewCount.value = null
  isOpen.value = false
}

watch(isOpen, (open) => {
  if (!open) {
    bibtexContent.value = ''
    selectedProjectId.value = null
    selectedTagIds.value = []
    previewCount.value = null
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      content: 'sm:max-w-2xl w-full max-h-[min(90vh,44rem)]',
    }"
  >
    <template #content>
      <div class="flex flex-col max-h-[min(90vh,44rem)] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Import BibTeX
          </h2>
          <UButton
            variant="ghost"
            icon="i-heroicons-x-mark"
            color="neutral"
            size="sm"
            @click="resetAndClose"
          />
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <!-- File upload zone -->
          <div
            class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-400 dark:hover:border-primary-600 transition-colors cursor-pointer"
            @click="triggerFileInput"
            @dragover.prevent
            @drop="handleFileDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".bib,.bibtex,.txt"
              class="hidden"
              @change="handleFileSelect"
            >
            <UIcon name="i-heroicons-arrow-up-tray" class="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Drop a .bib file here, or click to browse
            </p>
            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Supports BibTeX and BibLaTeX formats
            </p>
          </div>

          <!-- Or paste -->
          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span class="text-xs text-gray-400 uppercase">or paste</span>
            <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <!-- Textarea -->
          <UTextarea
            v-model="bibtexContent"
            placeholder="@article{example2024,
  author = {Smith, John and Doe, Jane},
  title = {Example Article Title},
  journal = {Nature},
  year = {2024},
  volume = {1},
  pages = {1--10}
}"
            :rows="8"
            class="font-mono text-sm"
          />

          <!-- Entry count preview -->
          <div v-if="previewCount !== null" class="flex items-center gap-2">
            <UBadge :color="previewCount > 0 ? 'primary' : 'neutral'" variant="subtle" size="sm">
              {{ previewCount }} {{ previewCount === 1 ? 'entry' : 'entries' }} detected
            </UBadge>
          </div>

          <!-- Options -->
          <div class="space-y-3">
            <UFormField label="Add to project">
              <USelectMenu
                v-model="selectedProjectId"
                :items="(projects || []).map(p => ({ ...p, description: p.description ?? undefined }))"
                placeholder="None (library only)"
                value-key="id"
                label-key="name"
                :ui="{ trigger: 'w-full' }"
              />
            </UFormField>

            <UFormField label="Apply tags" help="Type to create new tags on the fly">
              <AppInlineTagInput
                v-model="selectedTagIds"
                placeholder="Add or create tags..."
              />
            </UFormField>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <p class="text-xs text-gray-400 dark:text-gray-500">
            BibTeX entries will be parsed and added to your library.
          </p>
          <div class="flex gap-2">
            <UButton
              variant="outline"
              color="neutral"
              @click="resetAndClose"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="isImporting"
              :disabled="!canImport"
              @click="handleImport"
            >
              Import{{ previewCount ? ` ${previewCount} entries` : '' }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
