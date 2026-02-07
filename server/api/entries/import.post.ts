import { z } from 'zod'
import { db } from '~/server/database/client'
import { entries, entryProjects, entryTags } from '~/server/database/schema'
import { getTierLimits } from '~/shared/subscriptions'
import { eq, sql } from 'drizzle-orm'
import { parseBibtex } from '~/server/services/export/bibtex'

const importSchema = z.object({
  bibtex: z.string().min(1, 'BibTeX content is required'),
  projectId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid import data',
      data: parsed.error.flatten(),
    })
  }

  const { bibtex, projectId, tagIds } = parsed.data

  const parsedEntries = parseBibtex(bibtex)
  if (parsedEntries.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No valid entries found in the BibTeX data. Please check the format and try again.',
    })
  }

  const limits = getTierLimits(user.subscriptionTier)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(eq(entries.userId, user.id))

  const currentCount = Number(countResult?.count ?? 0)
  const available = limits.entries - currentCount
  if (available <= 0) {
    throw createError({
      statusCode: 403,
      message: `You have reached the maximum number of entries (${limits.entries}) for your subscription tier.`,
    })
  }

  const toImport = parsedEntries.slice(0, available)
  const skipped = parsedEntries.length - toImport.length

  const created = []

  for (const pe of toImport) {
    if (!pe.title || !pe.entryType) continue

    const [newEntry] = await db
      .insert(entries)
      .values({
        userId: user.id,
        entryType: pe.entryType,
        title: pe.title,
        authors: pe.authors ?? [],
        year: pe.year,
        metadata: pe.metadata ?? {},
      })
      .returning()

    if (!newEntry) continue

    if (projectId) {
      await db.insert(entryProjects).values({
        entryId: newEntry.id,
        projectId,
      }).onConflictDoNothing()
    }

    if (tagIds && tagIds.length > 0) {
      await db.insert(entryTags).values(
        tagIds.map(tagId => ({ entryId: newEntry.id, tagId })),
      ).onConflictDoNothing()
    }

    created.push(newEntry)
  }

  return {
    imported: created.length,
    skipped,
    total: parsedEntries.length,
    entries: created,
  }
})
