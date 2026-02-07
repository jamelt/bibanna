import { db } from '~/server/database/client'
import { projects } from '~/server/database/schema'
import { updateProjectSchema } from '~/shared/validation'
import { eq, and } from 'drizzle-orm'
import { buildProjectWhere } from '~/server/utils/project-query'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const body = await readBody(event)
  const parsed = updateProjectSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid project data',
      data: parsed.error.flatten(),
    })
  }

  const existingProject = await db.query.projects.findFirst({
    where: buildProjectWhere(projectId, user.id),
  })

  if (!existingProject) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  }

  if (parsed.data.name && parsed.data.name !== existingProject.name) {
    const baseSlug = slugify(parsed.data.name)
    if (baseSlug) {
      updateData.slug = await generateUniqueProjectSlug(user.id, baseSlug, existingProject.id)
    }
  }

  const [updatedProject] = await db
    .update(projects)
    .set(updateData)
    .where(and(
      eq(projects.id, existingProject.id),
      eq(projects.userId, user.id),
    ))
    .returning()

  return updatedProject
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function generateUniqueProjectSlug(
  userId: string,
  baseSlug: string,
  excludeProjectId: string,
): Promise<string> {
  let candidate = baseSlug || 'project'
  let suffix = 2

  for (;;) {
    const existing = await db.query.projects.findFirst({
      where: and(
        eq(projects.userId, userId),
        eq(projects.slug, candidate),
      ),
    })

    if (!existing || existing.id === excludeProjectId) {
      return candidate
    }

    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }
}
