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
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = parsed.data

  const conditions = [eq(entries.userId, user.id)]

  if (q) {
    const pattern = `%${q}%`
    conditions.push(
      or(
        ilike(entries.title, pattern),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${entries.authors}) AS a
          WHERE a->>'lastName' ILIKE ${pattern}
            OR a->>'firstName' ILIKE ${pattern}
        )`,
        ilike(sql`${entries.metadata}->>'doi'`, pattern),
        ilike(sql`${entries.metadata}->>'isbn'`, pattern),
        ilike(sql`${entries.metadata}->>'url'`, pattern),
        ilike(sql`${entries.metadata}->>'journal'`, pattern),
        ilike(sql`${entries.metadata}->>'publisher'`, pattern),
        ilike(sql`${entries.metadata}->>'abstract'`, pattern),
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
      and(
        eq(entries.id, entryProjects.entryId),
        eq(entryProjects.projectId, projectId),
      ),
    )
  }

  if (tagIds && tagIds.length > 0) {
    baseQuery = baseQuery.innerJoin(
      entryTags,
      and(
        eq(entries.id, entryTags.entryId),
        inArray(entryTags.tagId, tagIds),
      ),
    )
  }

  const orderColumn = {
    title: entries.title,
    author: sql`${entries.authors}->0->>'lastName'`,
    year: entries.year,
    createdAt: entries.createdAt,
    updatedAt: entries.updatedAt,
  }[sortBy ?? 'createdAt']

  const orderFn = sortOrder === 'asc' ? asc : desc

  const offset = (page - 1) * pageSize

  const [results, countResult] = await Promise.all([
    baseQuery
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(entries)
      .where(and(...conditions)),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  const entryIds = results.map(r => r.id)
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

  const tagsByEntry = entryTagsData.reduce((acc, tag) => {
    if (tag.entryId === undefined) return acc
    const arr = acc[tag.entryId] ?? []
    arr.push({
      id: tag.tagId,
      name: tag.tagName,
      color: tag.tagColor,
    })
    acc[tag.entryId] = arr
    return acc
  }, {} as Record<string, Array<{ id: string; name: string; color: string | null }>>)

  const annotationCountByEntry = entryAnnotationsData.reduce((acc, a) => {
    if (a.entryId !== undefined) {
      acc[a.entryId] = Number(a.count ?? 0)
    }
    return acc
  }, {} as Record<string, number>)

  const data = results.map(entry => ({
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
