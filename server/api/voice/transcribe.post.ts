import { OpenAI } from 'openai'
import { requireLightOrProTier } from '~/server/utils/auth'
import { getTierLimits } from '~/shared/subscriptions'
import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireLightOrProTier(user)

  const formData = await readMultipartFormData(event)

  if (!formData) {
    throw createError({
      statusCode: 400,
      message: 'No audio data provided',
    })
  }

  const audioFile = formData.find((f) => f.name === 'audio')
  const languageField = formData.find((f) => f.name === 'language')
  const promptField = formData.find((f) => f.name === 'prompt')

  if (!audioFile || !audioFile.data) {
    throw createError({
      statusCode: 400,
      message: 'Audio file is required',
    })
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  if (!dbUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  const limits = getTierLimits(user.subscriptionTier)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const monthlyUsage = (dbUser.preferences as any)?.voiceMinutesUsed?.[currentMonth] || 0
  const audioDurationSeconds = estimateAudioDuration(
    audioFile.data.length,
    audioFile.type || 'audio/webm',
  )
  const audioDurationMinutes = audioDurationSeconds / 60

  if (monthlyUsage + audioDurationMinutes > limits.voiceMinutesPerMonth) {
    throw createError({
      statusCode: 403,
      message: `You have used ${Math.round(monthlyUsage)} of ${limits.voiceMinutesPerMonth} voice transcription minutes this month`,
    })
  }

  try {
    const language = languageField?.data?.toString() || 'en'
    const prompt =
      promptField?.data?.toString() ||
      'Academic bibliography, citation, research paper, journal article, book reference'

    const file = new File([audioFile.data], 'audio.webm', {
      type: audioFile.type || 'audio/webm',
    })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      prompt,
      response_format: 'json',
    })

    const updatedPreferences = {
      ...((dbUser.preferences as object) || {}),
      voiceMinutesUsed: {
        ...((dbUser.preferences as any)?.voiceMinutesUsed || {}),
        [currentMonth]: monthlyUsage + audioDurationMinutes,
      },
    }

    await db.update(users).set({ preferences: updatedPreferences }).where(eq(users.id, user.id))

    return {
      text: transcription.text,
      duration: audioDurationMinutes,
      remainingMinutes: limits.voiceMinutesPerMonth - monthlyUsage - audioDurationMinutes,
    }
  } catch (error: any) {
    console.error('Whisper API error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to transcribe audio',
    })
  }
})

function estimateAudioDuration(byteLength: number, mimeType: string): number {
  const bitRates: Record<string, number> = {
    'audio/webm': 128000,
    'audio/ogg': 128000,
    'audio/mp3': 128000,
    'audio/mpeg': 128000,
    'audio/wav': 1411000,
    'audio/m4a': 128000,
  }

  const bitRate = bitRates[mimeType] || 128000
  return (byteLength * 8) / bitRate
}
