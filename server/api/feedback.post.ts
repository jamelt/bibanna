import { db } from '~/server/database/client'
import { feedback } from '~/server/database/schema'
import { optionalAuth } from '~/server/utils/auth'
import { z } from 'zod'

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature_request', 'general', 'complaint']).default('general'),
  subject: z.string().min(1, 'Subject is required').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
  email: z.string().email().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await optionalAuth(event)
  const body = await readBody(event)
  const parsed = feedbackSchema.parse(body)

  const [created] = await db
    .insert(feedback)
    .values({
      userId: user?.id,
      userEmail: user?.email || parsed.email,
      type: parsed.type,
      subject: parsed.subject,
      content: parsed.content,
    })
    .returning()

  return { id: created?.id, message: 'Thank you for your feedback!' }
})
