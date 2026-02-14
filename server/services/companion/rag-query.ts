import { OpenAI } from 'openai'
import { db } from '~/server/database/client'
import { researchPersonas, type ChunkMetadata } from '~/server/database/schema'
import { eq, sql, desc } from 'drizzle-orm'
import { generateEmbedding } from './document-ingestion'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface RetrievedChunk {
  id: string
  content: string
  metadata: ChunkMetadata | null
  similarity: number
}

export interface RAGResponse {
  answer: string
  citations: Array<{
    sourceId: string
    sourceType: string
    title?: string
    excerpt: string
  }>
  confidence: number
}

export async function retrieveRelevantChunks(
  query: string,
  projectId: string,
  limit: number = 5,
  similarityThreshold: number = 0.7,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query)

  const results = await db.execute(sql`
    SELECT 
      id,
      content,
      metadata,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM document_chunks
    WHERE project_id = ${projectId}
      AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${similarityThreshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `)

  return results.rows.map((row: any) => ({
    id: row.id,
    content: row.content,
    metadata: row.metadata as ChunkMetadata | null,
    similarity: row.similarity,
  }))
}

export async function generateRAGResponse(
  query: string,
  projectId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  mode: 'general' | 'fact-check' | 'brainstorm' | 'synthesize' | 'gap-analysis' = 'general',
): Promise<RAGResponse> {
  const relevantChunks = await retrieveRelevantChunks(query, projectId, 8, 0.65)

  const contextText = relevantChunks
    .map((chunk, i) => `[Source ${i + 1}: ${chunk.metadata?.title || 'Unknown'}]\n${chunk.content}`)
    .join('\n\n')

  const persona = await db.query.researchPersonas.findFirst({
    where: eq(researchPersonas.projectId, projectId),
    orderBy: [desc(researchPersonas.updatedAt)],
  })

  const modeInstructions: Record<string, string> = {
    general:
      'Answer the question accurately using the provided sources. Cite sources when making claims.',
    'fact-check':
      'Verify the claim against the provided sources. Identify supporting evidence, contradictions, or gaps in the available information.',
    brainstorm:
      'Use the sources as inspiration to generate creative ideas and connections. Think expansively while staying grounded in the research context.',
    synthesize:
      'Synthesize information from multiple sources to create a comprehensive overview. Identify patterns, themes, and connections.',
    'gap-analysis':
      'Analyze what information is present in the sources and what is missing. Identify potential research gaps or areas needing further investigation.',
  }

  const systemPrompt = `You are a Research Companion AI assistant helping with academic research.

${persona ? `Research Persona: ${persona.name}\nExpertise: ${persona.expertise?.join(', ')}\nTopics: ${persona.dominantTopics?.join(', ')}\n` : ''}

Mode: ${mode.toUpperCase()}
Instructions: ${modeInstructions[mode]}

Context from project sources:
${contextText || 'No relevant sources found in the project.'}

Guidelines:
- Always cite sources using [Source N] format when making claims
- Be honest about uncertainty and limitations of the available information
- If the context doesn't contain relevant information, say so clearly
- Maintain academic rigor and objectivity
- Use clear, accessible language while maintaining scholarly precision`

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: query },
  ]

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: mode === 'brainstorm' ? 0.8 : 0.3,
    max_tokens: 2000,
  })

  const answer = completion.choices[0]?.message?.content || ''

  const citedSourceIndices = new Set<number>()
  const citationMatches = answer.matchAll(/\[Source (\d+)\]/g)
  for (const match of citationMatches) {
    citedSourceIndices.add(parseInt(match[1]) - 1)
  }

  const citations = Array.from(citedSourceIndices)
    .filter((i) => i >= 0 && i < relevantChunks.length)
    .map((i) => {
      const chunk = relevantChunks[i]
      return {
        sourceId: chunk.id,
        sourceType: chunk.metadata?.sourceType || 'unknown',
        title: chunk.metadata?.title,
        excerpt: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
      }
    })

  const avgSimilarity =
    relevantChunks.length > 0
      ? relevantChunks.reduce((sum, c) => sum + c.similarity, 0) / relevantChunks.length
      : 0

  const confidence = Math.round(avgSimilarity * 100)

  return {
    answer,
    citations,
    confidence,
  }
}

export async function generateFollowUpQuestions(
  query: string,
  answer: string,
  projectId: string,
): Promise<string[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Generate 3 relevant follow-up questions based on the research query and answer. Return only the questions, one per line.',
      },
      {
        role: 'user',
        content: `Query: ${query}\n\nAnswer: ${answer}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  })

  const content = completion.choices[0]?.message?.content || ''
  return content
    .split('\n')
    .filter((q) => q.trim().length > 0)
    .slice(0, 3)
}
