import { db } from '~/server/database/client'
import { entries, annotations } from '~/server/database/schema'
import { updateAnnotationSchema } from '~/shared/validation'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const entryId = getRouterParam(event, 'id')
  const annotationId = getRouterParam(event, 'annotationId')
  const body = await readBody(event)

  if (!entryId || !annotationId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID and Annotation ID are required',
    })
  }

  const parsed = updateAnnotationSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid annotation data',
      data: parsed.error.flatten(),
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

  const existing = await db.query.annotations.findFirst({
    where: and(eq(annotations.id, annotationId), eq(annotations.entryId, entryId)),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Annotation not found',
    })
  }

  const [updated] = await db
    .update(annotations)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(annotations.id, annotationId))
    .returning()

  return updated
})
