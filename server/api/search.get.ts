import { db } from '~/server/database/client'
import { entries, projects, tags, annotations, entryTags, entryProjects } from '~/server/database/schema'
import { eq, and, or, ilike, sql, desc, inArray } from 'drizzle-orm'
import { z } from 'zod'

const searchParamsSchema = z.object({
  q: z.string().optional(),
  scope: z.enum(['all', 'entries', 'projects', 'tags', 'annotations']).optional().default('all'),
  author: z.string().optional(),
  title: z.string().optional(),
  tag: z.string().optional(),
  project: z.string().optional(),
  year: z.string().optional(),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  doi: z.string().optional(),
  entryType: z.string().optional(),
  isFavorite: z.preprocess(v => v === 'true', z.boolean().optional()),
  isStarred: z.preprocess(v => v === 'true', z.boolean().optional()),
  isArchived: z.preprocess(v => v === 'true', z.boolean().optional()),
  contextProjectId: z.string().uuid().optional(),
  semantic: z.preprocess(v => v === 'true', z.boolean().optional()),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const raw = getQuery(event)
  const startTime = Date.now()

  const parsed = searchParamsSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid search parameters' })
  }

  const params = parsed.data
  const searchScope = params.scope!
  const limit = params.limit!

  const hasQuery = !!(params.q || params.author || params.title || params.tag || params.project || params.year || params.doi)

  if (!hasQuery) {
    return {
      entries: { items: [], total: 0 },
      projects: { items: [], total: 0 },
      tags: { items: [], total: 0 },
      annotations: { items: [], total: 0 },
      query: params.q || '',
      took: Date.now() - startTime,
    }
  }

  const meta = (field: string) =>
    sql`(${entries.metadata} #>> '{}')::jsonb->>${sql.raw(`'${field}'`)}`
  const authorsJsonb = sql`(${entries.authors} #>> '{}')::jsonb`

  const searchEntries = async () => {
    if (searchScope !== 'all' && searchScope !== 'entries') {
      return { items: [], total: 0 }
    }

    const conditions = [eq(entries.userId, user.id)]

    if (params.q) {
      const pattern = `%${params.q}%`
      conditions.push(
        or(
          ilike(entries.title, pattern),
          sql`(
            jsonb_typeof(${authorsJsonb}) = 'array'
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(${authorsJsonb}) AS a
              WHERE a->>'lastName' ILIKE ${pattern}
                OR a->>'firstName' ILIKE ${pattern}
            )
          )`,
          sql`${entries.year}::text ILIKE ${pattern}`,
          sql`${meta('doi')} ILIKE ${pattern}`,
          sql`${meta('isbn')} ILIKE ${pattern}`,
          sql`${meta('journal')} ILIKE ${pattern}`,
          sql`${meta('publisher')} ILIKE ${pattern}`,
          sql`${meta('abstract')} ILIKE ${pattern}`,
          ilike(entries.notes, pattern),
        )!,
      )
    }

    if (params.author) {
      const authorPattern = `%${params.author}%`
      conditions.push(
        sql`(
          jsonb_typeof(${authorsJsonb}) = 'array'
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(${authorsJsonb}) AS a
            WHERE a->>'lastName' ILIKE ${authorPattern}
              OR a->>'firstName' ILIKE ${authorPattern}
          )
        )`,
      )
    }

    if (params.title) {
      conditions.push(ilike(entries.title, `%${params.title}%`))
    }

    if (params.doi) {
      conditions.push(sql`${meta('doi')} ILIKE ${`%${params.doi}%`}`)
    }

    if (params.year) {
      conditions.push(sql`${entries.year}::text = ${params.year}`)
    }

    if (params.yearFrom) {
      conditions.push(sql`${entries.year} >= ${params.yearFrom}`)
    }

    if (params.yearTo) {
      conditions.push(sql`${entries.year} <= ${params.yearTo}`)
    }

    if (params.entryType) {
      conditions.push(sql`${entries.entryType} = ${params.entryType}`)
    }

    if (params.isFavorite) {
      conditions.push(eq(entries.isFavorite, true))
    }

    const q = params.q || ''
    const relevanceScore = q
      ? sql<number>`(
          CASE WHEN ${entries.title} ILIKE ${q} THEN 100
               WHEN ${entries.title} ILIKE ${`${q}%`} THEN 80
               WHEN ${entries.title} ILIKE ${`%${q}%`} THEN 60
               ELSE 0 END
          + CASE WHEN jsonb_typeof(${authorsJsonb}) = 'array' AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(${authorsJsonb}) AS a
              WHERE a->>'lastName' ILIKE ${q} OR a->>'firstName' ILIKE ${q}
            ) THEN 50
            WHEN jsonb_typeof(${authorsJsonb}) = 'array' AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(${authorsJsonb}) AS a
              WHERE a->>'lastName' ILIKE ${`%${q}%`} OR a->>'firstName' ILIKE ${`%${q}%`}
            ) THEN 30
            ELSE 0 END
          + CASE WHEN ${entries.year}::text = ${q} THEN 40 ELSE 0 END
          + CASE WHEN ${meta('journal')} ILIKE ${`%${q}%`} THEN 20 ELSE 0 END
          + CASE WHEN ${meta('publisher')} ILIKE ${`%${q}%`} THEN 15 ELSE 0 END
          + CASE WHEN ${meta('doi')} ILIKE ${`%${q}%`} THEN 10 ELSE 0 END
          + CASE WHEN ${meta('abstract')} ILIKE ${`%${q}%`} THEN 5 ELSE 0 END
        )`
      : sql<number>`0`

    const [countResult, entryResults] = await Promise.all([
      db.select({ count: sql<number>`count(DISTINCT ${entries.id})` })
        .from(entries)
        .where(and(...conditions)),
      db.select({
        id: entries.id,
        entryType: entries.entryType,
        title: entries.title,
        authors: entries.authors,
        year: entries.year,
        metadata: entries.metadata,
        isFavorite: entries.isFavorite,
      })
        .from(entries)
        .where(and(...conditions))
        .orderBy(q ? desc(relevanceScore) : desc(entries.updatedAt))
        .limit(limit),
    ])

    const total = Number(countResult[0]?.count ?? 0)

    if (entryResults.length === 0) {
      return { items: [], total }
    }

    const entryIds = entryResults.map(e => e.id)

    const [tagData, projectData, annotationCounts] = await Promise.all([
      db.select({
        entryId: entryTags.entryId,
        tagId: tags.id,
        tagName: tags.name,
        tagColor: tags.color,
      })
        .from(entryTags)
        .innerJoin(tags, eq(entryTags.tagId, tags.id))
        .where(inArray(entryTags.entryId, entryIds)),
      db.select({
        entryId: entryProjects.entryId,
        projectId: projects.id,
        projectName: projects.name,
        projectColor: projects.color,
      })
        .from(entryProjects)
        .innerJoin(projects, eq(entryProjects.projectId, projects.id))
        .where(inArray(entryProjects.entryId, entryIds)),
      db.select({
        entryId: annotations.entryId,
        count: sql<number>`count(*)`,
      })
        .from(annotations)
        .where(inArray(annotations.entryId, entryIds))
        .groupBy(annotations.entryId),
    ])

    const tagsByEntry: Record<string, Array<{ id: string; name: string; color: string | null }>> = {}
    for (const t of tagData) {
      if (!t.entryId) continue
      if (!tagsByEntry[t.entryId]) tagsByEntry[t.entryId] = []
      tagsByEntry[t.entryId].push({ id: t.tagId, name: t.tagName, color: t.tagColor })
    }

    const projectsByEntry: Record<string, Array<{ id: string; name: string; color: string | null }>> = {}
    for (const p of projectData) {
      if (!p.entryId) continue
      if (!projectsByEntry[p.entryId]) projectsByEntry[p.entryId] = []
      projectsByEntry[p.entryId].push({ id: p.projectId, name: p.projectName, color: p.projectColor })
    }

    const annotationsByEntry: Record<string, number> = {}
    for (const a of annotationCounts) {
      if (a.entryId) annotationsByEntry[a.entryId] = Number(a.count)
    }

    const items = entryResults.map(e => ({
      ...e,
      tags: tagsByEntry[e.id] || [],
      projects: projectsByEntry[e.id] || [],
      annotationCount: annotationsByEntry[e.id] || 0,
    }))

    return { items, total }
  }

  const searchProjects = async () => {
    if (searchScope !== 'all' && searchScope !== 'projects') {
      return { items: [], total: 0 }
    }

    const conditions = [eq(projects.userId, user.id)]

    if (params.q || params.project) {
      const term = params.project || params.q!
      const pattern = `%${term}%`
      conditions.push(
        or(
          ilike(projects.name, pattern),
          ilike(projects.description, pattern),
        )!,
      )
    }

    if (params.isStarred) {
      conditions.push(eq(projects.isStarred, true))
    }

    if (params.isArchived !== undefined) {
      conditions.push(eq(projects.isArchived, params.isArchived))
    }

    const [countResult, projectResults] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(and(...conditions)),
      db.select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        isStarred: projects.isStarred,
        isArchived: projects.isArchived,
        slug: projects.slug,
      })
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.updatedAt))
        .limit(limit),
    ])

    const total = Number(countResult[0]?.count ?? 0)

    if (projectResults.length === 0) {
      return { items: [], total }
    }

    const projectIds = projectResults.map(p => p.id)
    const entryCounts = await db
      .select({
        projectId: entryProjects.projectId,
        count: sql<number>`count(*)`,
      })
      .from(entryProjects)
      .where(inArray(entryProjects.projectId, projectIds))
      .groupBy(entryProjects.projectId)

    const countMap: Record<string, number> = {}
    for (const c of entryCounts) {
      countMap[c.projectId] = Number(c.count)
    }

    const items = projectResults.map(p => ({
      ...p,
      entryCount: countMap[p.id] || 0,
    }))

    return { items, total }
  }

  const searchTags = async () => {
    if (searchScope !== 'all' && searchScope !== 'tags') {
      return { items: [], total: 0 }
    }

    const conditions = [eq(tags.userId, user.id)]

    if (params.q || params.tag) {
      const term = params.tag || params.q!
      const pattern = `%${term}%`
      conditions.push(
        or(
          ilike(tags.name, pattern),
          ilike(tags.description, pattern),
        )!,
      )
    }

    const [countResult, tagResults] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(tags)
        .where(and(...conditions)),
      db.select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        description: tags.description,
      })
        .from(tags)
        .where(and(...conditions))
        .orderBy(tags.name)
        .limit(limit),
    ])

    const total = Number(countResult[0]?.count ?? 0)

    if (tagResults.length === 0) {
      return { items: [], total }
    }

    const tagIds = tagResults.map(t => t.id)
    const entryCounts = await db
      .select({
        tagId: entryTags.tagId,
        count: sql<number>`count(*)`,
      })
      .from(entryTags)
      .where(inArray(entryTags.tagId, tagIds))
      .groupBy(entryTags.tagId)

    const countMap: Record<string, number> = {}
    for (const c of entryCounts) {
      countMap[c.tagId] = Number(c.count)
    }

    const items = tagResults.map(t => ({
      ...t,
      entryCount: countMap[t.id] || 0,
    }))

    return { items, total }
  }

  const searchAnnotations = async () => {
    if (searchScope !== 'all' && searchScope !== 'annotations') {
      return { items: [], total: 0 }
    }

    const conditions = [eq(annotations.userId, user.id)]

    if (params.q) {
      conditions.push(ilike(annotations.content, `%${params.q}%`))
    }

    const [countResult, annotationResults] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(annotations)
        .where(and(...conditions)),
      db.select({
        id: annotations.id,
        content: annotations.content,
        annotationType: annotations.annotationType,
        entryId: annotations.entryId,
        createdAt: annotations.createdAt,
      })
        .from(annotations)
        .where(and(...conditions))
        .orderBy(desc(annotations.createdAt))
        .limit(limit),
    ])

    const total = Number(countResult[0]?.count ?? 0)

    if (annotationResults.length === 0) {
      return { items: [], total }
    }

    const entryIds = [...new Set(annotationResults.map(a => a.entryId))]
    const parentEntries = await db
      .select({
        id: entries.id,
        title: entries.title,
        entryType: entries.entryType,
      })
      .from(entries)
      .where(inArray(entries.id, entryIds))

    const entryMap: Record<string, { title: string; entryType: string }> = {}
    for (const e of parentEntries) {
      entryMap[e.id] = { title: e.title, entryType: e.entryType }
    }

    const items = annotationResults.map(a => ({
      id: a.id,
      content: a.content.slice(0, 200),
      annotationType: a.annotationType,
      entryId: a.entryId,
      entryTitle: entryMap[a.entryId]?.title || 'Unknown entry',
      entryType: entryMap[a.entryId]?.entryType || 'custom',
      createdAt: a.createdAt.toISOString(),
    }))

    return { items, total }
  }

  const [entryResults, projectResults, tagResults, annotationResults] = await Promise.all([
    searchEntries(),
    searchProjects(),
    searchTags(),
    searchAnnotations(),
  ])

  return {
    entries: entryResults,
    projects: projectResults,
    tags: tagResults,
    annotations: annotationResults,
    query: params.q || '',
    took: Date.now() - startTime,
  }
})
