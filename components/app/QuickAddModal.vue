<script setup lang="ts">
import type { EntryType } from '~/shared/types'
import { ENTRY_TYPE_LABELS } from '~/shared/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', entry: any): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const { hasFeature } = useSubscription()

const inputMode = ref<'text' | 'voice' | 'url'>('text')
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const entryData = ref({
  title: '',
  authors: '',
  year: new Date().getFullYear(),
  entryType: 'book' as EntryType,
  url: '',
})

const voiceParsedData = ref<any>(null)
const voiceConfidence = ref(0)

const entryTypeOptions = Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function handleVoiceTranscript(text: string) {
  entryData.value.title = text
}

function handleVoiceParsed(result: any) {
  if (result.type === 'entry' && result.data) {
    voiceParsedData.value = result.data
    voiceConfidence.value = result.data.confidence || 0

    if (result.data.title) {
      entryData.value.title = result.data.title
    }
    if (result.data.authors?.length) {
      entryData.value.authors = result.data.authors
        .map((a: any) => `${a.firstName || ''} ${a.lastName}`.trim())
        .join(', ')
    }
    if (result.data.year) {
      entryData.value.year = result.data.year
    }
    if (result.data.entryType) {
      entryData.value.entryType = result.data.entryType
    }
  }
}

async function handleUrlLookup() {
  if (!entryData.value.url) return

  isSubmitting.value = true
  error.value = null

  try {
    const response = await $fetch<any>('/api/entries/lookup-url', {
      method: 'POST',
      body: { url: entryData.value.url },
    })

    if (response.title) entryData.value.title = response.title
    if (response.authors) entryData.value.authors = response.authors
    if (response.year) entryData.value.year = response.year
    if (response.entryType) entryData.value.entryType = response.entryType

    inputMode.value = 'text'
  }
  catch (err: any) {
    error.value = err.message || 'Failed to fetch URL metadata'
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleSubmit() {
  if (!entryData.value.title.trim()) {
    error.value = 'Title is required'
    return
  }

  isSubmitting.value = true
  error.value = null

  try {
    const authors = entryData.value.authors
      ? entryData.value.authors.split(',').map((name) => {
          const parts = name.trim().split(' ')
          if (parts.length === 1) {
            return { lastName: parts[0] }
          }
          return {
            firstName: parts.slice(0, -1).join(' '),
            lastName: parts[parts.length - 1],
          }
        })
      : []

    const entry = await $fetch('/api/entries', {
      method: 'POST',
      body: {
        title: entryData.value.title,
        authors,
        year: entryData.value.year,
        entryType: entryData.value.entryType,
        metadata: voiceParsedData.value?.metadata || {},
      },
    })

    emit('created', entry)
    resetForm()
    isOpen.value = false
  }
  catch (err: any) {
    error.value = err.message || 'Failed to create entry'
  }
  finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  entryData.value = {
    title: '',
    authors: '',
    year: new Date().getFullYear(),
    entryType: 'book',
    url: '',
  }
  voiceParsedData.value = null
  voiceConfidence.value = 0
  error.value = null
  inputMode.value = 'text'
}

watch(isOpen, (open) => {
  if (!open) {
    resetForm()
  }
})
</script>

<template>
  <UModal v-model="isOpen" :ui="{ width: 'max-w-lg' }">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Add
          </h2>
          <UButton
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="isOpen = false"
          />
        </div>
      </template>

      <div class="space-y-4">
        <!-- Input mode tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="inputMode === 'text'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="inputMode = 'text'"
          >
            <UIcon name="i-heroicons-pencil" class="w-4 h-4 inline mr-1" />
            Type
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="inputMode === 'voice'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="inputMode = 'voice'"
          >
            <UIcon name="i-heroicons-microphone" class="w-4 h-4 inline mr-1" />
            Voice
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="inputMode === 'url'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="inputMode = 'url'"
          >
            <UIcon name="i-heroicons-link" class="w-4 h-4 inline mr-1" />
            URL
          </button>
        </div>

        <!-- Voice input -->
        <div v-if="inputMode === 'voice'" class="py-4">
          <AppVoiceInput
            :use-whisper="hasFeature('whisperVoice')"
            placeholder="Say the title, author, and year..."
            @transcript="handleVoiceTranscript"
            @parsed="handleVoiceParsed"
          />

          <!-- Confidence indicator -->
          <div v-if="voiceConfidence > 0" class="mt-4 flex items-center gap-2">
            <span class="text-sm text-gray-500">Parsing confidence:</span>
            <UProgress :value="voiceConfidence" size="sm" class="w-32" />
            <span class="text-sm font-medium">{{ voiceConfidence }}%</span>
          </div>
        </div>

        <!-- URL input -->
        <div v-else-if="inputMode === 'url'" class="space-y-3">
          <UFormGroup label="Enter URL">
            <UInput
              v-model="entryData.url"
              placeholder="https://..."
              icon="i-heroicons-link"
            />
          </UFormGroup>
          <UButton
            :loading="isSubmitting"
            :disabled="!entryData.url"
            @click="handleUrlLookup"
          >
            Fetch Metadata
          </UButton>
        </div>

        <!-- Form fields (shown for text mode or after voice/URL) -->
        <div v-if="inputMode === 'text' || voiceParsedData || entryData.title" class="space-y-4">
          <UFormGroup label="Title" required>
            <UInput
              v-model="entryData.title"
              placeholder="Enter title..."
              autofocus
            />
          </UFormGroup>

          <UFormGroup label="Author(s)">
            <UInput
              v-model="entryData.authors"
              placeholder="John Smith, Jane Doe"
            />
            <template #hint>
              Separate multiple authors with commas
            </template>
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Year">
              <UInput
                v-model.number="entryData.year"
                type="number"
                :min="1000"
                :max="2100"
              />
            </UFormGroup>

            <UFormGroup label="Type">
              <USelectMenu
                v-model="entryData.entryType"
                :options="entryTypeOptions"
                value-attribute="value"
                option-attribute="label"
              />
            </UFormGroup>
          </div>
        </div>

        <!-- Error message -->
        <UAlert
          v-if="error"
          color="red"
          icon="i-heroicons-exclamation-circle"
          :title="error"
        />
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="outline" color="gray" @click="isOpen = false">
            Cancel
          </UButton>
          <UButton
            color="primary"
            :loading="isSubmitting"
            :disabled="!entryData.title"
            @click="handleSubmit"
          >
            Add Entry
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
