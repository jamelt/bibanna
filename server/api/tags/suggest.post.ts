import { OpenAI } from 'openai'
import { z } from 'zod'
import { db } from '~/server/database/client'
import { tags, entries } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

const suggestSchema = z.object({
  entryId: z.string().uuid().optional(),
  text: z.string().optional(),
}).refine(data => data.entryId || data.text, {
  message: 'Either entryId or text is required',
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = suggestSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Either entryId or text is required' })
  }

  let sourceText = parsed.data.text || ''

  if (parsed.data.entryId) {
    const entry = await db.query.entries.findFirst({
      where: and(eq(entries.id, parsed.data.entryId), eq(entries.userId, user.id)),
    })
    if (!entry) throw createError({ statusCode: 404, message: 'Entry not found' })

    const metadata = entry.metadata as Record<string, unknown> | null
    sourceText = [
      entry.title,
      metadata?.abstract as string | undefined,
      metadata?.journal as string | undefined,
      metadata?.publisher as string | undefined,
      entry.notes,
    ].filter(Boolean).join('\n')
  }

  if (!sourceText.trim()) {
    return { suggestions: [] }
  }

  const userTags = await db.query.tags.findMany({
    where: eq(tags.userId, user.id),
  })

  const existingTagNames = userTags.map(t => t.name)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a research taxonomy assistant. Given source text and a list of existing tags, suggest which existing tags apply and propose new relevant tags for categorizing this academic source.

Return JSON:
{
  "suggestions": [
    { "name": "Tag Name", "confidence": 0.95, "reason": "Brief explanation" }
  ]
}

Rules:
- Prioritize matching existing tags before suggesting new ones
- Suggest 3-8 tags total
- Confidence: 0.0 to 1.0
- Only suggest highly relevant tags
- For new tags, use concise academic category names`,
      },
      {
        role: 'user',
        content: `Existing tags: ${existingTagNames.length > 0 ? existingTagNames.join(', ') : '(none)'}\n\nSource text:\n${sourceText.slice(0, 2000)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) return { suggestions: [] }

  try {
    const result = JSON.parse(content)
    return {
      suggestions: (result.suggestions || []).map((s: { name: string; confidence: number; reason: string }) => {
        const existingTag = userTags.find(t => t.name.toLowerCase() === s.name.toLowerCase())
        return {
          name: s.name,
          confidence: s.confidence,
          reason: s.reason,
          isExisting: !!existingTag,
          existingTagId: existingTag?.id,
        }
      }),
    }
  }
  catch {
    return { suggestions: [] }
  }
})
