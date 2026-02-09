import { db } from '~/server/database/client'
import { tags } from '~/server/database/schema'
import { eq, sql, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const userTags = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
      groupName: tags.groupName,
      createdAt: tags.createdAt,
      entryCount: sql<number>`(SELECT count(*) FROM entry_tags WHERE entry_tags.tag_id = "tags"."id")`.as('entry_count'),
    })
    .from(tags)
    .where(eq(tags.userId, user.id))
    .orderBy(asc(tags.name))

  return userTags.map(t => ({
    ...t,
    entryCount: Number(t.entryCount),
  }))
})
