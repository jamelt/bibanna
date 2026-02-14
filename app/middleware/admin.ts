export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch, user } = useUserSession()

  if (!loggedIn.value) {
    await fetch()
  }

  if (!loggedIn.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  const sessionUser = user.value as { id?: string } | undefined
  if (!sessionUser?.id) {
    return navigateTo('/app')
  }

  const adminRole = useState<string | null>('admin-role', () => null)

  if (!adminRole.value) {
    try {
      const profile = await $fetch<{ role: string }>('/api/admin/me')
      adminRole.value = profile.role
    } catch {
      return navigateTo('/app')
    }
  }

  if (adminRole.value !== 'admin' && adminRole.value !== 'support') {
    return navigateTo('/app')
  }
})
