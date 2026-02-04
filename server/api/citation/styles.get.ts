import { db } from '~/server/database/client'
import { citationStyles } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { getDefaultStyles } from '~/server/services/citation'

export default defineEventHandler(async (event) => {
  const user = await optionalAuth(event)

  const defaultStyles = getDefaultStyles()

  let customStyles: typeof citationStyles.$inferSelect[] = []

  if (user) {
    customStyles = await db.query.citationStyles.findMany({
      where: eq(citationStyles.userId, user.id),
      orderBy: (styles, { desc }) => [desc(styles.updatedAt)],
    })
  }

  return {
    defaultStyles: defaultStyles.map(style => ({
      id: style.id,
      name: style.name,
      shortName: style.shortName,
      category: style.category,
      fields: style.fields,
      description: style.description,
      isDefault: true,
    })),
    customStyles: customStyles.map(style => ({
      id: style.id,
      name: style.name,
      description: style.description,
      isPublic: style.isPublic,
      isDefault: false,
      createdAt: style.createdAt,
      updatedAt: style.updatedAt,
    })),
  }
})
