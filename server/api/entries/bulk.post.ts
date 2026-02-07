import { z } from 'zod'
import { db } from '~/server/database/client'
import { entries, entryTags, entryProjects } from '~/server/database/schema'
import { eq, and, inArray } from 'drizzle-orm'

const bulkActionSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(['delete', 'addTags', 'removeTags', 'addToProject', 'removeFromProject', 'favorite', 'unfavorite']),
  tagIds: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = bulkActionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid bulk action',
      data: parsed.error.flatten(),
    })
  }

  const { entryIds, action, tagIds, projectId } = parsed.data

  const userEntries = await db.query.entries.findMany({
    where: and(
      eq(entries.userId, user.id),
      inArray(entries.id, entryIds),
    ),
    columns: { id: true },
  })

  const validIds = userEntries.map(e => e.id)
  if (validIds.length === 0) {
    throw createError({ statusCode: 404, message: 'No matching entries found' })
  }

  switch (action) {
    case 'delete': {
      await db.delete(entries).where(
        and(eq(entries.userId, user.id), inArray(entries.id, validIds)),
      )
      return { affected: validIds.length, action }
    }

    case 'addTags': {
      if (!tagIds || tagIds.length === 0) {
        throw createError({ statusCode: 400, message: 'tagIds required for addTags' })
      }
      const values = validIds.flatMap(entryId =>
        tagIds.map(tagId => ({ entryId, tagId })),
      )
      await db.insert(entryTags).values(values).onConflictDoNothing()
      return { affected: validIds.length, action }
    }

    case 'removeTags': {
      if (!tagIds || tagIds.length === 0) {
        throw createError({ statusCode: 400, message: 'tagIds required for removeTags' })
      }
      await db.delete(entryTags).where(
        and(inArray(entryTags.entryId, validIds), inArray(entryTags.tagId, tagIds)),
      )
      return { affected: validIds.length, action }
    }

    case 'addToProject': {
      if (!projectId) {
        throw createError({ statusCode: 400, message: 'projectId required for addToProject' })
      }
      const values = validIds.map(entryId => ({ entryId, projectId }))
      await db.insert(entryProjects).values(values).onConflictDoNothing()
      return { affected: validIds.length, action }
    }

    case 'removeFromProject': {
      if (!projectId) {
        throw createError({ statusCode: 400, message: 'projectId required for removeFromProject' })
      }
      await db.delete(entryProjects).where(
        and(inArray(entryProjects.entryId, validIds), eq(entryProjects.projectId, projectId)),
      )
      return { affected: validIds.length, action }
    }

    case 'favorite': {
      await db.update(entries)
        .set({ isFavorite: true })
        .where(and(eq(entries.userId, user.id), inArray(entries.id, validIds)))
      return { affected: validIds.length, action }
    }

    case 'unfavorite': {
      await db.update(entries)
        .set({ isFavorite: false })
        .where(and(eq(entries.userId, user.id), inArray(entries.id, validIds)))
      return { affected: validIds.length, action }
    }
  }
})
