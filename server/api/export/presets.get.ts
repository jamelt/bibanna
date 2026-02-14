import { db } from '~/server/database/client'
import { excelPresets } from '~/server/database/schema'
import { systemPresets, allAvailableColumns } from '~/server/services/export'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const userPresets = await db.query.excelPresets.findMany({
    where: eq(excelPresets.userId, user.id),
    orderBy: (presets, { asc }) => [asc(presets.name)],
  })

  return {
    systemPresets: systemPresets.map((p) => ({
      ...p,
      isSystem: true,
    })),
    userPresets: userPresets.map((p) => ({
      ...p,
      isSystem: false,
    })),
    availableColumns: allAvailableColumns,
  }
})
