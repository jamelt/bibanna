import { db } from '~/server/database/client'
import { projectShares, projects, users } from '~/server/database/schema'
import { eq, and, or, isNotNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { SharePermission } from '~/shared/types'

export interface ShareInfo {
  id: string
  projectId: string
  userId?: string
  userEmail?: string
  userName?: string
  permission: SharePermission
  publicToken?: string
  isPublic: boolean
  createdAt: Date
}

export async function shareProjectWithUser(
  projectId: string,
  ownerUserId: string,
  targetEmail: string,
  permission: SharePermission,
): Promise<ShareInfo> {
  const project = await db.query.projects.findFirst({
    where: and(
      or(
        eq(projects.id, projectId),
        eq(projects.slug, projectId),
      ),
      eq(projects.userId, ownerUserId),
    ),
  })

  if (!project) {
    throw new Error('Project not found or you do not have permission')
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, targetEmail.toLowerCase()),
  })

  const existingShare = await db.query.projectShares.findFirst({
    where: and(
      eq(projectShares.projectId, project.id),
      targetUser
        ? eq(projectShares.sharedWithUserId, targetUser.id)
        : eq(projectShares.sharedWithEmail, targetEmail.toLowerCase()),
    ),
  })

  if (existingShare) {
    const [updated] = await db
      .update(projectShares)
      .set({
        permission,
      })
      .where(eq(projectShares.id, existingShare.id))
      .returning()

    if (!updated) throw new Error('Failed to update share')

    return {
      id: updated.id,
      projectId: updated.projectId,
      userId: updated.sharedWithUserId || undefined,
      userEmail: targetEmail,
      userName: targetUser?.name || undefined,
      permission: updated.permission as SharePermission,
      isPublic: false,
      createdAt: updated.createdAt,
    }
  }

  const [share] = await db
    .insert(projectShares)
    .values({
      projectId: project.id,
      sharedWithUserId: targetUser?.id || null,
      sharedWithEmail: targetUser ? null : targetEmail.toLowerCase(),
      permission,
      isPublicLink: false,
    })
    .returning()

  if (!share) throw new Error('Failed to create share')

  return {
    id: share.id,
    projectId: share.projectId,
    userId: share.sharedWithUserId || undefined,
    userEmail: targetEmail,
    userName: targetUser?.name || undefined,
    permission: share.permission as SharePermission,
    isPublic: false,
    createdAt: share.createdAt,
  }
}

export async function createPublicLink(
  projectId: string,
  ownerUserId: string,
  permission: 'view' | 'comment' = 'view',
): Promise<{ token: string; url: string }> {
  const project = await db.query.projects.findFirst({
    where: and(
      or(
        eq(projects.id, projectId),
        eq(projects.slug, projectId),
      ),
      eq(projects.userId, ownerUserId),
    ),
  })

  if (!project) {
    throw new Error('Project not found or you do not have permission')
  }

  const existingPublicShare = await db.query.projectShares.findFirst({
    where: and(
      eq(projectShares.projectId, project.id),
      eq(projectShares.isPublicLink, true),
    ),
  })

  const token = nanoid(24)

  if (existingPublicShare) {
    const [updated] = await db
      .update(projectShares)
      .set({
        publicLinkToken: token,
        permission,
      })
      .where(eq(projectShares.id, existingPublicShare.id))
      .returning()

    if (!updated) throw new Error('Failed to update public link')

    return {
      token: updated.publicLinkToken!,
      url: `/shared/${updated.publicLinkToken}`,
    }
  }

  const [share] = await db
    .insert(projectShares)
    .values({
      projectId: project.id,
      isPublicLink: true,
      publicLinkToken: token,
      permission,
    })
    .returning()

  if (!share) throw new Error('Failed to create public link')

  return {
    token: share.publicLinkToken!,
    url: `/shared/${share.publicLinkToken}`,
  }
}

export async function revokePublicLink(projectId: string, ownerUserId: string): Promise<void> {
  const project = await db.query.projects.findFirst({
    where: and(
      or(
        eq(projects.id, projectId),
        eq(projects.slug, projectId),
      ),
      eq(projects.userId, ownerUserId),
    ),
  })

  if (!project) {
    throw new Error('Project not found or you do not have permission')
  }

  await db
    .delete(projectShares)
    .where(
      and(
        eq(projectShares.projectId, project.id),
        eq(projectShares.isPublicLink, true),
      ),
    )
}

export async function removeShare(shareId: string, ownerUserId: string): Promise<void> {
  const share = await db.query.projectShares.findFirst({
    where: eq(projectShares.id, shareId),
  })

  if (!share) {
    throw new Error('Share not found')
  }

  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, share.projectId),
      eq(projects.userId, ownerUserId),
    ),
  })

  if (!project) {
    throw new Error('You do not have permission to remove this share')
  }

  await db.delete(projectShares).where(eq(projectShares.id, shareId))
}

export async function getProjectShares(projectId: string, ownerUserId: string): Promise<ShareInfo[]> {
  const project = await db.query.projects.findFirst({
    where: and(
      or(
        eq(projects.id, projectId),
        eq(projects.slug, projectId),
      ),
      eq(projects.userId, ownerUserId),
    ),
  })

  if (!project) {
    throw new Error('Project not found or you do not have permission')
  }

  const shares = await db.query.projectShares.findMany({
    where: eq(projectShares.projectId, project.id),
  })

  const userIds = shares.filter(s => s.sharedWithUserId).map(s => s.sharedWithUserId!)
  const sharedUsers = userIds.length > 0
    ? await db.query.users.findMany({
        where: or(...userIds.map(id => eq(users.id, id))),
      })
    : []

  const userMap = new Map(sharedUsers.map(u => [u.id, u]))

  return shares.map((share) => {
    const user = share.sharedWithUserId ? userMap.get(share.sharedWithUserId) : undefined

    return {
      id: share.id,
      projectId: share.projectId,
      userId: share.sharedWithUserId || undefined,
      userEmail: user?.email || share.sharedWithEmail || undefined,
      userName: user?.name || undefined,
      permission: share.permission as SharePermission,
      publicToken: share.publicLinkToken || undefined,
      isPublic: share.isPublicLink ?? false,
      createdAt: share.createdAt,
    }
  })
}

export async function getSharedProjectByToken(token: string): Promise<{
  project: typeof projects.$inferSelect
  permission: SharePermission
} | null> {
  const share = await db.query.projectShares.findFirst({
    where: and(
      eq(projectShares.publicLinkToken, token),
      eq(projectShares.isPublicLink, true),
    ),
  })

  if (!share) return null

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, share.projectId),
  })

  if (!project) return null

  return {
    project,
    permission: share.permission as SharePermission,
  }
}

export async function getUserSharedProjects(userId: string): Promise<Array<{
  project: typeof projects.$inferSelect
  permission: SharePermission
  sharedBy: string
}>> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) return []

  const shares = await db.query.projectShares.findMany({
    where: or(
      eq(projectShares.sharedWithUserId, userId),
      eq(projectShares.sharedWithEmail, user.email.toLowerCase()),
    ),
  })

  const results = []

  for (const share of shares) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, share.projectId),
    })

    if (!project) continue

    const owner = await db.query.users.findFirst({
      where: eq(users.id, project.userId),
    })

    results.push({
      project,
      permission: share.permission as SharePermission,
      sharedBy: owner?.name || owner?.email || 'Unknown',
    })
  }

  return results
}

export async function checkProjectAccess(
  projectId: string,
  userId: string,
): Promise<{ hasAccess: boolean; permission: SharePermission | 'owner' | null }> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })

  if (!project) {
    return { hasAccess: false, permission: null }
  }

  if (project.userId === userId) {
    return { hasAccess: true, permission: 'owner' }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    return { hasAccess: false, permission: null }
  }

  const share = await db.query.projectShares.findFirst({
    where: and(
      eq(projectShares.projectId, projectId),
      or(
        eq(projectShares.sharedWithUserId, userId),
        eq(projectShares.sharedWithEmail, user.email.toLowerCase()),
      ),
    ),
  })

  if (!share) {
    return { hasAccess: false, permission: null }
  }

  return { hasAccess: true, permission: share.permission as SharePermission }
}
