import { OpenAI } from 'openai'
import type { Entry, VeritasFactor } from '~/shared/types'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface AICredibilityAssessment {
  overallScore: number
  confidence: number
  factors: VeritasFactor[]
  reasoning: string
  warnings: string[]
}

export async function assessCredibilityWithAI(entry: Entry): Promise<AICredibilityAssessment> {
  const entryContext = buildEntryContext(entry)
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert at evaluating the credibility of academic and informational sources. Analyze the provided source and assess its credibility.

Return a JSON object with:
{
  "overallScore": number (0-100),
  "confidence": number (0-1, how confident you are in this assessment),
  "factors": [
    {
      "name": "Factor name",
      "score": number (0-100),
      "weight": number (0-1),
      "evidence": "Brief explanation",
      "source": "AI Assessment"
    }
  ],
  "reasoning": "2-3 sentence explanation of the overall assessment",
  "warnings": ["Any red flags or concerns"]
}

Consider these factors:
1. Source Type Credibility (academic journal vs blog vs news)
2. Author Expertise (if determinable)
3. Publisher/Platform Reputation
4. Currency (how recent)
5. Evidence Quality (methodology, citations)
6. Potential Bias
7. Transparency (clear attribution, methodology)

Be conservative - if you can't determine something, score it at 50 with low weight.`,
      },
      {
        role: 'user',
        content: entryContext,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return getDefaultAssessment()
  }

  try {
    const parsed = JSON.parse(content) as AICredibilityAssessment
    
    parsed.factors = parsed.factors.map(f => ({
      ...f,
      source: 'AI Assessment',
    }))
    
    parsed.confidence = Math.min(parsed.confidence, 0.7)
    
    return parsed
  } catch {
    return getDefaultAssessment()
  }
}

export async function assessWebsiteCredibility(
  url: string,
  title: string,
  content?: string,
): Promise<AICredibilityAssessment> {
  const domain = new URL(url).hostname
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Assess the credibility of this website source. Consider the domain, content type, and any available information. Return JSON with overallScore (0-100), confidence (0-1), factors array, reasoning, and warnings.`,
      },
      {
        role: 'user',
        content: `URL: ${url}
Domain: ${domain}
Title: ${title}
${content ? `Content preview: ${content.substring(0, 500)}...` : ''}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 800,
  })

  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
  
  return {
    overallScore: parsed.overallScore || 50,
    confidence: Math.min(parsed.confidence || 0.5, 0.6),
    factors: (parsed.factors || []).map((f: VeritasFactor) => ({
      ...f,
      source: 'AI Assessment',
    })),
    reasoning: parsed.reasoning || 'Limited information available for assessment',
    warnings: parsed.warnings || [],
  }
}

export async function detectMisinformationRisk(entry: Entry): Promise<{
  riskLevel: 'low' | 'medium' | 'high'
  indicators: string[]
  recommendation: string
}> {
  const entryContext = buildEntryContext(entry)
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Analyze this source for potential misinformation risk factors. Return JSON with:
{
  "riskLevel": "low" | "medium" | "high",
  "indicators": ["indicator1", "indicator2"],
  "recommendation": "Brief recommendation for the researcher"
}

Look for:
- Sensationalist language
- Lack of citations/sources
- Known misinformation domains
- Extraordinary claims without evidence
- Anonymous or unclear authorship
- Outdated information presented as current`,
      },
      {
        role: 'user',
        content: entryContext,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 400,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return {
      riskLevel: 'medium',
      indicators: ['Unable to assess'],
      recommendation: 'Verify this source through additional channels',
    }
  }

  return JSON.parse(content)
}

function buildEntryContext(entry: Entry): string {
  const parts = [
    `Title: ${entry.title}`,
    `Type: ${entry.entryType}`,
    entry.authors?.length 
      ? `Authors: ${entry.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}`
      : 'Authors: Not specified',
    entry.year ? `Year: ${entry.year}` : 'Year: Not specified',
    entry.metadata?.abstract ? `Abstract: ${entry.metadata.abstract}` : null,
    entry.metadata?.journal ? `Journal: ${entry.metadata.journal}` : null,
    entry.metadata?.publisher ? `Publisher: ${entry.metadata.publisher}` : null,
    entry.metadata?.doi ? `DOI: ${entry.metadata.doi}` : null,
    entry.url ? `URL: ${entry.url}` : null,
  ]

  return parts.filter(Boolean).join('\n')
}

function getDefaultAssessment(): AICredibilityAssessment {
  return {
    overallScore: 50,
    confidence: 0.3,
    factors: [
      {
        name: 'Source Type',
        score: 50,
        weight: 0.3,
        evidence: 'Unable to determine source credibility',
        source: 'Default',
      },
    ],
    reasoning: 'Insufficient information available for a reliable credibility assessment',
    warnings: ['This assessment has low confidence due to limited available information'],
  }
}
