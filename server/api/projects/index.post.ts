import { db } from '~/server/database/client'
import { projects } from '~/server/database/schema'
import { createProjectSchema } from '~/shared/validation'
import { getTierLimits } from '~/shared/subscriptions'
import { and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid project data',
      data: parsed.error.flatten(),
    })
  }

  const limits = getTierLimits(user.subscriptionTier)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.userId, user.id))

  const currentCount = Number(countResult?.count ?? 0)
  if (currentCount >= limits.projects) {
    throw createError({
      statusCode: 403,
      message: `You have reached the maximum number of projects (${limits.projects}) for your subscription tier. Please upgrade to add more.`,
    })
  }

  const baseSlug = slugify(parsed.data.name)

  let uniqueSlug: string | undefined

  if (baseSlug) {
    uniqueSlug = await generateUniqueProjectSlug(user.id, baseSlug)
  }

  const [newProject] = await db
    .insert(projects)
    .values({
      userId: user.id,
      ...parsed.data,
      slug: uniqueSlug,
    })
    .returning()

  return {
    ...newProject,
    entryCount: 0,
  }
})

// Helpers

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function generateUniqueProjectSlug(userId: string, baseSlug: string): Promise<string> {
  let candidate = baseSlug || 'project'
  let suffix = 2

  for (;;) {
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.userId, userId), eq(projects.slug, candidate)),
    })

    if (!existing) {
      return candidate
    }

    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }
}
