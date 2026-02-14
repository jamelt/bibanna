import { z } from 'zod'
import { db } from '~/server/database/client'
import { tags } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'

const importTagSchema = z.object({
  name: z.string().min(1),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  description: z.string().optional(),
  groupName: z.string().optional(),
})

const importSchema = z.object({
  tags: z.array(importTagSchema).min(1),
  strategy: z.enum(['skip', 'merge']).default('skip'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid import data',
      data: parsed.error.flatten(),
    })
  }

  let imported = 0
  let skipped = 0
  let updated = 0

  for (const tagData of parsed.data.tags) {
    const existing = await db.query.tags.findFirst({
      where: and(eq(tags.userId, user.id), eq(tags.name, tagData.name)),
    })

    if (existing) {
      if (parsed.data.strategy === 'merge') {
        await db
          .update(tags)
          .set({
            color: tagData.color || existing.color,
            description: tagData.description || existing.description,
            groupName: tagData.groupName || existing.groupName,
          })
          .where(eq(tags.id, existing.id))
        updated++
      } else {
        skipped++
      }
    } else {
      await db.insert(tags).values({
        userId: user.id,
        name: tagData.name,
        color: tagData.color || '#6B7280',
        description: tagData.description,
        groupName: tagData.groupName,
      })
      imported++
    }
  }

  return { imported, skipped, updated }
})
