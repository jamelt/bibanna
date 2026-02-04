import { db } from '~/server/database/client'
import { entries, veritasScores } from '~/server/database/schema'
import { eq, and, gt } from 'drizzle-orm'
import { calculateVeritasScore } from '~/server/services/veritas'
import { requireProTier } from '~/server/utils/auth'
import type { Entry } from '~/shared/types'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireProTier(user)

  const entryId = getRouterParam(event, 'id')

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID is required',
    })
  }

  const entry = await db.query.entries.findFirst({
    where: and(
      eq(entries.id, entryId),
      eq(entries.userId, user.id),
    ),
  })

  if (!entry) {
    throw createError({
      statusCode: 404,
      message: 'Entry not found',
    })
  }

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const cachedScore = await db.query.veritasScores.findFirst({
    where: and(
      eq(veritasScores.entryId, entryId),
      gt(veritasScores.expiresAt, new Date()),
    ),
  })

  if (cachedScore) {
    return {
      id: cachedScore.id,
      entryId: cachedScore.entryId,
      overallScore: cachedScore.userOverride ?? cachedScore.overallScore,
      confidence: cachedScore.confidence,
      label: cachedScore.label,
      factors: cachedScore.factors,
      dataSources: cachedScore.dataSources,
      calculatedAt: cachedScore.calculatedAt,
      userOverride: cachedScore.userOverride,
      userOverrideReason: cachedScore.userOverrideReason,
    }
  }

  const score = await calculateVeritasScore(entry as Entry)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const [savedScore] = await db
    .insert(veritasScores)
    .values({
      entryId,
      overallScore: score.overall,
      confidence: score.confidence,
      label: score.label,
      factors: score.factors,
      dataSources: score.dataSources,
      calculatedAt: score.calculatedAt,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: veritasScores.entryId,
      set: {
        overallScore: score.overall,
        confidence: score.confidence,
        label: score.label,
        factors: score.factors,
        dataSources: score.dataSources,
        calculatedAt: score.calculatedAt,
        expiresAt,
      },
    })
    .returning()

  return {
    id: savedScore.id,
    entryId: savedScore.entryId,
    overallScore: savedScore.overallScore,
    confidence: savedScore.confidence,
    label: savedScore.label,
    factors: savedScore.factors,
    dataSources: savedScore.dataSources,
    calculatedAt: savedScore.calculatedAt,
  }
})
