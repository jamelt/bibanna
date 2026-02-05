export interface ShareData {
  title?: string
  text?: string
  url?: string
  files?: File[]
}

export function useNativeShare() {
  const isSupported = ref(false)
  const canShareFiles = ref(false)
  const error = ref<string | null>(null)

  onMounted(() => {
    isSupported.value = 'share' in navigator
    canShareFiles.value = 'canShare' in navigator
  })

  async function share(data: ShareData): Promise<boolean> {
    error.value = null
    
    if (!isSupported.value) {
      error.value = 'Web Share API not supported'
      return false
    }
    
    try {
      if (data.files && canShareFiles.value) {
        const canShare = navigator.canShare({ files: data.files })
        if (!canShare) {
          delete data.files
        }
      }
      
      await navigator.share(data)
      return true
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return false
      }
      
      error.value = err.message || 'Share failed'
      return false
    }
  }

  async function shareEntry(entry: {
    title: string
    authors?: Array<{ firstName: string; lastName: string }>
    url?: string
    year?: number
  }): Promise<boolean> {
    const authorText = entry.authors
      ?.map(a => `${a.firstName} ${a.lastName}`)
      .join(', ')
    
    const text = [
      entry.title,
      authorText ? `by ${authorText}` : null,
      entry.year ? `(${entry.year})` : null,
    ].filter(Boolean).join(' ')
    
    return share({
      title: entry.title,
      text,
      url: entry.url,
    })
  }

  async function shareBibliography(
    title: string,
    citations: string[],
    format: 'text' | 'file' = 'text',
  ): Promise<boolean> {
    const content = citations.join('\n\n')
    
    if (format === 'file' && canShareFiles.value) {
      const file = new File(
        [content],
        `${title.replace(/[^a-z0-9]/gi, '_')}_bibliography.txt`,
        { type: 'text/plain' },
      )
      
      return share({
        title: `${title} - Bibliography`,
        files: [file],
      })
    }
    
    return share({
      title: `${title} - Bibliography`,
      text: content,
    })
  }

  function copyToClipboard(text: string): Promise<boolean> {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch(() => false)
  }

  return {
    isSupported: readonly(isSupported),
    canShareFiles: readonly(canShareFiles),
    error: readonly(error),
    share,
    shareEntry,
    shareBibliography,
    copyToClipboard,
  }
}
