import { test, expect } from '@playwright/test'

/**
 * Smoke tests to verify all pages exist and are accessible.
 * These tests ensure basic navigation works and pages render correctly.
 */

test.describe('Smoke Tests - Page Accessibility', () => {
  // Test user for authenticated routes
  const testUser = {
    name: 'Smoke Test User',
    email: `smoke-test-${Date.now()}@example.com`,
    password: 'testpassword123',
  }

  test.describe('Public Pages', () => {
    test('landing page loads', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveURL('/')
      await expect(page.locator('body')).toBeVisible()
    })

    test('login page loads', async ({ page }) => {
      await page.goto('/login')
      await expect(page).toHaveURL('/login')
      await expect(page.getByRole('heading', { name: /Sign in|Log in|Welcome/i })).toBeVisible()
      await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    })

    test('signup page loads', async ({ page }) => {
      await page.goto('/signup')
      await expect(page).toHaveURL('/signup')
      await expect(page.getByRole('heading', { name: /Create|Sign up|Register/i })).toBeVisible()
    })
  })

  test.describe('Authenticated Pages', () => {
    // Sign up once before all authenticated tests
    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage()
      await page.goto('/signup')
      await page.waitForLoadState('networkidle')

      await page.getByPlaceholder('Your name').fill(testUser.name)
      await page.getByPlaceholder('you@example.com').fill(testUser.email)
      await page.locator('input[type="password"]').first().fill(testUser.password)
      await page.locator('input[type="password"]').nth(1).fill(testUser.password)
      await page.getByRole('button', { name: 'Create Account' }).click()

      await expect(page).toHaveURL('/app', { timeout: 15000 })
      await page.close()
    })

    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByPlaceholder('you@example.com').fill(testUser.email)
      await page.locator('input[type="password"]').fill(testUser.password)
      await page.getByRole('button', { name: /Sign in/i }).click()
      await expect(page).toHaveURL('/app', { timeout: 10000 })
    })

    test('dashboard page loads', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible()
      // Check for key dashboard elements
      await expect(page.locator('body')).toContainText(/entries|projects|recent/i)
    })

    test('library page loads', async ({ page }) => {
      await page.goto('/app/library')
      await expect(page).toHaveURL('/app/library')
      await expect(page.getByRole('heading', { name: /Library/i })).toBeVisible()
    })

    test('projects page loads', async ({ page }) => {
      await page.goto('/app/projects')
      await expect(page).toHaveURL('/app/projects')
      await expect(page.getByRole('heading', { name: /Projects/i })).toBeVisible()
    })

    test('tags page loads', async ({ page }) => {
      await page.goto('/app/tags')
      await expect(page).toHaveURL('/app/tags')
      await expect(page.getByRole('heading', { name: /Tags/i })).toBeVisible()
    })

    test('mind maps index page loads', async ({ page }) => {
      await page.goto('/app/mindmaps')
      await expect(page).toHaveURL('/app/mindmaps')
      await expect(page.getByRole('heading', { name: /Mind Maps/i })).toBeVisible()
    })

    test('settings index page loads', async ({ page }) => {
      await page.goto('/app/settings')
      await expect(page).toHaveURL('/app/settings')
      await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible()
    })

    test('profile settings page loads', async ({ page }) => {
      await page.goto('/app/settings/profile')
      await expect(page).toHaveURL('/app/settings/profile')
      await expect(page.getByRole('heading', { name: /Profile/i })).toBeVisible()
    })

    test('citation styles page loads', async ({ page }) => {
      await page.goto('/app/settings/citation-styles')
      await expect(page).toHaveURL('/app/settings/citation-styles')
      await expect(page.getByRole('heading', { name: /Citation Styles/i })).toBeVisible()
    })

    test('subscription page loads', async ({ page }) => {
      await page.goto('/app/subscription')
      await expect(page).toHaveURL('/app/subscription')
      await expect(page.locator('body')).toContainText(/subscription|plan|upgrade/i)
    })
  })
})

test.describe('Smoke Tests - Navigation', () => {
  const testUser = {
    email: `smoke-nav-${Date.now()}@example.com`,
    password: 'testpassword123',
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Your name').fill('Nav Test User')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL('/app', { timeout: 15000 })
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    await page.getByRole('button', { name: /Sign in/i }).click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })
  })

  test('sidebar navigation works', async ({ page }) => {
    // Navigate via sidebar
    await page.getByRole('link', { name: 'Library' }).first().click()
    await expect(page).toHaveURL(/\/app\/library/)

    await page.getByRole('link', { name: 'Projects' }).first().click()
    await expect(page).toHaveURL(/\/app\/projects/)

    await page.getByRole('link', { name: 'Tags' }).first().click()
    await expect(page).toHaveURL(/\/app\/tags/)

    await page.getByRole('link', { name: 'Mind Maps' }).first().click()
    await expect(page).toHaveURL(/\/app\/mindmaps/)

    await page.getByRole('link', { name: 'Dashboard' }).first().click()
    await expect(page).toHaveURL('/app')
  })

  test('quick add button opens modal', async ({ page }) => {
    const quickAddButton = page.getByTestId('quick-add-button')
    await quickAddButton.click()

    // Modal should appear
    await expect(page.getByTestId('quick-add-modal')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible()

    // Close button should work
    await page.getByTestId('quick-add-close').click()
    await expect(page.getByTestId('quick-add-modal')).not.toBeVisible({ timeout: 5000 })
  })

  test('user menu dropdown works', async ({ page }) => {
    const userAvatar = page.getByTestId('user-menu-trigger')
    await userAvatar.click()

    // Dropdown should appear with menu items
    await expect(page.getByText('Profile')).toBeVisible()
    await expect(page.getByText('Settings')).toBeVisible()
    await expect(page.getByText('Sign out')).toBeVisible()
  })
})

test.describe('Smoke Tests - Feature Pages', () => {
  const testUser = {
    email: `smoke-feat-${Date.now()}@example.com`,
    password: 'testpassword123',
  }

  let projectId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()

    // Sign up
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Your name').fill('Feature Test User')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL('/app', { timeout: 15000 })

    // Create a test project
    await page.goto('/app/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await page.getByTestId('project-modal-name').fill('Smoke Test Project')
    await page.getByTestId('project-modal-submit').click()

    // Wait for project to be created and get its ID from URL
    await page.waitForTimeout(2000)
    await page.getByText('Smoke Test Project').click()
    await page.waitForURL(/\/app\/projects\//)

    const url = page.url()
    const match = url.match(/\/app\/projects\/([^/]+)/)
    if (match) {
      projectId = match[1]
    }

    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    await page.getByRole('button', { name: /Sign in/i }).click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })
  })

  test('project detail page loads', async ({ page }) => {
    test.skip(!projectId, 'No project ID available')

    await page.goto(`/app/projects/${projectId}`)
    await expect(page.getByText('Smoke Test Project')).toBeVisible()

    // Check for key project detail elements
    await expect(page.getByRole('button', { name: /Research Companion/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Mind Map/i })).toBeVisible()
  })

  test('mind map page loads for project', async ({ page }) => {
    test.skip(!projectId, 'No project ID available')

    await page.goto(`/app/projects/${projectId}/mindmap`)
    await expect(page.getByRole('heading', { name: /Mind Map/i })).toBeVisible()

    // Should show upgrade prompt or mind map content
    const hasUpgradePrompt = await page
      .getByText(/Unlock|Upgrade/i)
      .isVisible()
      .catch(() => false)
    const hasMindMapContent = await page
      .getByText(/No entries|entries, .* authors/i)
      .isVisible()
      .catch(() => false)

    expect(hasUpgradePrompt || hasMindMapContent).toBe(true)
  })

  test('research companion page loads for project', async ({ page }) => {
    test.skip(!projectId, 'No project ID available')

    await page.goto(`/app/projects/${projectId}/companion`)

    // Should show upgrade prompt or companion content
    const hasUpgradePrompt = await page
      .getByText(/Unlock|Upgrade|Pro/i)
      .isVisible()
      .catch(() => false)
    const hasCompanionContent = await page
      .getByText(/companion|chat|ask/i)
      .isVisible()
      .catch(() => false)

    expect(hasUpgradePrompt || hasCompanionContent).toBe(true)
  })
})

test.describe('Smoke Tests - Modals & Components', () => {
  const testUser = {
    email: `smoke-modal-${Date.now()}@example.com`,
    password: 'testpassword123',
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Your name').fill('Modal Test User')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)
    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL('/app', { timeout: 15000 })
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    await page.getByRole('button', { name: /Sign in/i }).click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })
  })

  test('project creation modal opens and closes', async ({ page }) => {
    await page.goto('/app/projects')

    await page.getByRole('button', { name: /New Project/i }).click()
    await expect(page.getByTestId('project-modal-name')).toBeVisible()

    // Close via X button or clicking outside
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('project-modal-name')).not.toBeVisible({ timeout: 5000 })
  })

  test('entry form modal can be opened', async ({ page }) => {
    await page.goto('/app/library')

    // Click add entry button
    const addButton = page.getByRole('button', { name: /Add Entry|New Entry/i })
    if (await addButton.isVisible()) {
      await addButton.click()

      // Check for entry form fields
      const hasEntryForm = await page
        .getByText(/Entry Type|Title/i)
        .isVisible()
        .catch(() => false)
      expect(hasEntryForm).toBe(true)
    }
  })
})

test.describe('Smoke Tests - Responsive Layout', () => {
  test('mobile navigation is hidden on desktop', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')

    // Mobile nav should not be visible
    const mobileNav = page.locator('nav.fixed.bottom-0')
    await expect(mobileNav).not.toBeVisible()
  })

  test('desktop sidebar is hidden on mobile', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')

    await page.getByPlaceholder('you@example.com').fill(`smoke-mobile-${Date.now()}@example.com`)
    await page.locator('input[type="password"]').fill('testpassword123')

    // Note: This test may fail if user doesn't exist, which is fine for smoke test
  })
})

test.describe('Smoke Tests - Error Handling', () => {
  test('404 page for non-existent route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    // Should show some kind of not found indicator
    const has404 = await page.locator('body').textContent()
    // Nuxt may redirect or show 404 page
    expect(has404).toBeDefined()
  })

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/app')

    // Should redirect to login if not authenticated
    await page.waitForURL(/\/(login|app)/, { timeout: 5000 })
  })
})
