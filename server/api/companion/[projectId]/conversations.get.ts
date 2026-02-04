import { db } from '~/server/database/client'
import { companionConversations, companionMessages, projects } from '~/server/database/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { requireProTier } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireProTier(user)

  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      message: 'Project ID is required',
    })
  }

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, user.id),
    ),
  })

  if (!project) {
    throw createError({
      statusCode: 404,
      message: 'Project not found',
    })
  }

  const conversations = await db.query.companionConversations.findMany({
    where: eq(companionConversations.projectId, projectId),
    orderBy: [desc(companionConversations.updatedAt)],
  })

  const conversationsWithCounts = await Promise.all(
    conversations.map(async (conv) => {
      const [messageCount] = await db
        .select({ count: count() })
        .from(companionMessages)
        .where(eq(companionMessages.conversationId, conv.id))

      return {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: messageCount.count,
      }
    }),
  )

  return conversationsWithCounts
})
