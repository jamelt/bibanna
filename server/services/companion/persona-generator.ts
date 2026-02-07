import { OpenAI } from 'openai'
import { db } from '~/server/database/client'
import { researchPersonas, entries, entryProjects, tags, entryTags } from '~/server/database/schema'
import { eq, inArray } from 'drizzle-orm'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface ResearchPersona {
  name: string
  title?: string
  expertise: string[]
  personality?: string
  dominantTopics: string[]
  timeRange?: { start: number; end: number }
  sourceCount?: number
  identifiedGaps: string[]
  systemPrompt: string
}

export async function generateResearchPersona(
  projectId: string,
  userId: string,
): Promise<ResearchPersona> {
  const projectEntryIds = await db
    .select({ entryId: entryProjects.entryId })
    .from(entryProjects)
    .where(eq(entryProjects.projectId, projectId))

  const entryIds = projectEntryIds.map(e => e.entryId)

  if (entryIds.length === 0) {
    return getDefaultPersona()
  }

  const projectEntries = await db.query.entries.findMany({
    where: inArray(entries.id, entryIds),
  })

  const projectTags = await db
    .select({
      name: tags.name,
    })
    .from(entryTags)
    .innerJoin(tags, eq(tags.id, entryTags.tagId))
    .where(inArray(entryTags.entryId, entryIds))

  const entryTypes = [...new Set(projectEntries.map(e => e.entryType))]
  const years = projectEntries.map(e => e.year).filter(Boolean) as number[]
  const minYear = years.length > 0 ? Math.min(...years) : null
  const maxYear = years.length > 0 ? Math.max(...years) : null

  const titles = projectEntries.map(e => e.title).slice(0, 20)
  const tagNames = [...new Set(projectTags.map(t => t.name))]

  const projectContext = `
Project Analysis:
- Number of sources: ${projectEntries.length}
- Source types: ${entryTypes.join(', ')}
- Year range: ${minYear && maxYear ? `${minYear}-${maxYear}` : 'Not specified'}
- Tags/Topics: ${tagNames.length > 0 ? tagNames.join(', ') : 'None specified'}

Sample Titles:
${titles.map(t => `- ${t}`).join('\n')}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert at analyzing research projects and creating AI research assistant personas.
        
Based on the project context, create a specialized research persona that would be most helpful for this researcher.

Return a JSON object with these fields:
{
  "name": "A creative name for the persona (e.g., 'Dr. Neural Navigator', 'The Methodology Maven')",
  "title": "A brief title/role for the persona",
  "expertise": ["Area 1", "Area 2", "Area 3", "Area 4", "Area 5"],
  "personality": "Description of how this persona communicates (e.g., 'Socratic questioning', 'Data-driven analysis')",
  "dominantTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "identifiedGaps": ["Gap 1", "Gap 2", "Gap 3"],
  "systemPrompt": "A detailed system prompt for the AI to adopt this persona when answering questions"
}

The identifiedGaps should be research gaps that the persona has identified based on the project sources.`,
      },
      {
        role: 'user',
        content: projectContext,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1000,
  })

  try {
    const content = completion.choices[0]?.message?.content
    if (!content) {
      return getDefaultPersona()
    }

    const parsed = JSON.parse(content)

    const persona: ResearchPersona = {
      name: parsed.name || 'Research Assistant',
      title: parsed.title,
      expertise: parsed.expertise || [],
      personality: parsed.personality,
      dominantTopics: parsed.dominantTopics || tagNames,
      timeRange: minYear && maxYear ? { start: minYear, end: maxYear } : undefined,
      sourceCount: projectEntries.length,
      identifiedGaps: parsed.identifiedGaps || [],
      systemPrompt: parsed.systemPrompt || getDefaultSystemPrompt(parsed.name),
    }

    await db.insert(researchPersonas).values({
      projectId,
      userId,
      name: persona.name,
      title: persona.title,
      expertise: persona.expertise,
      personality: persona.personality,
      dominantTopics: persona.dominantTopics,
      timeRange: persona.timeRange,
      sourceCount: persona.sourceCount,
      identifiedGaps: persona.identifiedGaps,
      systemPrompt: persona.systemPrompt,
    }).onConflictDoUpdate({
      target: [researchPersonas.projectId],
      set: {
        name: persona.name,
        title: persona.title,
        expertise: persona.expertise,
        personality: persona.personality,
        dominantTopics: persona.dominantTopics,
        timeRange: persona.timeRange,
        sourceCount: persona.sourceCount,
        identifiedGaps: persona.identifiedGaps,
        systemPrompt: persona.systemPrompt,
        updatedAt: new Date(),
      },
    })

    return persona
  }
  catch (error) {
    console.error('Failed to parse persona:', error)
    return getDefaultPersona()
  }
}

function getDefaultSystemPrompt(name: string = 'Research Assistant'): string {
  return `You are ${name}, a knowledgeable and helpful research assistant. You help researchers understand their sources, identify patterns, and develop their arguments. Be clear, supportive, and academically rigorous in your responses.`
}

function getDefaultPersona(): ResearchPersona {
  return {
    name: 'Research Assistant',
    title: 'General Research Companion',
    expertise: ['Literature Review', 'Source Analysis', 'Academic Writing', 'Research Methods', 'Citation Management'],
    personality: 'Clear, supportive, and academically rigorous',
    dominantTopics: [],
    identifiedGaps: [],
    systemPrompt: getDefaultSystemPrompt(),
  }
}

export async function getOrCreatePersona(
  projectId: string,
  userId: string,
): Promise<ResearchPersona> {
  const existing = await db.query.researchPersonas.findFirst({
    where: eq(researchPersonas.projectId, projectId),
  })

  if (existing) {
    return {
      name: existing.name,
      title: existing.title || undefined,
      expertise: existing.expertise || [],
      personality: existing.personality || undefined,
      dominantTopics: existing.dominantTopics || [],
      timeRange: existing.timeRange || undefined,
      sourceCount: existing.sourceCount || undefined,
      identifiedGaps: existing.identifiedGaps || [],
      systemPrompt: existing.systemPrompt,
    }
  }

  return await generateResearchPersona(projectId, userId)
}
