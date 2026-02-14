import { shareProjectWithUser, createPublicLink } from '~/server/services/sharing'
import { requireLightOrProTier } from '~/server/utils/auth'
import { getTierLimits } from '~/shared/subscriptions'
import { db } from '~/server/database/client'
import { projectShares } from '~/server/database/schema'
import { eq, and, count } from 'drizzle-orm'
import { z } from 'zod'

const shareSchema = z.object({
  type: z.enum(['user', 'public']),
  email: z.string().email().optional(),
  permission: z.enum(['view', 'comment', 'edit']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireLightOrProTier(user)

  const projectId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const parsed = shareSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid share data',
      data: parsed.error.flatten(),
    })
  }

  const { type, email, permission, expiresInDays } = parsed.data

  if (type === 'user') {
    if (!email) {
      throw createError({
        statusCode: 400,
        message: 'Email is required for user shares',
      })
    }

    const limits = getTierLimits(user.subscriptionTier)
    const [existingCount] = await db
      .select({ count: count() })
      .from(projectShares)
      .where(and(eq(projectShares.projectId, projectId), eq(projectShares.isPublicLink, false)))

    if (existingCount && existingCount.count >= limits.collaboratorsPerProject) {
      throw createError({
        statusCode: 403,
        message: `You have reached the limit of ${limits.collaboratorsPerProject} collaborators per project for your plan`,
      })
    }

    try {
      const share = await shareProjectWithUser(projectId, user.id, email, permission)
      return share
    } catch (error: any) {
      throw createError({
        statusCode: 403,
        message: error.message,
      })
    }
  }

  if (type === 'public') {
    if (permission === 'edit') {
      throw createError({
        statusCode: 400,
        message: 'Public links cannot have edit permission',
      })
    }

    try {
      const result = await createPublicLink(projectId, user.id, permission)
      return result
    } catch (error: any) {
      throw createError({
        statusCode: 403,
        message: error.message,
      })
    }
  }

  throw createError({
    statusCode: 400,
    message: 'Invalid share type',
  })
})
