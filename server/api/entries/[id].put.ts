import { db } from '~/server/database/client'
import { entries, entryTags, entryProjects } from '~/server/database/schema'
import { updateEntrySchema } from '~/shared/validation'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID is required',
    })
  }

  const parsed = updateEntrySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid entry data',
      data: parsed.error.flatten(),
    })
  }

  const existingEntry = await db.query.entries.findFirst({
    where: and(eq(entries.id, entryId), eq(entries.userId, user.id)),
  })

  if (!existingEntry) {
    throw createError({
      statusCode: 404,
      message: 'Entry not found',
    })
  }

  const { projectIds, tagIds, ...entryData } = parsed.data

  const [updatedEntry] = await db
    .update(entries)
    .set({
      ...entryData,
      updatedAt: new Date(),
    })
    .where(eq(entries.id, entryId))
    .returning()

  if (projectIds !== undefined) {
    await db.delete(entryProjects).where(eq(entryProjects.entryId, entryId))
    if (projectIds.length > 0) {
      await db.insert(entryProjects).values(
        projectIds.map((projectId) => ({
          entryId,
          projectId,
        })),
      )
    }
  }

  if (tagIds !== undefined) {
    await db.delete(entryTags).where(eq(entryTags.entryId, entryId))
    if (tagIds.length > 0) {
      await db.insert(entryTags).values(
        tagIds.map((tagId) => ({
          entryId,
          tagId,
        })),
      )
    }
  }

  return updatedEntry
})
