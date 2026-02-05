import { db } from '~/server/database/client'
import { projects, entryProjects } from '~/server/database/schema'
import { eq, sql, desc } from 'drizzle-orm'

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
      settings: projects.settings,
      slug: projects.slug,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      entryCount: sql<number>`(
        SELECT COUNT(*) FROM ${entryProjects}
        WHERE ${entryProjects.projectId} = ${projects.id}
      )`,
    })
    .from(projects)
    .where(
      includeArchived
        ? eq(projects.userId, user.id)
        : sql`${projects.userId} = ${user.id} AND ${projects.isArchived} = false`,
    )
    .orderBy(desc(projects.updatedAt))

  return userProjects.map(p => ({
    ...p,
    entryCount: Number(p.entryCount),
  }))
})
