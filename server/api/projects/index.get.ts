import { db } from '~/server/database/client'
import { projects, entryProjects } from '~/server/database/schema'
import { eq, sql, desc, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const includeArchived = query.includeArchived === 'true'

  const userProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      isArchived: projects.isArchived,
      isStarred: projects.isStarred,
      settings: projects.settings,
      slug: projects.slug,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      entryCount: sql<number>`CAST(COUNT(${entryProjects.entryId}) AS INTEGER)`,
    })
    .from(projects)
    .leftJoin(entryProjects, eq(projects.id, entryProjects.projectId))
    .where(
      includeArchived
        ? eq(projects.userId, user.id)
        : sql`${projects.userId} = ${user.id} AND ${projects.isArchived} = false`,
    )
    .groupBy(
      projects.id,
      projects.name,
      projects.description,
      projects.color,
      projects.isArchived,
      projects.isStarred,
      projects.settings,
      projects.slug,
      projects.createdAt,
      projects.updatedAt,
      projects.userId,
    )
    .orderBy(desc(projects.updatedAt))

  return userProjects.map((p) => ({
    ...p,
    entryCount: Number(p.entryCount) || 0,
  }))
})
