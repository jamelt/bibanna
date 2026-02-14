import { db } from '~/server/database/client'
import { tags } from '~/server/database/schema'
import { eq, asc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const format = (query.format as string) || 'json'

  const userTags = await db
    .select({
      id: tags.id,
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
    .where(eq(tags.userId, user.id))
    .orderBy(asc(tags.name))

  const data = userTags.map((t) => ({
    name: t.name,
    color: t.color,
    description: t.description || '',
    groupName: t.groupName || '',
    entryCount: Number(t.entryCount),
    createdAt: t.createdAt.toISOString(),
  }))

  if (format === 'csv') {
    const headers = ['name', 'color', 'description', 'groupName', 'entryCount', 'createdAt']
    const csvRows = [headers.join(',')]
    for (const row of data) {
      csvRows.push(
        headers
          .map((h) => {
            const val = String((row as Record<string, unknown>)[h] ?? '')
            return val.includes(',') || val.includes('"') || val.includes('\n')
              ? `"${val.replace(/"/g, '""')}"`
              : val
          })
          .join(','),
      )
    }

    setResponseHeaders(event, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="tags.csv"',
    })
    return csvRows.join('\n')
  }

  setResponseHeaders(event, {
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="tags.json"',
  })
  return data
})
