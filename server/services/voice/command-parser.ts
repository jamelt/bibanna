import { OpenAI } from 'openai'
import type { EntryType } from '~/shared/types'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface ParsedEntryData {
  title?: string
  authors?: Array<{ firstName?: string; lastName: string }>
  year?: number
  entryType?: EntryType
  metadata?: Record<string, any>
  confidence: number
  rawText: string
}

export async function parseVoiceCommand(transcript: string): Promise<ParsedEntryData> {
  const systemPrompt = `You are a citation parsing assistant. Extract bibliographic information from voice transcripts.

Return a JSON object with these fields (only include fields you can confidently extract):
- title: The title of the work
- authors: Array of {firstName, lastName} objects
- year: Publication year as a number
- entryType: One of: book, journal_article, conference_paper, thesis, website, newspaper, magazine, video, podcast, report, chapter, patent, legal_case, other
- metadata: Object with additional fields like:
  - publisher, publisherLocation
  - journal, volume, issue, pages
  - doi, isbn, issn, url
  - edition, editor

Be smart about common speech patterns:
- "by [author name]" indicates the author
- "published in [year]" or "from [year]" indicates year
- "in the journal [name]" indicates a journal article
- "chapter [N] of [book]" indicates a book chapter
- Numbers spoken as words should be converted to digits

Return only valid JSON. If you cannot extract any information, return {"confidence": 0, "rawText": "[original text]"}.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { confidence: 0, rawText: transcript }
    }

    const parsed = JSON.parse(content) as Partial<ParsedEntryData>

    let confidence = 0
    if (parsed.title) confidence += 30
    if (parsed.authors?.length) confidence += 25
    if (parsed.year) confidence += 20
    if (parsed.entryType) confidence += 15
    if (parsed.metadata && Object.keys(parsed.metadata).length > 0) confidence += 10

    return {
      ...parsed,
      confidence: Math.min(confidence, 100),
      rawText: transcript,
    }
  }
  catch (error) {
    console.error('Voice command parsing error:', error)
    return { confidence: 0, rawText: transcript }
  }
}

export function parseSimpleCommand(transcript: string): { action: string; target?: string } | null {
  const normalizedText = transcript.toLowerCase().trim()

  const commandPatterns = [
    { pattern: /^add\s+(a\s+)?(new\s+)?(.+)$/i, action: 'add', targetGroup: 3 },
    { pattern: /^create\s+(a\s+)?(new\s+)?(.+)$/i, action: 'create', targetGroup: 3 },
    { pattern: /^search\s+(for\s+)?(.+)$/i, action: 'search', targetGroup: 2 },
    { pattern: /^find\s+(.+)$/i, action: 'search', targetGroup: 1 },
    { pattern: /^go\s+to\s+(.+)$/i, action: 'navigate', targetGroup: 1 },
    { pattern: /^open\s+(.+)$/i, action: 'navigate', targetGroup: 1 },
    { pattern: /^delete\s+(.+)$/i, action: 'delete', targetGroup: 1 },
    { pattern: /^remove\s+(.+)$/i, action: 'delete', targetGroup: 1 },
    { pattern: /^export\s+(to\s+)?(.+)$/i, action: 'export', targetGroup: 2 },
  ]

  for (const { pattern, action, targetGroup } of commandPatterns) {
    const match = normalizedText.match(pattern)
    if (match) {
      return {
        action,
        target: match[targetGroup]?.trim(),
      }
    }
  }

  return null
}

export function identifyEntryType(text: string): EntryType | null {
  const normalizedText = text.toLowerCase()

  const typePatterns: Array<{ patterns: string[]; type: EntryType }> = [
    { patterns: ['book', 'textbook', 'monograph'], type: 'book' },
    { patterns: ['article', 'journal', 'paper', 'publication'], type: 'journal_article' },
    { patterns: ['conference', 'proceeding', 'symposium'], type: 'conference_paper' },
    { patterns: ['thesis', 'dissertation', 'phd', 'masters'], type: 'thesis' },
    { patterns: ['website', 'webpage', 'web page', 'online', 'url'], type: 'website' },
    { patterns: ['newspaper', 'news article'], type: 'newspaper' },
    { patterns: ['magazine'], type: 'magazine' },
    { patterns: ['video', 'youtube', 'film', 'movie', 'documentary'], type: 'video' },
    { patterns: ['podcast', 'audio', 'episode'], type: 'podcast' },
    { patterns: ['report', 'technical report', 'white paper'], type: 'report' },
    { patterns: ['chapter', 'book chapter', 'section'], type: 'chapter' },
    { patterns: ['patent'], type: 'patent' },
    { patterns: ['case', 'legal', 'court', 'ruling'], type: 'legal_case' },
  ]

  for (const { patterns, type } of typePatterns) {
    for (const pattern of patterns) {
      if (normalizedText.includes(pattern)) {
        return type
      }
    }
  }

  return null
}
