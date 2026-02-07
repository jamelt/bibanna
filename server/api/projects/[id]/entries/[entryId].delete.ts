import { db } from '~/server/database/client'
import { projects, entries, entryProjects } from '~/server/database/schema'
import { eq, and, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const projectId = getRouterParam(event, 'id')
  const entryId = getRouterParam(event, 'entryId')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID is required',
    })
  }

  const project = await db.query.projects.findFirst({
    where: and(
      or(
        eq(projects.id, projectId),
        eq(projects.slug, projectId),
      ),
      eq(projects.userId, user.id),
    ),
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  const entry = await db.query.entries.findFirst({
    where: and(
      eq(entries.id, entryId),
      eq(entries.userId, user.id),
    ),
  })

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Entry not found',
    })
  }

  const existingAssociation = await db.query.entryProjects.findFirst({
    where: and(
      eq(entryProjects.entryId, entryId),
      eq(entryProjects.projectId, project.id),
    ),
  })

  if (!existingAssociation) {
    throw createError({
      statusCode: 404,
      message: 'Entry is not in this project',
    })
  }

  await db
    .delete(entryProjects)
    .where(and(
      eq(entryProjects.entryId, entryId),
      eq(entryProjects.projectId, project.id),
    ))

  return {
    success: true,
    removedEntryId: entryId,
    projectId: project.id,
  }
})
