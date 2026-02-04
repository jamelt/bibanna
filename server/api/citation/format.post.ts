import { db } from '~/server/database/client'
import { entries, citationStyles } from '~/server/database/schema'
import { eq, and, inArray } from 'drizzle-orm'
import {
  formatEntriesWithStyle,
  formatWithCustomStyle,
  getStyleById,
} from '~/server/services/citation'
import { z } from 'zod'
import type { Entry } from '~/shared/types'

const formatSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1).max(1000),
  styleId: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = formatSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: parsed.error.flatten(),
    })
  }

  const { entryIds, styleId } = parsed.data

  const userEntries = await db.query.entries.findMany({
    where: and(
      eq(entries.userId, user.id),
      inArray(entries.id, entryIds),
    ),
  })

  if (userEntries.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'No entries found',
    })
  }

  const isDefaultStyle = getStyleById(styleId) !== undefined

  if (isDefaultStyle) {
    const result = await formatEntriesWithStyle(userEntries as Entry[], styleId)
    return result
  }

  const customStyle = await db.query.citationStyles.findFirst({
    where: and(
      eq(citationStyles.id, styleId),
      eq(citationStyles.userId, user.id),
    ),
  })

  if (!customStyle) {
    const publicStyle = await db.query.citationStyles.findFirst({
      where: and(
        eq(citationStyles.id, styleId),
        eq(citationStyles.isPublic, true),
      ),
    })

    if (!publicStyle) {
      throw createError({
        statusCode: 404,
        message: 'Citation style not found',
      })
    }

    return await formatWithCustomStyle(
      userEntries as Entry[],
      publicStyle.cslXml,
      publicStyle.name,
    )
  }

  return await formatWithCustomStyle(
    userEntries as Entry[],
    customStyle.cslXml,
    customStyle.name,
  )
})
