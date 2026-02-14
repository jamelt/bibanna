import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { UserPreferences } from '~/shared/types'

const updateSchema = z
  .object({
    defaultCitationStyle: z.string().optional(),
    defaultExportFormat: z.string().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    emailNotifications: z.boolean().optional(),
  })
  .strict()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid preferences data',
      data: parsed.error.flatten(),
    })
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { preferences: true },
  })

  const existingPreferences = (dbUser?.preferences ?? {}) as UserPreferences
  const merged: UserPreferences = { ...existingPreferences, ...parsed.data }

  const [updated] = await db
    .update(users)
    .set({
      preferences: merged,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning({ preferences: users.preferences })

  return updated?.preferences as UserPreferences
})
