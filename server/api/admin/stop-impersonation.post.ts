import { logAdminAction } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const impersonatedBy = (session as any)?.impersonatedBy as
    | { id: string; email: string; name?: string }
    | undefined

  if (!impersonatedBy?.id) {
    throw createError({ statusCode: 400, message: 'You are not currently impersonating anyone' })
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const currentUser = (session as any)?.user as { id: string; email: string } | undefined

  await logAdminAction(
    impersonatedBy.id,
    'user.stop_impersonate',
    'user',
    currentUser?.id,
    {
      targetEmail: currentUser?.email,
    },
    ip,
  )

  await setUserSession(event, {
    user: {
      id: impersonatedBy.id,
      email: impersonatedBy.email,
      name: impersonatedBy.name,
    },
  })

  return {
    success: true,
    restoredTo: {
      id: impersonatedBy.id,
      email: impersonatedBy.email,
    },
  }
})
