import { db } from '~/server/database/client'
import { projects } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { buildProjectWhere } from '~/server/utils/project-query'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const existingProject = await db.query.projects.findFirst({
    where: buildProjectWhere(projectId, user.id),
  })

  if (!existingProject) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  const [updated] = await db
    .update(projects)
    .set({
      isStarred: !existingProject.isStarred,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, existingProject.id), eq(projects.userId, user.id)))
    .returning({
      id: projects.id,
      isStarred: projects.isStarred,
    })

  return updated
})
