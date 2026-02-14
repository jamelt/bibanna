import { db } from '~/server/database/client'
import { companionConversations, companionMessages, projects } from '~/server/database/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireProTier } from '~/server/utils/auth'
import { generateRAGResponse, generateFollowUpQuestions } from '~/server/services/companion'
import { z } from 'zod'

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().uuid().optional(),
  mode: z
    .enum(['general', 'fact-check', 'brainstorm', 'synthesize', 'gap-analysis'])
    .default('general'),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireProTier(user)

  const projectId = getRouterParam(event, 'projectId')
  const body = await readBody(event)

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const parsed = chatSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request data',
      data: parsed.error.flatten(),
    })
  }

  const { message, conversationId, mode } = parsed.data

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  let conversation: typeof companionConversations.$inferSelect

  if (conversationId) {
    const existing = await db.query.companionConversations.findFirst({
      where: and(
        eq(companionConversations.id, conversationId),
        eq(companionConversations.projectId, projectId),
      ),
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'Conversation not found',
      })
    }

    conversation = existing
  } else {
    const [newConversation] = await db
      .insert(companionConversations)
      .values({
        projectId,
        userId: user.id,
        title: message.slice(0, 100),
      })
      .returning()

    conversation = newConversation
  }

  await db.insert(companionMessages).values({
    conversationId: conversation.id,
    role: 'user',
    content: message,
    metadata: { mode },
  })

  const previousMessages = await db.query.companionMessages.findMany({
    where: eq(companionMessages.conversationId, conversation.id),
    orderBy: [desc(companionMessages.createdAt)],
    limit: 20,
  })

  const conversationHistory = previousMessages
    .reverse()
    .slice(0, -1)
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

  const response = await generateRAGResponse(message, projectId, conversationHistory, mode)

  const followUpQuestions = await generateFollowUpQuestions(message, response.answer, projectId)

  const [assistantMessage] = await db
    .insert(companionMessages)
    .values({
      conversationId: conversation.id,
      role: 'assistant',
      content: response.answer,
      metadata: {
        citations: response.citations,
        confidence: response.confidence,
        followUpQuestions,
        mode,
      },
    })
    .returning()

  if (!conversationId) {
    await db
      .update(companionConversations)
      .set({ title: message.slice(0, 100) })
      .where(eq(companionConversations.id, conversation.id))
  }

  return {
    conversationId: conversation.id,
    message: {
      id: assistantMessage.id,
      role: 'assistant',
      content: response.answer,
      citations: response.citations,
      confidence: response.confidence,
      followUpQuestions,
      createdAt: assistantMessage.createdAt,
    },
  }
})
