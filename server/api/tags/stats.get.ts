import { db } from '~/server/database/client'
import { tags, entries, projects } from '~/server/database/schema'
import { eq, sql, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const projectId = query.projectId as string | undefined

  if (projectId) {
    const [proj] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .limit(1)
    if (!proj) {
      throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }
  }

  const entryScope = projectId
    ? sql`JOIN entry_projects ep ON ep.entry_id = t1.entry_id AND ep.project_id = ${projectId}`
    : sql``

  const entryScope2 = projectId
    ? sql`JOIN entry_projects ep ON ep.entry_id = t2.entry_id AND ep.project_id = ${projectId}`
    : sql``

  const coOccurrence = await db.execute(sql`
    SELECT
      t1.tag_id as "tagAId",
      ta.name as "tagAName",
      ta.color as "tagAColor",
      t2.tag_id as "tagBId",
      tb.name as "tagBName",
      tb.color as "tagBColor",
      COUNT(DISTINCT t1.entry_id)::int as "sharedCount"
    FROM entry_tags t1
    ${entryScope}
    JOIN entry_tags t2 ON t1.entry_id = t2.entry_id AND t1.tag_id < t2.tag_id
    JOIN tags ta ON t1.tag_id = ta.id AND ta.user_id = ${user.id}
    JOIN tags tb ON t2.tag_id = tb.id AND tb.user_id = ${user.id}
    GROUP BY t1.tag_id, ta.name, ta.color, t2.tag_id, tb.name, tb.color
    ORDER BY "sharedCount" DESC
    LIMIT 20
  `)

  const untaggedEntryCondition = projectId
    ? sql`AND EXISTS (SELECT 1 FROM entry_projects ep WHERE ep.entry_id = e.id AND ep.project_id = ${projectId})`
    : sql``

  const untaggedResult = await db.execute(sql`
    SELECT count(*)::int as "count"
    FROM entries e
    WHERE e.user_id = ${user.id}
    AND NOT EXISTS (SELECT 1 FROM entry_tags et WHERE et.entry_id = e.id)
    ${untaggedEntryCondition}
  `)

  const totalCondition = projectId
    ? sql`AND EXISTS (SELECT 1 FROM entry_projects ep WHERE ep.entry_id = e.id AND ep.project_id = ${projectId})`
    : sql``

  const totalEntriesResult = await db.execute(sql`
    SELECT count(*)::int as "count"
    FROM entries e
    WHERE e.user_id = ${user.id}
    ${totalCondition}
  `)

  const underusedEntryScope = projectId
    ? sql`AND EXISTS (SELECT 1 FROM entry_projects ep2 WHERE ep2.entry_id = et.entry_id AND ep2.project_id = ${projectId})`
    : sql``

  const underusedResult = await db.execute(sql`
    SELECT t.id, t.name, t.color,
      (SELECT count(*) FROM entry_tags et WHERE et.tag_id = t.id ${underusedEntryScope})::int as "entryCount"
    FROM tags t
    WHERE t.user_id = ${user.id}
    AND (SELECT count(*) FROM entry_tags et WHERE et.tag_id = t.id ${underusedEntryScope}) <= 1
    ORDER BY "entryCount" ASC, t.name ASC
  `)

  return {
    coOccurrence,
    untaggedEntries: (untaggedResult as any)[0]?.count ?? 0,
    totalEntries: (totalEntriesResult as any)[0]?.count ?? 0,
    underusedTags: underusedResult,
  }
})
