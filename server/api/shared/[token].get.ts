import { getSharedProjectByToken } from '~/server/services/sharing'
import { db } from '~/server/database/client'
import { entries, entryProjects, users } from '~/server/database/schema'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required',
    })
  }

  const result = await getSharedProjectByToken(token)

  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Shared project not found or link has expired',
    })
  }

  const { project, permission } = result

  const owner = await db.query.users.findFirst({
    where: eq(users.id, project.userId),
  })

  const projectEntryIds = await db
    .select({ entryId: entryProjects.entryId })
    .from(entryProjects)
    .where(eq(entryProjects.projectId, project.id))

  const entryIds = projectEntryIds.map((e) => e.entryId)

  let projectEntries: (typeof entries.$inferSelect)[] = []
  if (entryIds.length > 0) {
    projectEntries = await db.query.entries.findMany({
      where: inArray(entries.id, entryIds),
    })
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      createdAt: project.createdAt,
    },
    owner: {
      name: owner?.name || 'Anonymous',
    },
    permission,
    entries: projectEntries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      authors: entry.authors,
      year: entry.year,
      entryType: entry.entryType,
    })),
    entryCount: projectEntries.length,
  }
})
