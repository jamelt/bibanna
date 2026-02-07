import { test, expect } from '@playwright/test'

test.describe('Dropdown Menus', () => {
  let entryId: string
  let projectId: string
  let tagId: string

  test.beforeEach(async ({ page }) => {
    const testUser = {
      email: `dropdown-test-${Date.now()}@example.com`,
      password: 'testpassword123',
    }

    await page.goto('/signup')
    await page.getByPlaceholder('Your name').fill('Dropdown Test User')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page).toHaveURL('/app', { timeout: 10000 })

    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')
    
    await page.getByRole('button', { name: /Add Entry/i }).first().click()
    
    await page.getByLabel('Title').fill('Test Entry for Dropdown Tests')
    
    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('journal_article')
    
    await page.getByLabel('First Name').fill('John')
    await page.getByLabel('Last Name').fill('Doe')
    await page.getByRole('button', { name: 'Add Author' }).click()
    
    await page.getByLabel('Year').fill('2024')
    
    await page.getByRole('button', { name: /Create Entry/i }).click()
    
    await expect(page.getByText('Test Entry for Dropdown Tests')).toBeVisible({ timeout: 10000 })
    
    const entryLink = page.getByText('Test Entry for Dropdown Tests').first()
    await entryLink.click()
    
    await page.waitForURL(/\/app\/library\/.+/)
    const url = page.url()
    const match = url.match(/\/app\/library\/([^\/]+)/)
    if (match) {
      entryId = match[1]
    }
    
    await page.goto('/app/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await page.getByLabel('Name').fill('Test Project for Dropdown Tests')
    await page.getByLabel('Description').fill('Testing dropdown menus')
    await page.getByRole('button', { name: /Create/i }).click()
    
    await expect(page.getByText('Test Project for Dropdown Tests')).toBeVisible({ timeout: 5000 })
    
    const projectLink = page.getByText('Test Project for Dropdown Tests').first()
    await projectLink.click()
    
    await page.waitForURL(/\/app\/projects\/.+/)
    const projectUrl = page.url()
    const projectMatch = projectUrl.match(/\/app\/projects\/([^\/]+)/)
    if (projectMatch) {
      projectId = projectMatch[1]
    }

    await page.goto('/app/tags')
    await page.getByRole('button', { name: /New Tag/i }).click()
    await page.getByLabel('Name').fill('Test Tag for Dropdown')
    await page.getByRole('button', { name: /Create/i }).click()
    
    await expect(page.getByText('Test Tag for Dropdown')).toBeVisible({ timeout: 5000 })
  })

  test('library entry detail page - dropdown menu opens and works', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)
    
    await page.waitForLoadState('networkidle')
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    
    await page.waitForTimeout(500)
    
    await expect(page.getByRole('menuitem', { name: /copy citation/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible()
  })

  test('library entry detail page - copy citation works', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    await page.getByRole('menuitem', { name: /copy citation/i }).click()
    
    await expect(page.getByText(/citation copied/i)).toBeVisible({ timeout: 5000 })
  })

  test('library entry detail page - delete option opens modal', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    await page.getByRole('menuitem', { name: /delete/i }).click()
    
    await expect(page.getByRole('heading', { name: /delete entry/i })).toBeVisible({ timeout: 5000 })
  })

  test('project detail page - dropdown menu opens and works', async ({ page }) => {
    await page.goto(`/app/projects/${projectId}`)
    
    await expect(page.getByRole('heading', { name: 'Test Project for Dropdown Tests' })).toBeVisible()
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    
    await expect(page.getByRole('menuitem', { name: /edit/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('menuitem', { name: /export/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /archive/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible()
  })

  test('project detail page - edit option opens modal', async ({ page }) => {
    await page.goto(`/app/projects/${projectId}`)
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    await page.getByRole('menuitem', { name: /edit/i }).click()
    
    await expect(page.getByRole('heading', { name: /edit project/i })).toBeVisible({ timeout: 5000 })
    
    const nameInput = page.getByLabel('Name')
    await expect(nameInput).toHaveValue('Test Project for Dropdown Tests')
  })

  test('project detail page - archive option works', async ({ page }) => {
    await page.goto(`/app/projects/${projectId}`)
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    await page.getByRole('menuitem', { name: /archive/i }).click()
    
    await expect(page.getByText(/project archived/i)).toBeVisible({ timeout: 5000 })
  })

  test('project detail page - delete option opens modal', async ({ page }) => {
    await page.goto(`/app/projects/${projectId}`)
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    await page.getByRole('menuitem', { name: /delete/i }).click()
    
    await expect(page.getByRole('heading', { name: /delete project/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
  })

  test('projects list page - dropdown menu opens and works', async ({ page }) => {
    await page.goto('/app/projects')
    
    await expect(page.getByText('Test Project for Dropdown Tests')).toBeVisible({ timeout: 5000 })
    
    const projectCard = page.locator('.group', { hasText: 'Test Project for Dropdown Tests' }).first()
    
    const menuButton = projectCard.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    
    await expect(page.getByRole('menuitem', { name: /edit/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('menuitem', { name: /share/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /export/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /archive/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible()
  })

  test('projects list page - edit option opens modal', async ({ page }) => {
    await page.goto('/app/projects')
    
    const projectCard = page.locator('.group', { hasText: 'Test Project for Dropdown Tests' }).first()
    const menuButton = projectCard.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    await page.getByRole('menuitem', { name: /edit/i }).click()
    
    await expect(page.getByRole('heading', { name: /edit project/i })).toBeVisible({ timeout: 5000 })
  })

  test('tags page - dropdown menu opens and works', async ({ page }) => {
    await page.goto('/app/tags')
    
    await expect(page.getByText('Test Tag for Dropdown')).toBeVisible({ timeout: 5000 })
    
    const tagCard = page.locator('[class*="group"]', { hasText: 'Test Tag for Dropdown' }).first()
    
    const menuButton = tagCard.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    
    await expect(page.getByRole('menuitem', { name: /edit/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('menuitem', { name: /view entries/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible()
  })

  test('tags page - edit option opens modal', async ({ page }) => {
    await page.goto('/app/tags')
    
    const tagCard = page.locator('[class*="group"]', { hasText: 'Test Tag for Dropdown' }).first()
    const menuButton = tagCard.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await menuButton.click()
    await page.getByRole('menuitem', { name: /edit/i }).click()
    
    await expect(page.getByRole('heading', { name: /edit tag/i })).toBeVisible({ timeout: 5000 })
  })

  test('mind map viewer - dropdown menu opens and works', async ({ page }) => {
    await page.goto(`/app/projects/${projectId}/mindmap`)
    
    await page.waitForLoadState('networkidle')
    
    const menuButton = page.locator('button').filter({ 
      has: page.locator('svg[class*="i-heroicons-ellipsis-vertical"]') 
    }).first()
    
    await expect(menuButton).toBeVisible({ timeout: 10000 })
    await menuButton.click()
    
    await expect(page.getByRole('menuitem', { name: /export svg/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('menuitem', { name: /copy svg/i })).toBeVisible()
  })

  test('library page - bulk actions dropdowns work', async ({ page }) => {
    await page.goto('/app/library')
    
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.check()
    
    await expect(page.getByText(/selected/i)).toBeVisible({ timeout: 5000 })
    
    const addTagButton = page.getByRole('button', { name: /add tag/i })
    await expect(addTagButton).toBeVisible()
    await addTagButton.click()
    
    await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 })
  })

  test('library page - add to project dropdown works', async ({ page }) => {
    await page.goto('/app/library')
    
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.check()
    
    const addToProjectButton = page.getByRole('button', { name: /add to project/i })
    await expect(addToProjectButton).toBeVisible()
    await addToProjectButton.click()
    
    await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Test Project for Dropdown Tests')).toBeVisible()
  })
})
