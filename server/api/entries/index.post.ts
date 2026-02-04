import { db } from '~/server/database/client'
import { entries, entryTags, entryProjects } from '~/server/database/schema'
import { createEntrySchema } from '~/shared/validation'
import { getTierLimits } from '~/server/utils/auth'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = createEntrySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid entry data',
      data: parsed.error.flatten(),
    })
  }

  const limits = getTierLimits(user.subscriptionTier)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(eq(entries.userId, user.id))

  const currentCount = Number(countResult?.count ?? 0)
  if (currentCount >= limits.entries) {
    throw createError({
      statusCode: 403,
      message: `You have reached the maximum number of entries (${limits.entries}) for your subscription tier. Please upgrade to add more.`,
    })
  }

  const { projectIds, tagIds, ...entryData } = parsed.data

  const [newEntry] = await db
    .insert(entries)
    .values({
      userId: user.id,
      ...entryData,
    })
    .returning()

  if (!newEntry) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create entry',
    })
  }

  if (projectIds && projectIds.length > 0) {
    await db.insert(entryProjects).values(
      projectIds.map(projectId => ({
        entryId: newEntry.id,
        projectId,
      })),
    )
  }

  if (tagIds && tagIds.length > 0) {
    await db.insert(entryTags).values(
      tagIds.map(tagId => ({
        entryId: newEntry.id,
        tagId,
      })),
    )
  }

  return newEntry
})
