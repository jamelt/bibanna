import { test, expect } from '@playwright/test'

test.describe('Library Entry Detail Page', () => {
  let entryId: string
  let projectId: string

  test.beforeEach(async ({ page }) => {
    const testUser = {
      email: `entry-detail-test-${Date.now()}@example.com`,
      password: 'testpassword123',
    }

    await page.goto('/signup')
    await page.getByPlaceholder('Your name').fill('Entry Detail Test User')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page).toHaveURL('/app', { timeout: 10000 })

    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()

    await page.getByLabel('Title').fill('Test Entry for Detail Page')

    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('journal_article')

    await page.getByLabel('First Name').fill('John')
    await page.getByLabel('Last Name').fill('Doe')
    await page.getByRole('button', { name: 'Add Author' }).click()

    await page.getByLabel('First Name').fill('Jane')
    await page.getByLabel('Last Name').fill('Smith')
    await page.getByRole('button', { name: 'Add Author' }).click()

    await page.getByLabel('Year').fill('2023')

    const journalInput = page.getByLabel('Journal')
    if (await journalInput.isVisible()) {
      await journalInput.fill('Test Journal')
    }

    const doiInput = page.getByLabel('DOI')
    if (await doiInput.isVisible()) {
      await doiInput.fill('10.1234/test.2023')
    }

    const abstractInput = page.getByLabel('Abstract')
    if (await abstractInput.isVisible()) {
      await abstractInput.fill('This is a test abstract for the entry detail page tests.')
    }

    await page.getByRole('button', { name: /Create Entry/i }).click()

    await expect(page.getByText('Test Entry for Detail Page')).toBeVisible({ timeout: 10000 })

    const entryLink = page.getByText('Test Entry for Detail Page').first()
    await entryLink.click()

    await page.waitForURL(/\/app\/library\/.+/)
    const url = page.url()
    const match = url.match(/\/app\/library\/([^/]+)/)
    if (match) {
      entryId = match[1]
    }

    await page.goto('/app/projects')
    await page.getByRole('button', { name: /New Project/i }).click()
    await page.getByLabel('Name').fill('Test Project for Entry Detail')
    await page.getByLabel('Description').fill('A project for testing entry details')
    await page.getByRole('button', { name: /Create/i }).click()

    await expect(page.getByText('Test Project for Entry Detail')).toBeVisible({ timeout: 5000 })

    const projectLink = page.getByText('Test Project for Entry Detail').first()
    await projectLink.click()

    await page.waitForURL(/\/app\/projects\/.+/)
    const projectUrl = page.url()
    const projectMatch = projectUrl.match(/\/app\/projects\/([^/]+)/)
    if (projectMatch) {
      projectId = projectMatch[1]
    }
  })

  test('should display entry details correctly', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await expect(page.getByRole('heading', { name: 'Test Entry for Detail Page' })).toBeVisible()

    await expect(page.getByText('Doe, John; Smith, Jane')).toBeVisible()
    await expect(page.getByText('2023')).toBeVisible()

    await expect(page.getByText('Journal Article')).toBeVisible()

    const detailsSection = page.locator('text=Details').locator('..')
    await expect(detailsSection.getByText('Test Journal')).toBeVisible()
    await expect(detailsSection.getByText('10.1234/test.2023')).toBeVisible()

    await expect(
      page.getByText('This is a test abstract for the entry detail page tests.'),
    ).toBeVisible()
  })

  test('should open edit modal when Edit button is clicked', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await page.getByRole('button', { name: /edit/i }).click()

    await expect(page.getByRole('heading', { name: /edit entry/i })).toBeVisible()

    const titleInput = page.getByLabel(/title/i)
    await expect(titleInput).toHaveValue('Test Entry for Detail Page')
  })

  test('should copy citation when dropdown menu item is clicked', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await page.getByRole('button', { name: '', exact: true }).click()

    await page.getByRole('menuitem', { name: /copy citation/i }).click()

    await expect(page.getByText(/citation copied/i)).toBeVisible()
  })

  test('should open delete confirmation modal when delete is clicked', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await page.getByRole('button', { name: '', exact: true }).click()

    await page.getByRole('menuitem', { name: /delete/i }).click()

    await expect(page.getByRole('heading', { name: /delete entry/i })).toBeVisible()

    await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
    await expect(page.getByText('Test Entry for Detail Page')).toBeVisible()
  })

  test('should cancel delete when cancel button is clicked', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await page.getByRole('button', { name: '', exact: true }).click()
    await page.getByRole('menuitem', { name: /delete/i }).click()

    await page.getByRole('button', { name: /cancel/i }).click()

    await expect(page.getByRole('heading', { name: /delete entry/i })).not.toBeVisible()

    await expect(page.getByRole('heading', { name: 'Test Entry for Detail Page' })).toBeVisible()
  })

  test('should delete entry when confirmed', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await page.getByRole('button', { name: '', exact: true }).click()
    await page.getByRole('menuitem', { name: /delete/i }).click()

    await page.getByRole('button', { name: /delete/i, exact: true }).click()

    await page.waitForURL('/app/library')

    expect(page.url()).toContain('/app/library')
    expect(page.url()).not.toContain(entryId)

    entryId = ''
  })

  test('should toggle favorite status', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    const favoriteButton = page
      .getByRole('button')
      .filter({ has: page.locator('[class*="i-heroicons-star"]') })

    await favoriteButton.click()
    await page.waitForTimeout(500)

    await expect(favoriteButton.locator('[class*="i-heroicons-star-solid"]')).toBeVisible()

    await favoriteButton.click()
    await page.waitForTimeout(500)

    await expect(favoriteButton.locator('[class*="i-heroicons-star-solid"]')).not.toBeVisible()
  })

  test('should add annotation', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await page.getByRole('button', { name: /add annotation/i }).click()

    await expect(page.getByRole('heading', { name: /add annotation/i })).toBeVisible()

    const contentInput = page.locator('textarea').first()
    await contentInput.fill('This is a test annotation for the entry.')

    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText('This is a test annotation for the entry.')).toBeVisible({
      timeout: 5000,
    })

    await expect(page.getByText(/annotations \(1\)/i)).toBeVisible()
  })

  test('should display DOI link correctly', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    const doiLink = page.getByRole('link', { name: '10.1234/test.2023' })
    await expect(doiLink).toBeVisible()
    await expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/test.2023')
    await expect(doiLink).toHaveAttribute('target', '_blank')
  })

  test('should navigate back to library when breadcrumb is clicked', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await page
      .getByRole('link', { name: /library/i })
      .first()
      .click()

    await page.waitForURL('/app/library')
    expect(page.url()).toContain('/app/library')
    expect(page.url()).not.toContain(entryId)
  })

  test('should display project associations when entry is added to project', async ({ page }) => {
    await page.goto(`/app/projects/${projectId}`)

    await page.getByRole('button', { name: /Add Entry/i }).click()

    await page.waitForTimeout(500)

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test Entry for Detail Page')
      await page.waitForTimeout(500)
      await page.getByText('Test Entry for Detail Page').click()
    }

    await page.goto(`/app/library/${entryId}`)
    await page.waitForLoadState('networkidle')

    const projectsSection = page.locator('text=Projects').locator('..')
    await expect(projectsSection.getByText('Test Project for Entry Detail')).toBeVisible()
  })

  test('should handle entry not found', async ({ page }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    await page.goto(`/app/library/${fakeId}`)

    await expect(page.getByText(/entry not found/i)).toBeVisible()

    await page.getByRole('link', { name: /back to library/i }).click()
    await page.waitForURL('/app/library')
  })

  test('should display empty state for annotations', async ({ page }) => {
    await page.goto(`/app/library/${entryId}`)

    await expect(page.getByText(/no annotations yet/i)).toBeVisible()
    await expect(page.getByText(/add one to record your thoughts/i)).toBeVisible()
  })
})
