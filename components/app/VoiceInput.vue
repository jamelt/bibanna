<script setup lang="ts">
interface Props {
  placeholder?: string
  useWhisper?: boolean
  showTranscript?: boolean
  autoSubmit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Click to start speaking...',
  useWhisper: false,
  showTranscript: true,
  autoSubmit: false,
})

const emit = defineEmits<{
  (e: 'transcript', text: string): void
  (e: 'parsed', data: any): void
  (e: 'error', error: string): void
}>()

const { hasFeature } = useSubscription()
const canUseWhisper = computed(() => props.useWhisper && hasFeature('whisperVoice'))

const {
  isListening,
  isSupported,
  transcript,
  interimTranscript,
  error,
  start,
  stop,
  clear,
} = useVoiceInput({
  continuous: true,
  interimResults: true,
  onResult: (text, isFinal) => {
    if (isFinal && props.autoSubmit) {
      handleSubmit()
    }
  },
  onError: (err) => {
    emit('error', err)
  },
})

const isRecording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
const isProcessing = ref(false)
const whisperTranscript = ref('')

const displayTranscript = computed(() => {
  if (canUseWhisper.value) {
    return whisperTranscript.value
  }
  return transcript.value + (interimTranscript.value ? ` ${interimTranscript.value}` : '')
})

async function startWhisperRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    })

    audioChunks.value = []

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = async () => {
      stream.getTracks().forEach(track => track.stop())
      await processWhisperAudio()
    }

    mediaRecorder.value.start(1000)
    isRecording.value = true
  }
  catch (err: any) {
    emit('error', err.message || 'Failed to start recording')
  }
}

function stopWhisperRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
  }
}

async function processWhisperAudio() {
  if (audioChunks.value.length === 0) return

  isProcessing.value = true

  try {
    const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')

    const response = await $fetch<{ text: string }>('/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    })

    whisperTranscript.value = response.text
    emit('transcript', response.text)

    if (props.autoSubmit) {
      await handleParse(response.text)
    }
  }
  catch (err: any) {
    emit('error', err.message || 'Failed to transcribe audio')
  }
  finally {
    isProcessing.value = false
    audioChunks.value = []
  }
}

function handleToggle() {
  if (canUseWhisper.value) {
    if (isRecording.value) {
      stopWhisperRecording()
    }
    else {
      startWhisperRecording()
    }
  }
  else {
    if (isListening.value) {
      stop()
    }
    else {
      start()
    }
  }
}

async function handleSubmit() {
  const text = canUseWhisper.value ? whisperTranscript.value : transcript.value
  if (!text.trim()) return

  emit('transcript', text)
  await handleParse(text)
}

async function handleParse(text: string) {
  try {
    const response = await $fetch('/api/voice/parse', {
      method: 'POST',
      body: { transcript: text, mode: 'auto' },
    })

    emit('parsed', response)
  }
  catch (err: any) {
    console.error('Parse error:', err)
  }
}

function handleClear() {
  clear()
  whisperTranscript.value = ''
}

const activeListening = computed(() => {
  return canUseWhisper.value ? isRecording.value : isListening.value
})
</script>

<template>
  <div class="space-y-3">
    <!-- Main voice button -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        :disabled="!isSupported && !canUseWhisper"
        class="relative flex items-center justify-center w-14 h-14 rounded-full transition-all"
        :class="[
          activeListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-primary-500 text-white hover:bg-primary-600',
          (!isSupported && !canUseWhisper) && 'opacity-50 cursor-not-allowed',
        ]"
        @click="handleToggle"
      >
        <UIcon
          :name="activeListening ? 'i-heroicons-stop' : 'i-heroicons-microphone'"
          class="w-6 h-6"
        />

        <!-- Recording indicator -->
        <span
          v-if="activeListening"
          class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"
        />
      </button>

      <div class="flex-1">
        <p
          v-if="!isSupported && !canUseWhisper"
          class="text-sm text-gray-500"
        >
          Voice input is not supported in this browser
        </p>
        <p
          v-else-if="activeListening"
          class="text-sm text-red-500 font-medium"
        >
          Listening... Click to stop
        </p>
        <p
          v-else-if="isProcessing"
          class="text-sm text-primary-500"
        >
          Processing audio...
        </p>
        <p
          v-else
          class="text-sm text-gray-500"
        >
          {{ placeholder }}
        </p>
      </div>

      <!-- Whisper badge -->
      <UBadge
        v-if="canUseWhisper"
        color="purple"
        variant="subtle"
        size="xs"
      >
        Whisper AI
      </UBadge>
    </div>

    <!-- Transcript display -->
    <div
      v-if="showTranscript && displayTranscript"
      class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm text-gray-700 dark:text-gray-300 flex-1">
          {{ displayTranscript }}
          <span
            v-if="interimTranscript && !canUseWhisper"
            class="text-gray-400 italic"
          >
            {{ interimTranscript }}
          </span>
        </p>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-heroicons-x-mark"
          @click="handleClear"
        />
      </div>
    </div>

    <!-- Error display -->
    <UAlert
      v-if="error"
      color="red"
      icon="i-heroicons-exclamation-circle"
      :title="error"
      :close-button="{ icon: 'i-heroicons-x-mark', color: 'red', variant: 'link' }"
      @close="error = null"
    />

    <!-- Action buttons -->
    <div
      v-if="displayTranscript && !activeListening"
      class="flex gap-2"
    >
      <UButton
        size="sm"
        :loading="isProcessing"
        @click="handleSubmit"
      >
        Use Transcript
      </UButton>
      <UButton
        variant="outline"
        color="gray"
        size="sm"
        @click="handleClear"
      >
        Clear
      </UButton>
    </div>
  </div>
</template>
