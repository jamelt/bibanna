import { db } from '~/server/database/client'
import { entries } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID is required',
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

  await db.delete(entries).where(eq(entries.id, entryId))

  return { success: true }
})
