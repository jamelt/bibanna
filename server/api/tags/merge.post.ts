import { z } from 'zod'
import { db } from '~/server/database/client'
import { tags, entryTags } from '~/server/database/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

const mergeTagsSchema = z.object({
  sourceTagIds: z.array(z.string().uuid()).min(1),
  targetTagId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = mergeTagsSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid merge data',
      data: parsed.error.flatten(),
    })
  }

  const { sourceTagIds, targetTagId } = parsed.data

  if (sourceTagIds.includes(targetTagId)) {
    throw createError({
      statusCode: 400,
      message: 'Target tag cannot be one of the source tags',
    })
  }

  const targetTag = await db.query.tags.findFirst({
    where: and(eq(tags.id, targetTagId), eq(tags.userId, user.id)),
  })

  if (!targetTag) {
    throw createError({ statusCode: 404, message: 'Target tag not found' })
  }

  const sourceTags = await db.query.tags.findMany({
    where: and(eq(tags.userId, user.id), inArray(tags.id, sourceTagIds)),
  })

  if (sourceTags.length === 0) {
    throw createError({ statusCode: 404, message: 'No valid source tags found' })
  }

  const validSourceIds = sourceTags.map((t) => t.id)

  // Move all entry-tag associations from source tags to target tag
  // Use ON CONFLICT DO NOTHING to handle entries that already have the target tag
  const sourceEntryTags = await db
    .select({ entryId: entryTags.entryId })
    .from(entryTags)
    .where(inArray(entryTags.tagId, validSourceIds))

  if (sourceEntryTags.length > 0) {
    const uniqueEntryIds = [...new Set(sourceEntryTags.map((et) => et.entryId))]
    const newAssociations = uniqueEntryIds.map((entryId) => ({
      entryId,
      tagId: targetTagId,
    }))
    await db.insert(entryTags).values(newAssociations).onConflictDoNothing()
  }

  // Delete source tags (cascade will remove their entry_tags rows)
  await db.delete(tags).where(and(eq(tags.userId, user.id), inArray(tags.id, validSourceIds)))

  // Return the target tag with updated entry count
  const [result] = await db
    .select({
      id: tags.id,
      userId: tags.userId,
      name: tags.name,
      color: tags.color,
      description: tags.description,
      groupName: tags.groupName,
      createdAt: tags.createdAt,
      entryCount:
        sql<number>`(SELECT count(*) FROM entry_tags WHERE entry_tags.tag_id = "tags"."id")`.as(
          'entry_count',
        ),
    })
    .from(tags)
    .where(eq(tags.id, targetTagId))

  return result
})
