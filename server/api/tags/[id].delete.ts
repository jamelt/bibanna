import { db } from '~/server/database/client'
import { tags } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const tagId = getRouterParam(event, 'id')

  if (!tagId) {
    throw createError({
      statusCode: 400,
      message: 'Tag ID is required',
    })
  }

  const existingTag = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, user.id)),
  })

  if (!existingTag) {
    throw createError({
      statusCode: 404,
      message: 'Tag not found',
    })
  }

  await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.userId, user.id)))

  return { success: true, deletedId: tagId }
})
