import { db } from '~/server/database/client'
import { projects } from '~/server/database/schema'
import { eq, and, or } from 'drizzle-orm'

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
    where: and(
      or(
        eq(projects.id, projectId),
        eq(projects.slug, projectId),
      ),
      eq(projects.userId, user.id),
    ),
  })

  if (!existingProject) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  await db
    .delete(projects)
    .where(and(
      eq(projects.id, existingProject.id),
      eq(projects.userId, user.id),
    ))

  return { success: true, deletedId: existingProject.id }
})
