import { db } from '~/server/database/client'
import { announcements } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
  type: z.enum(['info', 'warning', 'maintenance', 'release']).optional(),
  isActive: z.boolean().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const announcementId = getRouterParam(event, 'id')
  if (!announcementId) {
    throw createError({ statusCode: 400, message: 'Announcement ID is required' })
  }

  const body = await readBody(event)
  const parsed = updateSchema.parse(body)

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, announcementId),
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Announcement not found' })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.title !== undefined) updates.title = parsed.title
  if (parsed.content !== undefined) updates.content = parsed.content
  if (parsed.type !== undefined) updates.type = parsed.type
  if (parsed.isActive !== undefined) updates.isActive = parsed.isActive
  if (parsed.startAt !== undefined) updates.startAt = new Date(parsed.startAt)
  if (parsed.endAt !== undefined) updates.endAt = parsed.endAt ? new Date(parsed.endAt) : null

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  const [updated] = await db
    .update(announcements)
    .set(updates)
    .where(eq(announcements.id, announcementId))
    .returning()

  await logAdminAction(
    admin.id,
    'announcement.update',
    'announcement',
    announcementId,
    {
      changes: parsed,
    },
    ip,
  )

  return updated
})
