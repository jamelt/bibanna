import { db } from '~/server/database/client'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_TIER } from '~/shared/subscriptions'
import { isAutoAdminEmail, autoPromoteIfAdmin } from '~/server/utils/admin-emails'

export default defineOAuthAuth0EventHandler({
  config: {
    emailRequired: true,
    connection: 'google-oauth2',
    scope: ['openid', 'email', 'profile'],
  },
  async onSuccess(event, { user }) {
    const email = user.email?.toLowerCase()
    if (!email) {
      return sendRedirect(event, '/login?error=no_email')
    }

    let existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!existingUser) {
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: user.name || user.nickname || null,
          avatarUrl: user.picture || null,
          auth0Id: user.sub,
          subscriptionTier: DEFAULT_TIER,
          role: isAutoAdminEmail(email) ? 'admin' : 'user',
        })
        .returning()

      existingUser = newUser
    } else {
      await autoPromoteIfAdmin(email)
    }

    if (!existingUser) {
      return sendRedirect(event, '/login?error=account_creation_failed')
    }

    await setUserSession(event, {
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
      },
    })

    return sendRedirect(event, '/app')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  },
})
