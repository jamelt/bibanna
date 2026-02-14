import { db } from '~/server/database/client'
import { entries, entryTags, entryProjects, tags, annotations } from '~/server/database/schema'
import { eq, and, or, ilike, sql, desc, asc, inArray, gte, lte } from 'drizzle-orm'
import { searchQuerySchema } from '~/shared/validation'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const parsed = searchQuerySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
      data: parsed.error.flatten(),
    })
  }

  const {
    q,
    entryTypes,
    projectId,
    tagIds,
    yearFrom,
    yearTo,
    isFavorite,
    untagged,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = parsed.data

  const conditions = [eq(entries.userId, user.id)]

  const meta = (field: string) =>
    sql`(${entries.metadata} #>> '{}')::jsonb->>${sql.raw(`'${field}'`)}`
  const authorsJsonb = sql`(${entries.authors} #>> '{}')::jsonb`

  if (q) {
    const pattern = `%${q}%`
    const authorExists = (innerPattern: string) => sql`(
      jsonb_typeof(${authorsJsonb}) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(${authorsJsonb}) AS a
        WHERE a->>'lastName' ILIKE ${innerPattern}
          OR a->>'firstName' ILIKE ${innerPattern}
      )
    )`

    conditions.push(
      or(
        ilike(entries.title, pattern),
        authorExists(pattern),
        sql`${entries.year}::text ILIKE ${pattern}`,
        sql`${meta('doi')} ILIKE ${pattern}`,
        sql`${meta('isbn')} ILIKE ${pattern}`,
        sql`${meta('issn')} ILIKE ${pattern}`,
        sql`${meta('url')} ILIKE ${pattern}`,
        sql`${meta('journal')} ILIKE ${pattern}`,
        sql`${meta('publisher')} ILIKE ${pattern}`,
        sql`${meta('abstract')} ILIKE ${pattern}`,
        sql`${meta('volume')} ILIKE ${pattern}`,
        sql`${meta('issue')} ILIKE ${pattern}`,
        sql`${meta('edition')} ILIKE ${pattern}`,
        sql`${meta('editor')} ILIKE ${pattern}`,
        sql`${meta('series')} ILIKE ${pattern}`,
        sql`${meta('container')} ILIKE ${pattern}`,
        sql`${meta('chapter')} ILIKE ${pattern}`,
        ilike(entries.notes, pattern),
      )!,
    )
  }

  if (entryTypes && entryTypes.length > 0) {
    conditions.push(inArray(entries.entryType, entryTypes))
  }

  if (yearFrom) {
    conditions.push(gte(entries.year, yearFrom))
  }

  if (yearTo) {
    conditions.push(lte(entries.year, yearTo))
  }

  if (isFavorite !== undefined) {
    conditions.push(eq(entries.isFavorite, isFavorite))
  }

  if (untagged) {
    conditions.push(sql`NOT EXISTS (SELECT 1 FROM entry_tags et WHERE et.entry_id = ${entries.id})`)
  }

  let baseQuery = db
    .select({
      id: entries.id,
      entryType: entries.entryType,
      title: entries.title,
      authors: entries.authors,
      year: entries.year,
      metadata: entries.metadata,
      isFavorite: entries.isFavorite,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .where(and(...conditions))

  if (projectId) {
    baseQuery = baseQuery.innerJoin(
      entryProjects,
      and(eq(entries.id, entryProjects.entryId), eq(entryProjects.projectId, projectId)),
    )
  }

  if (tagIds && tagIds.length > 0) {
    baseQuery = baseQuery.innerJoin(
      entryTags,
      and(eq(entries.id, entryTags.entryId), inArray(entryTags.tagId, tagIds)),
    )
  }

  const useRelevanceSort = q && (sortBy === 'relevance' || sortBy === 'createdAt')
  const relevanceScore = q
    ? sql<number>`(
        CASE WHEN ${entries.title} ILIKE ${q} THEN 100
             WHEN ${entries.title} ILIKE ${`${q}%`} THEN 80
             WHEN ${entries.title} ILIKE ${`%${q}%`} THEN 60
             ELSE 0 END
        + CASE WHEN jsonb_typeof(${authorsJsonb}) = 'array' AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(${authorsJsonb}) AS a
            WHERE a->>'lastName' ILIKE ${q}
              OR a->>'firstName' ILIKE ${q}
          ) THEN 50
          WHEN jsonb_typeof(${authorsJsonb}) = 'array' AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(${authorsJsonb}) AS a
            WHERE a->>'lastName' ILIKE ${`%${q}%`}
              OR a->>'firstName' ILIKE ${`%${q}%`}
          ) THEN 30
          ELSE 0 END
        + CASE WHEN ${entries.year}::text = ${q} THEN 40 ELSE 0 END
        + CASE WHEN ${meta('journal')} ILIKE ${`%${q}%`} THEN 20 ELSE 0 END
        + CASE WHEN ${meta('publisher')} ILIKE ${`%${q}%`} THEN 15 ELSE 0 END
        + CASE WHEN ${meta('doi')} ILIKE ${`%${q}%`} THEN 10 ELSE 0 END
        + CASE WHEN ${meta('isbn')} ILIKE ${`%${q}%`} THEN 10 ELSE 0 END
        + CASE WHEN ${meta('editor')} ILIKE ${`%${q}%`} THEN 10 ELSE 0 END
        + CASE WHEN ${meta('series')} ILIKE ${`%${q}%`} THEN 10 ELSE 0 END
        + CASE WHEN ${meta('container')} ILIKE ${`%${q}%`} THEN 10 ELSE 0 END
        + CASE WHEN ${meta('abstract')} ILIKE ${`%${q}%`} THEN 5 ELSE 0 END
        + CASE WHEN ${entries.notes} ILIKE ${`%${q}%`} THEN 5 ELSE 0 END
      )`
    : sql<number>`0`

  const effectiveSortBy = useRelevanceSort ? 'relevance' : (sortBy ?? 'createdAt')

  const orderColumn = {
    relevance: relevanceScore,
    title: entries.title,
    author: sql`${authorsJsonb}->0->>'lastName'`,
    year: entries.year,
    createdAt: entries.createdAt,
    updatedAt: entries.updatedAt,
  }[effectiveSortBy]

  const orderFn = useRelevanceSort ? desc : sortOrder === 'asc' ? asc : desc

  const offset = (page - 1) * pageSize

  let countQuery = db
    .select({ count: sql<number>`count(DISTINCT ${entries.id})` })
    .from(entries)
    .where(and(...conditions))

  if (projectId) {
    countQuery = countQuery.innerJoin(
      entryProjects,
      and(eq(entries.id, entryProjects.entryId), eq(entryProjects.projectId, projectId)),
    )
  }

  if (tagIds && tagIds.length > 0) {
    countQuery = countQuery.innerJoin(
      entryTags,
      and(eq(entries.id, entryTags.entryId), inArray(entryTags.tagId, tagIds)),
    )
  }

  const [results, countResult] = await Promise.all([
    baseQuery.orderBy(orderFn(orderColumn)).limit(pageSize).offset(offset),
    countQuery,
  ])

  const total = Number(countResult[0]?.count ?? 0)

  const entryIds = results.map((r) => r.id)
  const [entryTagsData, entryAnnotationsData] = await Promise.all([
    entryIds.length > 0
      ? db
          .select({
            entryId: entryTags.entryId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(entryTags)
          .innerJoin(tags, eq(entryTags.tagId, tags.id))
          .where(inArray(entryTags.entryId, entryIds))
      : [],
    entryIds.length > 0
      ? db
          .select({
            entryId: annotations.entryId,
            count: sql<number>`count(*)`,
          })
          .from(annotations)
          .where(inArray(annotations.entryId, entryIds))
          .groupBy(annotations.entryId)
      : [],
  ])

  const tagsByEntry = entryTagsData.reduce(
    (acc, tag) => {
      if (tag.entryId === undefined) return acc
      const arr = acc[tag.entryId] ?? []
      arr.push({
        id: tag.tagId,
        name: tag.tagName,
        color: tag.tagColor,
      })
      acc[tag.entryId] = arr
      return acc
    },
    {} as Record<string, Array<{ id: string; name: string; color: string | null }>>,
  )

  const annotationCountByEntry = entryAnnotationsData.reduce(
    (acc, a) => {
      if (a.entryId !== undefined) {
        acc[a.entryId] = Number(a.count ?? 0)
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const data = results.map((entry) => ({
    ...entry,
    tags: tagsByEntry[entry.id] ?? [],
    annotationCount: annotationCountByEntry[entry.id] ?? 0,
  }))

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
})
