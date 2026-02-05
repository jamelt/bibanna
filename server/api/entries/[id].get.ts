import { db } from '~/server/database/client'
import { entries, annotations, entryTags, entryProjects, tags, projects, veritasScores } from '~/server/database/schema'
import { eq, and, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID is required',
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

  const [entryAnnotations, entryTagsData, entryProjectsData, veritasScore] = await Promise.all([
    db.query.annotations.findMany({
      where: eq(annotations.entryId, entryId),
      orderBy: asc(annotations.sortOrder),
    }),
    db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(entryTags)
      .innerJoin(tags, eq(entryTags.tagId, tags.id))
      .where(eq(entryTags.entryId, entryId)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
        slug: projects.slug,
      })
      .from(entryProjects)
      .innerJoin(projects, eq(entryProjects.projectId, projects.id))
      .where(eq(entryProjects.entryId, entryId)),
    db.query.veritasScores.findFirst({
      where: eq(veritasScores.entryId, entryId),
    }),
  ])

  return {
    ...entry,
    annotations: entryAnnotations,
    tags: entryTagsData,
    projects: entryProjectsData,
    veritasScore,
  }
})
