import { db } from '~/server/database/client'
import { entries, veritasScores } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'
import { calculateVeritasScore } from '~/server/services/veritas'
import { requireProTier } from '~/server/utils/auth'
import { z } from 'zod'
import type { Entry } from '~/shared/types'

const overrideSchema = z.object({
  action: z.enum(['refresh', 'override']),
  overrideScore: z.number().int().min(0).max(100).optional(),
  overrideReason: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireProTier(user)

  const entryId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!entryId) {
    throw createError({
      statusCode: 400,
      message: 'Entry ID is required',
    })
  }

  const parsed = overrideSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: parsed.error.flatten(),
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

  const { action, overrideScore, overrideReason } = parsed.data

  if (action === 'override') {
    if (overrideScore === undefined) {
      throw createError({
        statusCode: 400,
        message: 'Override score is required for override action',
      })
    }

    const existingScore = await db.query.veritasScores.findFirst({
      where: eq(veritasScores.entryId, entryId),
    })

    if (!existingScore) {
      throw createError({
        statusCode: 400,
        message: 'Calculate the Veritas score first before overriding',
      })
    }

    const [updated] = await db
      .update(veritasScores)
      .set({
        userOverride: overrideScore,
        userOverrideReason: overrideReason || null,
      })
      .where(eq(veritasScores.entryId, entryId))
      .returning()

    return {
      ...updated,
      overallScore: updated.userOverride ?? updated.overallScore,
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
        userOverride: null,
        userOverrideReason: null,
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
