import { db } from '~/server/database/client'
import { sql } from 'drizzle-orm'

type CheckStatus = 'healthy' | 'unhealthy' | 'unconfigured'

interface HealthCheck {
  status: CheckStatus
  latency?: number
  error?: string
  critical: boolean
}

export default defineEventHandler(async () => {
  const startTime = Date.now()

  const checks: Record<string, HealthCheck> = {
    database: { status: 'healthy', critical: true },
    stripe: { status: 'healthy', critical: false },
  }

  try {
    const dbStart = Date.now()
    await db.execute(sql`SELECT 1`)
    checks.database!.latency = Date.now() - dbStart
  } catch (error: any) {
    checks.database!.status = 'unhealthy'
    checks.database!.error = error.message
  }

  const stripeKey = process.env.NUXT_STRIPE_SECRET_KEY
  if (!stripeKey) {
    checks.stripe!.status = 'unconfigured'
    checks.stripe!.error = 'Stripe secret key not configured'
  } else {
    try {
      const stripeStart = Date.now()
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${stripeKey}` },
      })
      checks.stripe!.latency = Date.now() - stripeStart
      if (!res.ok) {
        checks.stripe!.status = 'unhealthy'
        checks.stripe!.error = `Stripe API returned ${res.status}`
      }
    } catch (error: any) {
      checks.stripe!.status = 'unhealthy'
      checks.stripe!.error = error.message
    }
  }

  const criticalChecks = Object.values(checks).filter((c) => c.critical)
  const overallStatus = criticalChecks.every((c) => c.status === 'healthy')
    ? 'healthy'
    : 'unhealthy'

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    latency: Date.now() - startTime,
    checks,
  }

  if (overallStatus === 'unhealthy') {
    throw createError({
      statusCode: 503,
      message: 'Service unhealthy',
      data: response,
    })
  }

  return response
})
