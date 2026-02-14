import { db } from '../database/client'
import { users } from '../database/schema'
import { eq } from 'drizzle-orm'

let cachedAdminEmails: Set<string> | null = null

function getAdminEmails(): Set<string> {
  if (cachedAdminEmails) return cachedAdminEmails

  const raw = process.env.NUXT_ADMIN_EMAILS || ''
  cachedAdminEmails = new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
  return cachedAdminEmails
}

export function isAutoAdminEmail(email: string): boolean {
  return getAdminEmails().has(email.toLowerCase())
}

export async function autoPromoteIfAdmin(email: string): Promise<void> {
  if (!isAutoAdminEmail(email)) return

  await db
    .update(users)
    .set({ role: 'admin', updatedAt: new Date() })
    .where(eq(users.email, email.toLowerCase()))
}
