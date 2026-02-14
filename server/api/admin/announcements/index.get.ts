import { db } from '~/server/database/client'
import { announcements } from '~/server/database/schema'
import { desc } from 'drizzle-orm'
import { requireAdminOrSupport } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdminOrSupport(event)

  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(50)

  return rows
})
