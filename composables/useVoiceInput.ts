export interface VoiceInputOptions {
  continuous?: boolean
  interimResults?: boolean
  language?: string
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

export interface VoiceInputState {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
}

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US',
    onResult,
    onError,
    onEnd,
  } = options

  const state = reactive<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
  })

  let recognition: SpeechRecognition | null = null

  onMounted(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      state.isSupported = true
      recognition = new SpeechRecognition()
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = language

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            final += result[0].transcript
          }
          else {
            interim += result[0].transcript
          }
        }

        state.interimTranscript = interim

        if (final) {
          state.transcript += final
          onResult?.(final, true)
        }
        else if (interim) {
          onResult?.(interim, false)
        }
      }

      recognition.onerror = (event) => {
        const errorMessages: Record<string, string> = {
          'no-speech': 'No speech detected. Please try again.',
          'audio-capture': 'No microphone found. Please check your settings.',
          'not-allowed': 'Microphone access denied. Please allow microphone access.',
          'network': 'Network error occurred. Please check your connection.',
          'aborted': 'Speech recognition was aborted.',
          'service-not-allowed': 'Speech recognition service is not allowed.',
        }

        const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`
        state.error = message
        state.isListening = false
        onError?.(message)
      }

      recognition.onend = () => {
        state.isListening = false
        onEnd?.()
      }
    }
  })

  function start() {
    if (!recognition) {
      state.error = 'Speech recognition is not supported in this browser'
      return
    }

    state.error = null
    state.transcript = ''
    state.interimTranscript = ''

    try {
      recognition.start()
      state.isListening = true
    }
    catch (error: any) {
      if (error.message?.includes('already started')) {
        recognition.stop()
        setTimeout(() => {
          recognition?.start()
          state.isListening = true
        }, 100)
      }
      else {
        state.error = error.message
        onError?.(error.message)
      }
    }
  }

  function stop() {
    if (recognition && state.isListening) {
      recognition.stop()
      state.isListening = false
    }
  }

  function toggle() {
    if (state.isListening) {
      stop()
    }
    else {
      start()
    }
  }

  function clear() {
    state.transcript = ''
    state.interimTranscript = ''
    state.error = null
  }

  onUnmounted(() => {
    if (recognition) {
      recognition.stop()
      recognition = null
    }
  })

  return {
    ...toRefs(state),
    start,
    stop,
    toggle,
    clear,
  }
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
