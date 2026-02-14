import { db } from '~/server/database/client'
import { announcements } from '~/server/database/schema'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'maintenance', 'release']).default('info'),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const body = await readBody(event)
  const parsed = createSchema.parse(body)

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

  const [created] = await db
    .insert(announcements)
    .values({
      createdById: admin.id,
      title: parsed.title,
      content: parsed.content,
      type: parsed.type,
      startAt: parsed.startAt ? new Date(parsed.startAt) : new Date(),
      endAt: parsed.endAt ? new Date(parsed.endAt) : undefined,
    })
    .returning()

  await logAdminAction(
    admin.id,
    'announcement.create',
    'announcement',
    created?.id,
    {
      title: parsed.title,
      type: parsed.type,
    },
    ip,
  )

  return created
})
