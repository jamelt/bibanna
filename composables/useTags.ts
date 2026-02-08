import type { Tag } from '~/shared/types'

const TAG_COLORS = [
  '#4F46E5',
  '#7C3AED',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6B7280',
]

function pickRandomColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

export function useTags() {
  const tags = useState<Tag[]>('user-tags', () => [])
  const loading = useState('tags-loading', () => false)
  const initialized = useState('tags-initialized', () => false)

  async function fetchTags(force = false) {
    if (initialized.value && !force) return tags.value
    loading.value = true
    try {
      const data = await $fetch<Tag[]>('/api/tags')
      tags.value = data
      initialized.value = true
      return data
    } finally {
      loading.value = false
    }
  }

  async function createTag(name: string, color?: string): Promise<Tag> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Tag name is required')

    const existing = tags.value.find(
      t => t.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) return existing

    const newTag = await $fetch<Tag>('/api/tags', {
      method: 'POST',
      body: {
        name: trimmed,
        color: color || pickRandomColor(),
      },
    })

    tags.value = [...tags.value, newTag]
    return newTag
  }

  async function createTagsBatch(names: string[]): Promise<Tag[]> {
    const results: Tag[] = []
    for (const name of names) {
      const trimmed = name.trim()
      if (!trimmed) continue
      try {
        const tag = await createTag(trimmed)
        results.push(tag)
      } catch {
        // skip duplicates or failures silently
      }
    }
    return results
  }

  async function updateTag(tagId: string, data: Partial<{ name: string; color: string; description: string }>): Promise<Tag> {
    const updated = await $fetch<Tag>(`/api/tags/${tagId}`, {
      method: 'PUT',
      body: data,
    })
    tags.value = tags.value.map(t => t.id === tagId ? { ...t, ...updated } : t)
    return updated
  }

  async function deleteTag(tagId: string): Promise<void> {
    await $fetch(`/api/tags/${tagId}`, { method: 'DELETE' })
    tags.value = tags.value.filter(t => t.id !== tagId)
  }

  async function mergeTags(sourceTagIds: string[], targetTagId: string): Promise<Tag> {
    const result = await $fetch<Tag>('/api/tags/merge', {
      method: 'POST',
      body: { sourceTagIds, targetTagId },
    })
    tags.value = tags.value
      .filter(t => !sourceTagIds.includes(t.id))
      .map(t => t.id === targetTagId ? result : t)
    return result
  }

  function findByName(name: string): Tag | undefined {
    return tags.value.find(
      t => t.name.toLowerCase() === name.trim().toLowerCase(),
    )
  }

  function searchTags(query: string): Tag[] {
    if (!query.trim()) return tags.value
    const lower = query.trim().toLowerCase()
    return tags.value.filter(t => t.name.toLowerCase().includes(lower))
  }

  return {
    tags: computed(() => tags.value),
    loading: computed(() => loading.value),
    fetchTags,
    createTag,
    createTagsBatch,
    updateTag,
    deleteTag,
    mergeTags,
    findByName,
    searchTags,
    TAG_COLORS,
  }
}
