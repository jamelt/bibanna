import { OpenAI } from 'openai'
import type { Entry, AnnotationType } from '~/shared/types'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface GeneratedAnnotation {
  content: string
  type: AnnotationType
  confidence: number
  suggestions?: string[]
}

const ANNOTATION_PROMPTS: Record<AnnotationType, string> = {
  summary: `Write a concise summary (3-5 sentences) of this source's main argument, findings, or contribution. Focus on what the source says, not your evaluation of it.`,

  assessment: `Write a critical assessment (3-5 sentences) of this source. Consider:
- Strengths and weaknesses of the argument/methodology
- Credibility of the evidence
- Potential biases or limitations
- How well it achieves its stated goals`,

  reflection: `Write a reflective annotation (3-5 sentences) connecting this source to broader research themes. Consider:
- How it relates to other works in the field
- Its contribution to ongoing scholarly debates
- How it might inform future research`,

  quote: `Extract 2-3 of the most significant quotes from this source that capture its main ideas or provide useful evidence. Format as:
"Quote 1" (p. X)
"Quote 2" (p. X)`,

  methodology: `Describe the research methodology used in this source (3-5 sentences). Include:
- Research design (qualitative, quantitative, mixed)
- Data collection methods
- Analysis approach
- Sample/population (if applicable)`,

  findings: `Summarize the key findings or conclusions of this source (3-5 sentences). Focus on:
- Main results or arguments
- Supporting evidence
- Implications of the findings`,

  connection: `Describe how this source connects to your research (3-5 sentences). Consider:
- Relevance to your research question
- How it supports or challenges your thesis
- Gaps it helps address`,

  custom: `Write a general annotation for this source based on its content.`,
}

export async function generateAnnotation(
  entry: Entry,
  type: AnnotationType,
  additionalContext?: string,
): Promise<GeneratedAnnotation> {
  const prompt = ANNOTATION_PROMPTS[type] || ANNOTATION_PROMPTS.custom
  const entryContext = buildEntryContext(entry)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert academic writing assistant helping create annotations for a bibliography. Write in a scholarly but accessible tone. Be specific and avoid generic statements.

${prompt}`,
      },
      {
        role: 'user',
        content: `Source Information:
${entryContext}

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Generate a ${type} annotation for this source.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  const content = completion.choices[0]?.message?.content || ''

  const confidence = calculateConfidence(entry, content)

  return {
    content: content.trim(),
    type,
    confidence,
    suggestions: generateImprovementSuggestions(content, type),
  }
}

export async function validateAnnotation(
  annotation: string,
  entry: Entry,
  type: AnnotationType,
): Promise<{
  isValid: boolean
  issues: string[]
  suggestions: string[]
  improvedVersion?: string
}> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert at evaluating academic annotations. Analyze the provided annotation and return a JSON object with:
{
  "isValid": boolean,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "improvedVersion": "optional improved version if issues found"
}

Check for:
- Accuracy relative to source information
- Appropriate length and detail
- Academic tone
- Relevance to annotation type
- Clarity and coherence`,
      },
      {
        role: 'user',
        content: `Source: ${entry.title} (${entry.year})
Type: ${type}
Annotation: ${annotation}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 600,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return { isValid: true, issues: [], suggestions: [] }
  }

  return JSON.parse(content)
}

export async function improveAnnotation(
  annotation: string,
  entry: Entry,
  feedback: string,
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert academic writing assistant. Improve the provided annotation based on the feedback while maintaining the original meaning and intent.`,
      },
      {
        role: 'user',
        content: `Source: ${entry.title}

Original annotation:
${annotation}

Feedback to address:
${feedback}

Please provide an improved version of the annotation.`,
      },
    ],
    temperature: 0.6,
    max_tokens: 500,
  })

  return completion.choices[0]?.message?.content?.trim() || annotation
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
  ]

  return parts.filter(Boolean).join('\n')
}

function calculateConfidence(entry: Entry, annotation: string): number {
  let confidence = 0.5

  if (entry.metadata?.abstract) confidence += 0.2
  if (entry.authors?.length) confidence += 0.1
  if (entry.year) confidence += 0.05
  if (entry.metadata?.doi) confidence += 0.1

  if (annotation.length > 100) confidence += 0.05

  return Math.min(confidence, 1)
}

function generateImprovementSuggestions(annotation: string, type: AnnotationType): string[] {
  const suggestions: string[] = []

  if (annotation.length < 100) {
    suggestions.push('Consider adding more detail to strengthen the annotation')
  }

  if (type === 'assessment' && !annotation.toLowerCase().includes('however')) {
    suggestions.push('Consider acknowledging both strengths and limitations')
  }

  if (type === 'methodology' && !annotation.match(/qualitative|quantitative|mixed/i)) {
    suggestions.push('Specify the research design type (qualitative, quantitative, or mixed)')
  }

  return suggestions
}
