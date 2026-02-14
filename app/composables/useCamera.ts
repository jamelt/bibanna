export interface CameraOptions {
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
}

export function useCamera(options: CameraOptions = {}) {
  const videoRef = ref<HTMLVideoElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const stream = ref<MediaStream | null>(null)
  const isActive = ref(false)
  const error = ref<string | null>(null)
  const hasPermission = ref<boolean | null>(null)

  const { facingMode = 'environment', width = 1280, height = 720 } = options

  async function start() {
    error.value = null

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      })

      stream.value = mediaStream
      hasPermission.value = true
      isActive.value = true

      if (videoRef.value) {
        videoRef.value.srcObject = mediaStream
        await videoRef.value.play()
      }
    } catch (err: any) {
      hasPermission.value = false

      if (err.name === 'NotAllowedError') {
        error.value = 'Camera permission denied'
      } else if (err.name === 'NotFoundError') {
        error.value = 'No camera found'
      } else {
        error.value = err.message || 'Failed to access camera'
      }
    }
  }

  function stop() {
    if (stream.value) {
      stream.value.getTracks().forEach((track) => track.stop())
      stream.value = null
    }

    if (videoRef.value) {
      videoRef.value.srcObject = null
    }

    isActive.value = false
  }

  function capture(): Blob | null {
    if (!videoRef.value || !canvasRef.value || !isActive.value) {
      return null
    }

    const video = videoRef.value
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0)

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob)
        },
        'image/jpeg',
        0.9,
      )
    })
  }

  async function captureAsBase64(): Promise<string | null> {
    if (!videoRef.value || !canvasRef.value || !isActive.value) {
      return null
    }

    const video = videoRef.value
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.9)
  }

  async function switchCamera() {
    stop()

    const currentFacing = options.facingMode || 'environment'
    options.facingMode = currentFacing === 'user' ? 'environment' : 'user'

    await start()
  }

  onUnmounted(() => {
    stop()
  })

  return {
    videoRef,
    canvasRef,
    isActive: readonly(isActive),
    error: readonly(error),
    hasPermission: readonly(hasPermission),
    start,
    stop,
    capture,
    captureAsBase64,
    switchCamera,
  }
}
