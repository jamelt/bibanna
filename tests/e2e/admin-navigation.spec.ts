import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'

const ADMIN_EMAIL = `e2e-admin-nav-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
const ADMIN_PASSWORD = 'testpassword123'
const ADMIN_NAME = 'E2E Admin Nav User'

test.describe('Admin Navigation', () => {
  test.beforeAll(async () => {
    execSync(
      `npx tsx scripts/promote-admin.ts "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}" "${ADMIN_NAME}"`,
      { cwd: process.cwd(), stdio: 'pipe' },
    )
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('you@example.com').fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)

    const [loginResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 10000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    if (!loginResponse.ok()) {
      const body = await loginResponse.text().catch(() => '')
      throw new Error(`Login failed: ${loginResponse.status()} - ${body}`)
    }

    await expect(page).toHaveURL('/app', { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')
  })

  test('admin sidebar navigation items are visible', async ({ page }) => {
    await page.goto('/app')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('aside')
    await expect(sidebar.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByText('Users')).toBeVisible()
    await expect(sidebar.getByText('Feedback')).toBeVisible()
    await expect(sidebar.getByText('Announcements')).toBeVisible()
    await expect(sidebar.getByText('Feature Flags')).toBeVisible()
    await expect(sidebar.getByText('Audit Log')).toBeVisible()
  })

  test('can navigate to admin dashboard and see content', async ({ page }) => {
    await page.goto('/app')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('aside')
    await sidebar.getByText('Admin Dashboard').click()

    await expect(page).toHaveURL('/app/admin', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('can navigate between all admin pages without getting stuck', async ({ page }) => {
    await page.goto('/app/admin')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({
      timeout: 10000,
    })

    const sidebar = page.locator('aside')

    // Admin Dashboard -> Users
    await sidebar.getByText('Users').click()
    await expect(page).toHaveURL('/app/admin/users', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible({
      timeout: 10000,
    })

    // Users -> Feedback
    await sidebar.getByText('Feedback').click()
    await expect(page).toHaveURL('/app/admin/feedback', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Feedback Inbox/i })).toBeVisible({
      timeout: 10000,
    })

    // Feedback -> Announcements
    await sidebar.getByText('Announcements').click()
    await expect(page).toHaveURL('/app/admin/announcements', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Announcements/i })).toBeVisible({
      timeout: 10000,
    })

    // Announcements -> Feature Flags
    await sidebar.getByText('Feature Flags').click()
    await expect(page).toHaveURL('/app/admin/feature-flags', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Feature Flags/i })).toBeVisible({
      timeout: 10000,
    })

    // Feature Flags -> Audit Log
    await sidebar.getByText('Audit Log').click()
    await expect(page).toHaveURL('/app/admin/audit-log', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible({ timeout: 10000 })

    // Audit Log -> back to Admin Dashboard
    await sidebar.getByText('Admin Dashboard').click()
    await expect(page).toHaveURL('/app/admin', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('can navigate from admin pages back to regular app pages', async ({ page }) => {
    // Start on admin users page (the page that was causing the freeze)
    await page.goto('/app/admin/users')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible({
      timeout: 10000,
    })

    const sidebar = page.locator('aside')

    // Users -> App Dashboard
    await sidebar.getByText('Dashboard').first().click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 })

    // App Dashboard -> Admin Users (back into admin)
    await sidebar.getByText('Users').click()
    await expect(page).toHaveURL('/app/admin/users', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible({
      timeout: 10000,
    })

    // Admin Users -> Library
    await sidebar.getByText('Library').click()
    await expect(page).toHaveURL('/app/library', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Library/i })).toBeVisible({ timeout: 10000 })

    // Library -> Admin Feedback
    await sidebar.getByText('Feedback').click()
    await expect(page).toHaveURL('/app/admin/feedback', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Feedback Inbox/i })).toBeVisible({
      timeout: 10000,
    })

    // Admin Feedback -> Projects
    await sidebar.getByText('Projects').click()
    await expect(page).toHaveURL('/app/projects', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible({
      timeout: 10000,
    })
  })

  test('admin pages are accessible via direct URL', async ({ page }) => {
    const adminPages = [
      { url: '/app/admin', heading: /Admin Dashboard/i },
      { url: '/app/admin/users', heading: /User Management/i },
      { url: '/app/admin/feedback', heading: /Feedback Inbox/i },
      { url: '/app/admin/announcements', heading: /Announcements/i },
      { url: '/app/admin/feature-flags', heading: /Feature Flags/i },
      { url: '/app/admin/audit-log', heading: /Audit Log/i },
    ]

    for (const { url, heading } of adminPages) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 10000 })
    }
  })
})
