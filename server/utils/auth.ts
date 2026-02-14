import type { H3Event } from 'h3'
import { db } from '../database/client'
import { users, adminAuditLogs } from '../database/schema'
import { eq } from 'drizzle-orm'
import type { UserRole } from '~/shared/types'
import {
  type SubscriptionTier,
  getTierLimits,
  PAID_TIER_IDS,
  isValidTier,
  DEFAULT_TIER,
} from '~/shared/subscriptions'

export interface AuthUser {
  id: string
  email: string
  name?: string
  subscriptionTier: SubscriptionTier
  role: UserRole
  isBanned: boolean
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
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      message: 'User not found',
    })
  }

  if (user.isBanned) {
    throw createError({
      statusCode: 403,
      message: 'Your account has been suspended',
    })
  }

  const tier = isValidTier(user.subscriptionTier) ? user.subscriptionTier : DEFAULT_TIER

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    subscriptionTier: tier,
    role: user.role,
    isBanned: user.isBanned,
  }
}

export async function requireAdmin(event: H3Event): Promise<AuthUser> {
  const user = await requireAuth(event)

  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required',
    })
  }

  return user
}

export async function requireAdminOrSupport(event: H3Event): Promise<AuthUser> {
  const user = await requireAuth(event)

  if (user.role !== 'admin' && user.role !== 'support') {
    throw createError({
      statusCode: 403,
      message: 'Admin or support access required',
    })
  }

  return user
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
) {
  await db.insert(adminAuditLogs).values({
    adminId,
    action,
    targetType,
    targetId,
    details,
    ipAddress,
  })
}

export async function optionalAuth(event: H3Event): Promise<AuthUser | null> {
  try {
    return await requireAuth(event)
  } catch {
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

export function requirePaidTier(user: AuthUser): void {
  requireTier(user, PAID_TIER_IDS)
}

export function requireProTier(user: AuthUser): void {
  requireTier(user, ['pro'])
}

export const requireLightOrProTier = requirePaidTier

export { getTierLimits }
