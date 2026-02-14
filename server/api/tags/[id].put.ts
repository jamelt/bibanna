import { db } from '~/server/database/client'
import { tags } from '~/server/database/schema'
import { updateTagSchema } from '~/shared/validation'
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

  const body = await readBody(event)
  const parsed = updateTagSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid tag data',
      data: parsed.error.flatten(),
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

  if (parsed.data.name && parsed.data.name !== existingTag.name) {
    const duplicateTag = await db.query.tags.findFirst({
      where: and(eq(tags.userId, user.id), eq(tags.name, parsed.data.name)),
    })

    if (duplicateTag) {
      throw createError({
        statusCode: 409,
        message: 'A tag with this name already exists',
      })
    }
  }

  const [updatedTag] = await db
    .update(tags)
    .set(parsed.data)
    .where(and(eq(tags.id, tagId), eq(tags.userId, user.id)))
    .returning()

  return updatedTag
})
