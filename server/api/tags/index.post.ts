import { db } from '~/server/database/client'
import { tags } from '~/server/database/schema'
import { createTagSchema } from '~/shared/validation'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid tag data',
      data: parsed.error.flatten(),
    })
  }

  const existingTag = await db.query.tags.findFirst({
    where: and(eq(tags.userId, user.id), eq(tags.name, parsed.data.name)),
  })

  if (existingTag) {
    throw createError({
      statusCode: 409,
      message: 'A tag with this name already exists',
    })
  }

  const [newTag] = await db
    .insert(tags)
    .values({
      userId: user.id,
      ...parsed.data,
    })
    .returning()

  return {
    ...newTag,
    entryCount: 0,
  }
})
