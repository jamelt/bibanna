import { db } from '~/server/database/client'
import { entries, entryTags, entryProjects } from '~/server/database/schema'
import { createEntrySchema } from '~/shared/validation'
import { getTierLimits } from '~/shared/subscriptions'
import { eq, and, or, sql, ilike } from 'drizzle-orm'

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

  const skipDedupe = getQuery(event).skipDedupe === 'true'
  if (!skipDedupe) {
    const dupeConditions = []
    const metadata = entryData.metadata as Record<string, unknown> | undefined

    if (metadata?.doi && typeof metadata.doi === 'string') {
      dupeConditions.push(sql`${entries.metadata}->>'doi' = ${metadata.doi}`)
    }
    if (metadata?.isbn && typeof metadata.isbn === 'string') {
      dupeConditions.push(sql`${entries.metadata}->>'isbn' = ${metadata.isbn}`)
    }

    if (dupeConditions.length === 0 && entryData.title) {
      const titleMatch = ilike(entries.title, entryData.title)

      const firstAuthorLast =
        Array.isArray(entryData.authors) && entryData.authors.length > 0
          ? (entryData.authors[0] as { lastName?: string })?.lastName
          : undefined

      const fuzzyParts = [titleMatch]
      if (firstAuthorLast) {
        fuzzyParts.push(sql`${entries.authors}->0->>'lastName' ILIKE ${firstAuthorLast}`)
      }
      if (entryData.year) {
        fuzzyParts.push(eq(entries.year, entryData.year))
      }

      dupeConditions.push(and(...fuzzyParts)!)
    }

    if (dupeConditions.length > 0) {
      const existing = await db.query.entries.findFirst({
        where: and(eq(entries.userId, user.id), or(...dupeConditions)),
        columns: { id: true, title: true },
      })

      if (existing) {
        throw createError({
          statusCode: 409,
          message: `A similar entry already exists: "${existing.title}"`,
          data: { duplicateId: existing.id },
        })
      }
    }
  }

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
      projectIds.map((projectId) => ({
        entryId: newEntry.id,
        projectId,
      })),
    )
  }

  if (tagIds && tagIds.length > 0) {
    await db.insert(entryTags).values(
      tagIds.map((tagId) => ({
        entryId: newEntry.id,
        tagId,
      })),
    )
  }

  return newEntry
})
