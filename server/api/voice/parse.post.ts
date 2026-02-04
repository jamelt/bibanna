import { parseVoiceCommand, parseSimpleCommand, identifyEntryType } from '~/server/services/voice/command-parser'
import { z } from 'zod'

const parseSchema = z.object({
  transcript: z.string().min(1).max(5000),
  mode: z.enum(['entry', 'command', 'auto']).default('auto'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = parseSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: parsed.error.flatten(),
    })
  }

  const { transcript, mode } = parsed.data

  if (mode === 'command' || mode === 'auto') {
    const command = parseSimpleCommand(transcript)
    if (command) {
      return {
        type: 'command',
        command,
      }
    }
  }

  if (mode === 'entry' || mode === 'auto') {
    const entryData = await parseVoiceCommand(transcript)

    if (!entryData.entryType && entryData.rawText) {
      entryData.entryType = identifyEntryType(entryData.rawText) || undefined
    }

    return {
      type: 'entry',
      data: entryData,
    }
  }

  return {
    type: 'unknown',
    rawText: transcript,
  }
})
