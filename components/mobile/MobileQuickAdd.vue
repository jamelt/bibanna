<script setup lang="ts">
import type { EntryType } from '~/shared/types'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', entry: any): void
}>()

const activeTab = ref<'url' | 'camera' | 'voice' | 'manual'>('url')
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const urlInput = ref('')
const capturedImage = ref<string | null>(null)
const voiceTranscript = ref('')
const parsedData = ref<any>(null)

const { start: startCamera, stop: stopCamera, captureAsBase64, isActive: cameraActive, videoRef, canvasRef } = useCamera()
const { isSupported: voiceSupported } = useVoiceInput()
const { hasFeature } = useSubscription()

const manualEntry = ref({
  title: '',
  authors: '',
  year: new Date().getFullYear(),
  entryType: 'book' as EntryType,
})

async function handleUrlSubmit() {
  if (!urlInput.value.trim()) return
  
  isSubmitting.value = true
  error.value = null
  
  try {
    const response = await $fetch<any>('/api/entries/lookup-url', {
      method: 'POST',
      body: { url: urlInput.value },
    })
    
    parsedData.value = response
    activeTab.value = 'manual'
    
    if (response.title) manualEntry.value.title = response.title
    if (response.year) manualEntry.value.year = response.year
    if (response.entryType) manualEntry.value.entryType = response.entryType
    if (response.authors) {
      manualEntry.value.authors = response.authors
        .map((a: any) => `${a.firstName} ${a.lastName}`)
        .join(', ')
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch URL data'
  } finally {
    isSubmitting.value = false
  }
}

async function handleCameraCapture() {
  const image = await captureAsBase64()
  if (image) {
    capturedImage.value = image
    stopCamera()
    
    isSubmitting.value = true
    try {
      const response = await $fetch<any>('/api/entries/analyze-image', {
        method: 'POST',
        body: { image: image.split(',')[1] },
      })
      
      if (response.bookInfo) {
        parsedData.value = response.bookInfo
        activeTab.value = 'manual'
        
        if (response.bookInfo.title) manualEntry.value.title = response.bookInfo.title
        if (response.bookInfo.authors) {
          manualEntry.value.authors = response.bookInfo.authors.join(', ')
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to analyze image'
    } finally {
      isSubmitting.value = false
    }
  }
}

function handleVoiceResult(text: string) {
  voiceTranscript.value = text
}

async function handleVoiceParsed(result: any) {
  if (result.type === 'entry' && result.data) {
    parsedData.value = result.data
    activeTab.value = 'manual'
    
    if (result.data.title) manualEntry.value.title = result.data.title
    if (result.data.year) manualEntry.value.year = result.data.year
    if (result.data.entryType) manualEntry.value.entryType = result.data.entryType
    if (result.data.authors?.length) {
      manualEntry.value.authors = result.data.authors
        .map((a: any) => `${a.firstName || ''} ${a.lastName}`.trim())
        .join(', ')
    }
  }
}

async function handleSubmit() {
  if (!manualEntry.value.title.trim()) {
    error.value = 'Title is required'
    return
  }
  
  isSubmitting.value = true
  error.value = null
  
  try {
    const authors = manualEntry.value.authors
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => {
        const parts = name.split(' ')
        return {
          firstName: parts.slice(0, -1).join(' '),
          lastName: parts[parts.length - 1],
        }
      })
    
    const response = await $fetch<any>('/api/entries', {
      method: 'POST',
      body: {
        ...manualEntry.value,
        authors,
        metadata: parsedData.value?.metadata || {},
      },
    })
    
    emit('created', response)
    emit('close')
  } catch (err: any) {
    error.value = err.message || 'Failed to create entry'
  } finally {
    isSubmitting.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'camera') {
    startCamera()
  } else {
    stopCamera()
  }
})

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col safe-area">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Add</h2>
      <UButton
        variant="ghost"
        icon="i-heroicons-x-mark"
        @click="$emit('close')"
      />
    </div>

    <!-- Tab navigation -->
    <div class="flex border-b border-gray-200 dark:border-gray-700">
      <button
        v-for="tab in [
          { id: 'url', icon: 'i-heroicons-link', label: 'URL' },
          { id: 'camera', icon: 'i-heroicons-camera', label: 'Camera' },
          { id: 'voice', icon: 'i-heroicons-microphone', label: 'Voice' },
          { id: 'manual', icon: 'i-heroicons-pencil', label: 'Manual' },
        ]"
        :key="tab.id"
        type="button"
        class="flex-1 flex flex-col items-center gap-1 py-3 text-sm transition-colors"
        :class="activeTab === tab.id 
          ? 'text-primary-600 border-b-2 border-primary-500' 
          : 'text-gray-500'"
        @click="activeTab = tab.id"
      >
        <UIcon :name="tab.icon" class="w-5 h-5" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- URL Tab -->
      <div v-if="activeTab === 'url'" class="space-y-4">
        <UFormGroup label="Paste a URL">
          <UInput
            v-model="urlInput"
            placeholder="https://example.com/article"
            size="lg"
            @keyup.enter="handleUrlSubmit"
          />
        </UFormGroup>
        <UButton
          block
          color="primary"
          size="lg"
          :loading="isSubmitting"
          :disabled="!urlInput.trim()"
          @click="handleUrlSubmit"
        >
          Fetch Details
        </UButton>
      </div>

      <!-- Camera Tab -->
      <div v-else-if="activeTab === 'camera'" class="space-y-4">
        <div v-if="cameraActive" class="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
          <video
            ref="videoRef"
            autoplay
            playsinline
            class="w-full h-full object-cover"
          />
          <canvas ref="canvasRef" class="hidden" />
        </div>
        <div v-else-if="capturedImage" class="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
          <img :src="capturedImage" class="w-full h-full object-contain" />
        </div>
        <div v-else class="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-camera" class="w-16 h-16 text-gray-400" />
        </div>
        
        <div class="flex gap-2">
          <UButton
            v-if="!cameraActive && !capturedImage"
            block
            color="primary"
            size="lg"
            icon="i-heroicons-camera"
            @click="startCamera"
          >
            Open Camera
          </UButton>
          <UButton
            v-else-if="cameraActive"
            block
            color="primary"
            size="lg"
            icon="i-heroicons-camera"
            :loading="isSubmitting"
            @click="handleCameraCapture"
          >
            Capture
          </UButton>
          <template v-else>
            <UButton
              block
              variant="outline"
              size="lg"
              @click="capturedImage = null; startCamera()"
            >
              Retake
            </UButton>
          </template>
        </div>
      </div>

      <!-- Voice Tab -->
      <div v-else-if="activeTab === 'voice'" class="space-y-4">
        <div class="text-center py-8">
          <AppVoiceInput
            :use-whisper="hasFeature('whisperVoice')"
            placeholder="Tap to start speaking"
            @transcript="handleVoiceResult"
            @parsed="handleVoiceParsed"
          />
        </div>
        
        <div v-if="voiceTranscript" class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-300">{{ voiceTranscript }}</p>
        </div>
      </div>

      <!-- Manual Tab -->
      <div v-else-if="activeTab === 'manual'" class="space-y-4">
        <UFormGroup label="Title" required>
          <UInput
            v-model="manualEntry.title"
            placeholder="Enter title"
            size="lg"
          />
        </UFormGroup>
        
        <UFormGroup label="Authors">
          <UInput
            v-model="manualEntry.authors"
            placeholder="John Doe, Jane Smith"
            size="lg"
          />
        </UFormGroup>
        
        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Year">
            <UInput
              v-model.number="manualEntry.year"
              type="number"
              size="lg"
            />
          </UFormGroup>
          
          <UFormGroup label="Type">
            <USelect
              v-model="manualEntry.entryType"
              :options="[
                { value: 'book', label: 'Book' },
                { value: 'journal_article', label: 'Article' },
                { value: 'website', label: 'Website' },
                { value: 'conference_paper', label: 'Conference' },
              ]"
              size="lg"
            />
          </UFormGroup>
        </div>
      </div>
    </div>

    <!-- Error -->
    <UAlert
      v-if="error"
      color="red"
      class="mx-4"
      :close-button="{ icon: 'i-heroicons-x-mark' }"
      @close="error = null"
    >
      {{ error }}
    </UAlert>

    <!-- Footer -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
      <UButton
        block
        color="primary"
        size="lg"
        :loading="isSubmitting"
        :disabled="activeTab !== 'manual' || !manualEntry.title.trim()"
        @click="handleSubmit"
      >
        Save Entry
      </UButton>
    </div>
  </div>
</template>

<style scoped>
.safe-area {
  padding-top: env(safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
