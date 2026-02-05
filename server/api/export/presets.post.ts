import { db } from '~/server/database/client'
import { exportPresets } from '~/server/database/schema'
import { z } from 'zod'

const presetSchema = z.object({
  name: z.string().min(1).max(100),
  columns: z.array(z.object({
    id: z.string(),
    header: z.string(),
    field: z.string(),
    width: z.number(),
    enabled: z.boolean(),
    order: z.number(),
    format: z.string().optional(),
  })),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = presetSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid preset data',
      data: parsed.error.flatten(),
    })
  }

  const { name, columns } = parsed.data

  const [preset] = await db.insert(exportPresets).values({
    userId: user.id,
    name,
    columns,
    type: 'excel',
  }).returning()

  return preset
})
