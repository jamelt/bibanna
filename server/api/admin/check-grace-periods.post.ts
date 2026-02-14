import { db } from '~/server/database/client'
import { subscriptions, users, adminAuditLogs } from '~/server/database/schema'
import { eq, and, lte, isNotNull } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'
import { DEFAULT_TIER } from '~/shared/subscriptions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const result = await processExpiredGracePeriods()
  return result
})

async function getSystemAdminId(): Promise<string> {
  const admin = await db.query.users.findFirst({
    where: eq(users.role, 'admin'),
    columns: { id: true },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  })
  return admin?.id ?? '00000000-0000-0000-0000-000000000000'
}

export async function processExpiredGracePeriods() {
  const now = new Date()

  const expiredSubscriptions = await db
    .select({
      subscriptionId: subscriptions.id,
      userId: subscriptions.userId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      tier: subscriptions.tier,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, 'past_due'),
        isNotNull(subscriptions.graceEndsAt),
        lte(subscriptions.graceEndsAt, now),
      ),
    )

  if (expiredSubscriptions.length === 0) {
    return { processed: 0, downgraded: 0 }
  }

  const systemAdminId = await getSystemAdminId()
  let downgraded = 0

  for (const sub of expiredSubscriptions) {
    await db
      .update(users)
      .set({
        subscriptionTier: DEFAULT_TIER,
        updatedAt: now,
      })
      .where(eq(users.id, sub.userId))

    await db
      .update(subscriptions)
      .set({
        graceEndsAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, sub.subscriptionId))

    await db.insert(adminAuditLogs).values({
      adminId: systemAdminId,
      action: 'subscription.grace_expired',
      targetType: 'user',
      targetId: sub.userId,
      details: {
        previousTier: sub.tier,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        automated: true,
      },
    })

    downgraded++
  }

  return { processed: expiredSubscriptions.length, downgraded }
}
