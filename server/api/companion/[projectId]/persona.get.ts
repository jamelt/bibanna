import { db } from '~/server/database/client'
import { projects } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { requireProTier } from '~/server/utils/auth'
import { getOrCreatePersona } from '~/server/services/companion'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireProTier(user)

  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, user.id),
    ),
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  const persona = await getOrCreatePersona(projectId, user.id)

  return persona
})
