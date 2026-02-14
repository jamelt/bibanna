import { db } from '~/server/database/client'
import { announcements } from '~/server/database/schema'
import { eq, and, lte, or, isNull, gte, sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const now = new Date()

  const active = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      content: announcements.content,
      type: announcements.type,
      startAt: announcements.startAt,
      endAt: announcements.endAt,
    })
    .from(announcements)
    .where(
      and(
        eq(announcements.isActive, true),
        lte(announcements.startAt, now),
        or(isNull(announcements.endAt), gte(announcements.endAt, now)),
      ),
    )
    .orderBy(announcements.startAt)
    .limit(5)

  return active
})
