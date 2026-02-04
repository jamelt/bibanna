import { OpenAI } from 'openai'
import { db } from '~/server/database/client'
import { researchPersonas, entries, entryProjects, tags, entryTags } from '~/server/database/schema'
import { eq, inArray, sql } from 'drizzle-orm'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface ResearchPersona {
  name: string
  description: string
  expertise: string[]
  researchFocus: string
  communicationStyle: string
  suggestedQuestions: string[]
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
  "description": "A 2-3 sentence description of the persona's expertise and approach",
  "expertise": ["Area 1", "Area 2", "Area 3", "Area 4", "Area 5"],
  "researchFocus": "A concise description of the primary research focus this persona can help with",
  "communicationStyle": "Description of how this persona communicates (e.g., 'Socratic questioning', 'Data-driven analysis')",
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]
}

The suggested questions should be substantive research questions that would help advance this project.`,
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

    const persona = JSON.parse(content) as ResearchPersona

    await db.insert(researchPersonas).values({
      projectId,
      userId,
      name: persona.name,
      description: persona.description,
      expertise: persona.expertise,
      researchFocus: persona.researchFocus,
      communicationStyle: persona.communicationStyle,
      suggestedQuestions: persona.suggestedQuestions,
    }).onConflictDoUpdate({
      target: [researchPersonas.projectId],
      set: {
        name: persona.name,
        description: persona.description,
        expertise: persona.expertise,
        researchFocus: persona.researchFocus,
        communicationStyle: persona.communicationStyle,
        suggestedQuestions: persona.suggestedQuestions,
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

function getDefaultPersona(): ResearchPersona {
  return {
    name: 'Research Assistant',
    description: 'A general-purpose research assistant ready to help with your academic work. Add more sources to develop a specialized persona.',
    expertise: ['Literature Review', 'Source Analysis', 'Academic Writing', 'Research Methods', 'Citation Management'],
    researchFocus: 'General academic research support',
    communicationStyle: 'Clear, supportive, and academically rigorous',
    suggestedQuestions: [
      'What are the main themes across your sources?',
      'How do your sources relate to each other?',
      'What gaps exist in your current research?',
      'What methodological approaches are represented in your sources?',
      'How might you synthesize these sources into a coherent argument?',
    ],
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
      description: existing.description || '',
      expertise: existing.expertise || [],
      researchFocus: existing.researchFocus || '',
      communicationStyle: existing.communicationStyle || '',
      suggestedQuestions: existing.suggestedQuestions || [],
    }
  }

  return await generateResearchPersona(projectId, userId)
}
