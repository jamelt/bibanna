interface StarredProject {
  id: string
  name: string
  color: string
  slug?: string | null
  isStarred: boolean
}

const starredProjects = ref<StarredProject[]>([])
const loading = ref(false)
const initialized = ref(false)

export function useStarredProjects() {
  async function fetchStarred() {
    loading.value = true
    try {
      const data = await $fetch<StarredProject[]>('/api/projects/starred')
      starredProjects.value = data
      initialized.value = true
    } catch {
      starredProjects.value = []
    } finally {
      loading.value = false
    }
  }

  async function toggleStar(projectId: string) {
    try {
      const result = await $fetch<{ id: string; isStarred: boolean }>(
        `/api/projects/${projectId}/star`,
        { method: 'PATCH' },
      )

      if (result.isStarred) {
        if (!starredProjects.value.find((p) => p.id === result.id)) {
          await fetchStarred()
        }
      } else {
        starredProjects.value = starredProjects.value.filter((p) => p.id !== result.id)
      }

      return result
    } catch {
      throw new Error('Failed to toggle star')
    }
  }

  function projectRoute(project: StarredProject) {
    return `/app/projects/${project.slug || project.id}`
  }

  if (!initialized.value) {
    fetchStarred()
  }

  return {
    starredProjects: readonly(starredProjects),
    loading: readonly(loading),
    fetchStarred,
    toggleStar,
    projectRoute,
  }
}
