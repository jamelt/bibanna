import type { H3Event } from 'h3'
import { db } from '../database/client'
import { users } from '../database/schema'
import { eq } from 'drizzle-orm'
import type { SubscriptionTier } from '~/shared/types'

export interface AuthUser {
  id: string
  email: string
  name?: string
  subscriptionTier: SubscriptionTier
}

export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const session = await getUserSession(event)
  const sessionUser = session?.user as { id?: string } | undefined

  if (!sessionUser?.id) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionUser.id),
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'User not found',
    })
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    subscriptionTier: user.subscriptionTier,
  }
}

export async function optionalAuth(event: H3Event): Promise<AuthUser | null> {
  try {
    return await requireAuth(event)
  }
  catch {
    return null
  }
}

export function requireTier(user: AuthUser, requiredTiers: SubscriptionTier[]): void {
  if (!requiredTiers.includes(user.subscriptionTier)) {
    throw createError({
      statusCode: 403,
      message: `This feature requires a ${requiredTiers.join(' or ')} subscription`,
    })
  }
}

export function requireProTier(user: AuthUser): void {
  requireTier(user, ['pro'])
}

export function requireLightOrProTier(user: AuthUser): void {
  requireTier(user, ['light', 'pro'])
}

export const TIER_LIMITS = {
  free: {
    entries: 50,
    projects: 3,
    collaboratorsPerProject: 0,
    customCitationStyles: 0,
    metadataEnrichmentPerMonth: 10,
    aiAnnotationsPerMonth: 0,
    voiceMinutesPerMonth: 0,
    excelPresets: 1,
    customColumns: 0,
  },
  light: {
    entries: 500,
    projects: 15,
    collaboratorsPerProject: 3,
    customCitationStyles: 3,
    metadataEnrichmentPerMonth: 100,
    aiAnnotationsPerMonth: 5,
    voiceMinutesPerMonth: 10,
    excelPresets: 5,
    customColumns: 3,
  },
  pro: {
    entries: Infinity,
    projects: Infinity,
    collaboratorsPerProject: Infinity,
    customCitationStyles: Infinity,
    metadataEnrichmentPerMonth: Infinity,
    aiAnnotationsPerMonth: 50,
    voiceMinutesPerMonth: 60,
    excelPresets: Infinity,
    customColumns: Infinity,
  },
} as const

export function getTierLimits(tier: SubscriptionTier) {
  return TIER_LIMITS[tier]
}
