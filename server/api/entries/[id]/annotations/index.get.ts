import { db } from '~/server/database/client'
import { entries, annotations } from '~/server/database/schema'
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
    where: and(eq(entries.id, entryId), eq(entries.userId, user.id)),
  })

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Entry not found',
    })
  }

  const entryAnnotations = await db.query.annotations.findMany({
    where: eq(annotations.entryId, entryId),
    orderBy: asc(annotations.sortOrder),
  })

  return entryAnnotations
})
