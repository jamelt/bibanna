import { db } from '~/server/database/client'
import { feedback } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdminOrSupport, logAdminAction } from '~/server/utils/auth'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  adminNotes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdminOrSupport(event)

  const feedbackId = getRouterParam(event, 'id')
  if (!feedbackId) {
    throw createError({ statusCode: 400, message: 'Feedback ID is required' })
  }

  const body = await readBody(event)
  const parsed = updateSchema.parse(body)

  const existing = await db.query.feedback.findFirst({
    where: eq(feedback.id, feedbackId),
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Feedback not found' })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (parsed.status !== undefined) {
    updates.status = parsed.status
    if (parsed.status === 'resolved' || parsed.status === 'closed') {
      updates.resolvedById = admin.id
    }
  }
  if (parsed.adminNotes !== undefined) {
    updates.adminNotes = parsed.adminNotes
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  const [updated] = await db
    .update(feedback)
    .set(updates)
    .where(eq(feedback.id, feedbackId))
    .returning()

  await logAdminAction(
    admin.id,
    'feedback.update',
    'feedback',
    feedbackId,
    {
      previousStatus: existing.status,
      newStatus: parsed.status,
    },
    ip,
  )

  return updated
})
