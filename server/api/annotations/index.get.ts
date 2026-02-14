import { db } from '~/server/database/client'
import { annotations, entries, entryProjects, projects } from '~/server/database/schema'
import { eq, desc, asc, sql, ilike, and, inArray } from 'drizzle-orm'

const SORT_FIELDS = {
  updatedAt: annotations.updatedAt,
  createdAt: annotations.createdAt,
  entryTitle: entries.title,
  annotationType: annotations.annotationType,
  entryYear: entries.year,
} as const

type SortField = keyof typeof SORT_FIELDS

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const search = (query.search as string)?.trim() || ''
  const typeFilter = (query.type as string)?.trim() || ''
  const projectId = (query.projectId as string)?.trim() || ''
  const sortBy = ((query.sortBy as string)?.trim() as SortField) || 'updatedAt'
  const sortOrder = (query.sortOrder as string)?.trim() === 'asc' ? 'asc' : 'desc'

  const conditions = [eq(annotations.userId, user.id)]

  if (search) {
    conditions.push(ilike(annotations.content, `%${search}%`))
  }

  if (typeFilter) {
    conditions.push(eq(annotations.annotationType, typeFilter as any))
  }

  if (projectId) {
    const projectEntryIds = db
      .select({ entryId: entryProjects.entryId })
      .from(entryProjects)
      .where(eq(entryProjects.projectId, projectId))

    conditions.push(inArray(annotations.entryId, projectEntryIds))
  }

  const where = and(...conditions)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(annotations)
    .innerJoin(entries, eq(annotations.entryId, entries.id))
    .where(where)

  const total = Number(countResult?.count ?? 0)

  const sortColumn = SORT_FIELDS[sortBy] ?? SORT_FIELDS.updatedAt
  const orderFn = sortOrder === 'asc' ? asc : desc

  const results = await db
    .select({
      id: annotations.id,
      entryId: annotations.entryId,
      content: annotations.content,
      annotationType: annotations.annotationType,
      highlights: annotations.highlights,
      sortOrder: annotations.sortOrder,
      createdAt: annotations.createdAt,
      updatedAt: annotations.updatedAt,
      entryTitle: entries.title,
      entryAuthors: entries.authors,
      entryYear: entries.year,
      entryType: entries.entryType,
    })
    .from(annotations)
    .innerJoin(entries, eq(annotations.entryId, entries.id))
    .where(where)
    .orderBy(orderFn(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return {
    data: results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
})
