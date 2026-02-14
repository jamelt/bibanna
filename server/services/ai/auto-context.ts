import { OpenAI } from 'openai'
import type { Entry } from '~/shared/types'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface AutoContext {
  summary: string
  keyThemes: string[]
  relatedTopics: string[]
  historicalContext?: string
  methodologicalApproach?: string
  limitations?: string[]
  implications?: string[]
  suggestedReadings?: string[]
}

export async function generateAutoContext(entry: Entry): Promise<AutoContext> {
  const entryContext = buildEntryContext(entry)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert academic research assistant. Analyze the provided source and generate comprehensive context to help researchers understand its significance and relevance.

Return a JSON object with the following fields:
{
  "summary": "A 2-3 sentence summary of the source's main contribution",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "relatedTopics": ["Related area 1", "Related area 2"],
  "historicalContext": "Brief context about how this work fits into the broader field",
  "methodologicalApproach": "Description of the methodology used (if applicable)",
  "limitations": ["Limitation 1", "Limitation 2"],
  "implications": ["Implication 1", "Implication 2"],
  "suggestedReadings": ["Author (Year) - Title suggestion 1", "Author (Year) - Title suggestion 2"]
}`,
      },
      {
        role: 'user',
        content: entryContext,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1500,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('Failed to generate context')
  }

  return JSON.parse(content) as AutoContext
}

export async function generateContextFromAbstract(abstract: string): Promise<Partial<AutoContext>> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Analyze this abstract and extract key information. Return JSON with:
{
  "summary": "1-2 sentence summary",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "methodologicalApproach": "methodology if mentioned"
}`,
      },
      {
        role: 'user',
        content: abstract,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
    max_tokens: 500,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return {}
  }

  return JSON.parse(content) as Partial<AutoContext>
}

export async function suggestRelatedSources(
  entry: Entry,
  existingEntries: Entry[],
): Promise<string[]> {
  const entryTitles = existingEntries.map((e) => e.title).join('\n- ')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Given a source and a list of existing sources in a research library, suggest search terms or specific works that would complement the research. Return a JSON array of 3-5 suggestions.`,
      },
      {
        role: 'user',
        content: `Current source: "${entry.title}" by ${entry.authors?.map((a) => `${a.firstName} ${a.lastName}`).join(', ') || 'Unknown'}

Existing sources in library:
- ${entryTitles || 'None'}

Suggest complementary sources or search terms.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 300,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return []
  }

  const parsed = JSON.parse(content) as { suggestions: string[] }
  return parsed.suggestions || []
}

function buildEntryContext(entry: Entry): string {
  const parts = [
    `Title: ${entry.title}`,
    `Type: ${entry.entryType}`,
    entry.authors?.length
      ? `Authors: ${entry.authors.map((a) => `${a.firstName} ${a.lastName}`).join(', ')}`
      : null,
    entry.year ? `Year: ${entry.year}` : null,
    entry.metadata?.abstract ? `Abstract: ${entry.metadata.abstract}` : null,
    entry.metadata?.journal ? `Journal: ${entry.metadata.journal}` : null,
    entry.metadata?.publisher ? `Publisher: ${entry.metadata.publisher}` : null,
    entry.metadata?.doi ? `DOI: ${entry.metadata.doi}` : null,
  ]

  return parts.filter(Boolean).join('\n')
}
