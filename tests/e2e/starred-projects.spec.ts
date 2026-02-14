import { test, expect } from '@playwright/test'

test.describe('Starred Projects', () => {
  let projectSlug: string

  test.beforeEach(async ({ page }) => {
    const testUser = {
      email: `star-test-${Date.now()}@example.com`,
      password: 'testpassword123',
    }

    await page.goto('/signup')
    await page.getByPlaceholder('Your name').fill('Star Test User')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page).toHaveURL('/app', { timeout: 10000 })

    await page.goto('/app/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await page.getByLabel('Name').fill('Star Test Project')
    await page.getByLabel('Description').fill('Testing starred projects')
    await page.getByRole('button', { name: /Create/i }).click()

    await expect(page.getByText('Star Test Project')).toBeVisible({ timeout: 5000 })

    const projectLink = page.getByText('Star Test Project').first()
    await projectLink.click()

    await page.waitForURL(/\/app\/projects\/.+/)
    const projectUrl = page.url()
    const projectMatch = projectUrl.match(/\/app\/projects\/([^/]+)/)
    if (projectMatch) {
      projectSlug = projectMatch[1]
    }
  })

  test.describe('Desktop', () => {
    test('star button is visible on project detail page', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      await expect(page.getByRole('heading', { name: 'Star Test Project' })).toBeVisible()

      const starButton = page.locator('button[title="Star project"]')
      await expect(starButton).toBeVisible()
    })

    test('clicking star button toggles starred state', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      await expect(page.getByRole('heading', { name: 'Star Test Project' })).toBeVisible()

      const starButton = page.locator('button[title="Star project"]')
      await expect(starButton).toBeVisible()
      await starButton.click()

      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      const unstarButton = page.locator('button[title="Unstar project"]')
      await expect(unstarButton).toBeVisible()
    })

    test('unstarring a project works', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)

      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      const unstarButton = page.locator('button[title="Unstar project"]')
      await unstarButton.click()
      await expect(page.getByText(/project unstarred/i)).toBeVisible({ timeout: 5000 })

      await expect(page.locator('button[title="Star project"]')).toBeVisible()
    })

    test('starred project appears in desktop sidebar', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)

      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const sidebar = page.locator('aside')
      await expect(sidebar.getByText('Star Test Project')).toBeVisible({ timeout: 5000 })
    })

    test('starred project in sidebar links to project page', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)

      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const sidebar = page.locator('aside')
      await sidebar.getByText('Star Test Project').click()

      await page.waitForURL(/\/app\/projects\/.+/)
      await expect(page.getByRole('heading', { name: 'Star Test Project' })).toBeVisible()
    })

    test('unstarred project disappears from sidebar', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)

      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')
      const sidebar = page.locator('aside')
      await expect(sidebar.getByText('Star Test Project')).toBeVisible({ timeout: 5000 })

      await page.goto(`/app/projects/${projectSlug}`)
      const unstarButton = page.locator('button[title="Unstar project"]')
      await unstarButton.click()
      await expect(page.getByText(/project unstarred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')
      await expect(sidebar.getByText('Star Test Project')).not.toBeVisible({ timeout: 3000 })
    })

    test('star option appears in project card dropdown menu', async ({ page }) => {
      await page.goto('/app/projects')
      await expect(page.getByText('Star Test Project')).toBeVisible({ timeout: 5000 })

      const projectCard = page.locator('.group', { hasText: 'Star Test Project' }).first()
      const menuButton = projectCard
        .locator('button')
        .filter({
          has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]'),
        })
        .first()

      await menuButton.click({ force: true })

      await expect(page.getByRole('menuitem', { name: /^star$/i })).toBeVisible({ timeout: 5000 })
    })

    test('starring from project card dropdown shows star indicator', async ({ page }) => {
      await page.goto('/app/projects')
      await expect(page.getByText('Star Test Project')).toBeVisible({ timeout: 5000 })

      const projectCard = page.locator('.group', { hasText: 'Star Test Project' }).first()
      const menuButton = projectCard
        .locator('button')
        .filter({
          has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]'),
        })
        .first()

      await menuButton.click({ force: true })
      await page.getByRole('menuitem', { name: /^star$/i }).click()

      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await expect(projectCard.locator('svg[class*="i-heroicons-star-solid"]')).toBeVisible({
        timeout: 3000,
      })
    })

    test('starred project shows amber star icon on card', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app/projects')
      await page.waitForLoadState('networkidle')

      const projectCard = page.locator('.group', { hasText: 'Star Test Project' }).first()
      const starIcon = projectCard.locator('svg[class*="i-heroicons-star-solid"]')
      await expect(starIcon).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('star button works on mobile project detail page', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      await expect(page.getByRole('heading', { name: 'Star Test Project' })).toBeVisible()

      const starButton = page.locator('button[title="Star project"]')
      await expect(starButton).toBeVisible()
      await starButton.click()

      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })
    })

    test('starred project appears in mobile slide-out sidebar', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const hamburger = page
        .locator('button')
        .filter({
          has: page.locator('svg[class*="i-heroicons-bars-3"]'),
        })
        .first()
      await hamburger.click()

      await page.waitForTimeout(500)

      const slideover = page.locator('[role="dialog"], .flex.h-full.flex-col')
      await expect(slideover.getByText('Star Test Project')).toBeVisible({ timeout: 5000 })
    })

    test('clicking starred project in mobile sidebar navigates to project', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const hamburger = page
        .locator('button')
        .filter({
          has: page.locator('svg[class*="i-heroicons-bars-3"]'),
        })
        .first()
      await hamburger.click()
      await page.waitForTimeout(500)

      const slideover = page.locator('[role="dialog"], .flex.h-full.flex-col')
      await slideover.getByText('Star Test Project').click()

      await page.waitForURL(/\/app\/projects\/.+/)
      await expect(page.getByRole('heading', { name: 'Star Test Project' })).toBeVisible()
    })

    test('projects bottom nav tap shows popover when starred projects exist', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const bottomNav = page.locator('nav.fixed.bottom-0')
      const projectsButton = bottomNav.locator('button', { hasText: 'Projects' })
      await projectsButton.click()

      await expect(page.getByText('Starred').first()).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('Star Test Project').last()).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('All Projects')).toBeVisible({ timeout: 3000 })
    })

    test('tapping starred project in popover navigates to project', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const bottomNav = page.locator('nav.fixed.bottom-0')
      const projectsButton = bottomNav.locator('button', { hasText: 'Projects' })
      await projectsButton.click()

      await page.waitForTimeout(300)

      const popover = page.locator('.absolute.bottom-full')
      await popover.getByText('Star Test Project').click()

      await page.waitForURL(/\/app\/projects\/.+/)
      await expect(page.getByRole('heading', { name: 'Star Test Project' })).toBeVisible()
    })

    test('All Projects link in popover navigates to projects page', async ({ page }) => {
      await page.goto(`/app/projects/${projectSlug}`)
      const starButton = page.locator('button[title="Star project"]')
      await starButton.click()
      await expect(page.getByText(/project starred/i)).toBeVisible({ timeout: 5000 })

      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const bottomNav = page.locator('nav.fixed.bottom-0')
      const projectsButton = bottomNav.locator('button', { hasText: 'Projects' })
      await projectsButton.click()

      await page.waitForTimeout(300)
      await page.getByText('All Projects').click()

      await expect(page).toHaveURL('/app/projects', { timeout: 5000 })
    })

    test('projects bottom nav navigates directly when no starred projects', async ({ page }) => {
      await page.goto('/app')
      await page.waitForLoadState('networkidle')

      const bottomNav = page.locator('nav.fixed.bottom-0')
      const projectsButton = bottomNav.locator('button', { hasText: 'Projects' })

      if (await projectsButton.isVisible()) {
        await projectsButton.click()
        await expect(page).toHaveURL('/app/projects', { timeout: 5000 })
      } else {
        const projectsLink = bottomNav.getByText('Projects')
        await projectsLink.click()
        await expect(page).toHaveURL('/app/projects', { timeout: 5000 })
      }
    })
  })
})
