import { db } from '~/server/database/client'
import { users, entries, projects, tags, annotations, feedback } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin, logAdminAction } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const [userEntries, userProjects, userTags, userAnnotations, userFeedback] = await Promise.all([
    db.query.entries.findMany({ where: eq(entries.userId, userId) }),
    db.query.projects.findMany({ where: eq(projects.userId, userId) }),
    db.query.tags.findMany({ where: eq(tags.userId, userId) }),
    db.query.annotations.findMany({ where: eq(annotations.userId, userId) }),
    db.query.feedback.findMany({ where: eq(feedback.userId, userId) }),
  ])

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  await logAdminAction(
    admin.id,
    'user.export_data',
    'user',
    userId,
    {
      targetEmail: targetUser.email,
      entriesCount: userEntries.length,
      projectsCount: userProjects.length,
    },
    ip,
  )

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      avatarUrl: targetUser.avatarUrl,
      subscriptionTier: targetUser.subscriptionTier,
      role: targetUser.role,
      preferences: targetUser.preferences,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
    },
    entries: userEntries.map((e) => ({
      id: e.id,
      entryType: e.entryType,
      title: e.title,
      authors: e.authors,
      year: e.year,
      metadata: e.metadata,
      customFields: e.customFields,
      notes: e.notes,
      isFavorite: e.isFavorite,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    projects: userProjects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      isArchived: p.isArchived,
      settings: p.settings,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    tags: userTags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      description: t.description,
      createdAt: t.createdAt,
    })),
    annotations: userAnnotations.map((a) => ({
      id: a.id,
      entryId: a.entryId,
      content: a.content,
      annotationType: a.annotationType,
      highlights: a.highlights,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    feedback: userFeedback.map((f) => ({
      id: f.id,
      type: f.type,
      subject: f.subject,
      content: f.content,
      status: f.status,
      createdAt: f.createdAt,
    })),
  }
})
