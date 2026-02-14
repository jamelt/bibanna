import { removeShare, revokePublicLink } from '~/server/services/sharing'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const projectId = getRouterParam(event, 'id')
  const shareId = getRouterParam(event, 'shareId')

  if (!projectId || !shareId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID and Share ID are required',
    })
  }

  try {
    if (shareId === 'public') {
      await revokePublicLink(projectId, user.id)
    } else {
      await removeShare(shareId, user.id)
    }

    return { success: true }
  } catch (error: any) {
    throw createError({
      statusCode: 403,
      message: error.message,
    })
  }
})
