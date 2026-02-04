import { db } from '~/server/database/client'
import { citationStyles } from '~/server/database/schema'
import { eq, and, count } from 'drizzle-orm'
import { requireLightOrProTier, TIER_LIMITS } from '~/server/utils/auth'
import { z } from 'zod'

const createStyleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cslXml: z.string().min(100),
  isPublic: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireLightOrProTier(user)

  const body = await readBody(event)

  const parsed = createStyleSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid style data',
      data: parsed.error.flatten(),
    })
  }

  const limits = TIER_LIMITS[user.subscriptionTier]
  const [existingCount] = await db
    .select({ count: count() })
    .from(citationStyles)
    .where(eq(citationStyles.userId, user.id))

  if (existingCount.count >= limits.customCitationStyles) {
    throw createError({
      statusCode: 403,
      message: `You have reached the limit of ${limits.customCitationStyles} custom citation styles for your plan`,
    })
  }

  const { name, description, cslXml, isPublic } = parsed.data

  const [style] = await db
    .insert(citationStyles)
    .values({
      userId: user.id,
      name,
      description,
      cslXml,
      isPublic,
    })
    .returning()

  return style
})
