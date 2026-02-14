import { db } from '~/server/database/client'
import { projects, entries, entryProjects } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { buildProjectWhere } from '~/server/utils/project-query'

const addEntrySchema = z.object({
  entryId: z.string().uuid('Invalid entry ID'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const body = await readBody(event)
  const parsed = addEntrySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: parsed.error.flatten(),
    })
  }

  const project = await db.query.projects.findFirst({
    where: buildProjectWhere(projectId, user.id),
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  const entry = await db.query.entries.findFirst({
    where: and(eq(entries.id, parsed.data.entryId), eq(entries.userId, user.id)),
  })

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Entry not found',
    })
  }

  const existingAssociation = await db.query.entryProjects.findFirst({
    where: and(
      eq(entryProjects.entryId, parsed.data.entryId),
      eq(entryProjects.projectId, project.id),
    ),
  })

  if (existingAssociation) {
    throw createError({
      statusCode: 409,
      message: 'Entry is already in this project',
    })
  }

  const [association] = await db
    .insert(entryProjects)
    .values({
      entryId: parsed.data.entryId,
      projectId: project.id,
    })
    .returning()

  return {
    success: true,
    entryProject: association,
    entry: {
      id: entry.id,
      title: entry.title,
      entryType: entry.entryType,
      authors: entry.authors,
      year: entry.year,
    },
  }
})
