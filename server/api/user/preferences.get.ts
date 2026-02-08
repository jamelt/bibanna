import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import type { UserPreferences } from '~/shared/types'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { preferences: true },
  })

  return (dbUser?.preferences ?? {}) as UserPreferences
})
