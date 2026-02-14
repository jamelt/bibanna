import { db } from '~/server/database/client'
import { entries, annotations } from '~/server/database/schema'
import { createAnnotationSchema } from '~/shared/validation'
import { eq, and, sql } from 'drizzle-orm'

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

  const parsed = createAnnotationSchema.safeParse(body)
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

  const [maxSortOrder] = await db
    .select({ max: sql<number>`COALESCE(MAX(${annotations.sortOrder}), -1)` })
    .from(annotations)
    .where(eq(annotations.entryId, entryId))

  const sortOrder = parsed.data.sortOrder ?? Number(maxSortOrder?.max ?? -1) + 1

  const [newAnnotation] = await db
    .insert(annotations)
    .values({
      entryId,
      userId: user.id,
      ...parsed.data,
      sortOrder,
    })
    .returning()

  return newAnnotation
})
