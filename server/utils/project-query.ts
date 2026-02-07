import { eq, or, and, SQL } from 'drizzle-orm'
import { projects } from '~/server/database/schema'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function buildProjectWhere(projectIdOrSlug: string, userId: string): SQL {
  const isUUID = UUID_REGEX.test(projectIdOrSlug)

  return and(
    isUUID
      ? or(
          eq(projects.id, projectIdOrSlug),
          eq(projects.slug, projectIdOrSlug),
        )
      : eq(projects.slug, projectIdOrSlug),
    eq(projects.userId, userId),
  )!
}
