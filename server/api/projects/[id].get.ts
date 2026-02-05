import { db } from '~/server/database/client'
import { projects, entryProjects, entries } from '~/server/database/schema'
import { eq, and, sql, desc, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
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

  const projectEntries = await db
    .select({
      id: entries.id,
      entryType: entries.entryType,
      title: entries.title,
      authors: entries.authors,
      year: entries.year,
      metadata: entries.metadata,
      isFavorite: entries.isFavorite,
      createdAt: entries.createdAt,
      addedAt: entryProjects.addedAt,
    })
    .from(entryProjects)
    .innerJoin(entries, eq(entryProjects.entryId, entries.id))
    .where(eq(entryProjects.projectId, projectId))
    .orderBy(desc(entryProjects.addedAt))

  return {
    ...project,
    entries: projectEntries,
    entryCount: projectEntries.length,
  }
})
