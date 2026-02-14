import { getProjectShares } from '~/server/services/sharing'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  try {
    const shares = await getProjectShares(projectId, user.id)
    return shares
  } catch (error: any) {
    throw createError({
      statusCode: 403,
      message: error.message,
    })
  }
})
