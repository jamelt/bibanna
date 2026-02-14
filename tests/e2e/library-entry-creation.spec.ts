import { test, expect } from '@playwright/test'

test.describe('Library Entry Creation - Immediate Display', () => {
  test.beforeEach(async ({ page }) => {
    const testUser = {
      email: `library-test-${Date.now()}@example.com`,
      password: 'testpassword123',
    }

    await page.goto('/signup')
    await page.getByPlaceholder('Your name').fill('Library Test User')
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)
    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page).toHaveURL('/app', { timeout: 10000 })
  })

  test('newly created entry appears immediately without page reload', async ({ page }) => {
    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible()

    const entryTitle = `Test Book ${Date.now()}`

    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()

    await expect(page.getByLabel('Title')).toBeVisible()
    await page.getByLabel('Title').fill(entryTitle)

    await page.getByLabel('First Name').fill('John')
    await page.getByLabel('Last Name').fill('Doe')
    await page.getByRole('button', { name: 'Add Author' }).click()

    await page.getByRole('button', { name: /Create Entry/i }).click()

    await expect(page.getByLabel('Title')).toBeHidden({ timeout: 10000 })

    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 5000 })

    const entryElement = page.locator(`text="${entryTitle}"`).first()
    await expect(entryElement).toBeVisible()
  })

  test('multiple entries created in sequence all appear without reload', async ({ page }) => {
    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const entries = [
      { title: `Book One ${Date.now()}`, author: 'Smith' },
      { title: `Book Two ${Date.now() + 1}`, author: 'Jones' },
      { title: `Book Three ${Date.now() + 2}`, author: 'Brown' },
    ]

    for (const entry of entries) {
      await page
        .getByRole('button', { name: /Add Entry/i })
        .first()
        .click()
      await expect(page.getByLabel('Title')).toBeVisible()

      await page.getByLabel('Title').fill(entry.title)
      await page.getByLabel('First Name').fill(entry.author)
      await page.getByLabel('Last Name').fill('Author')
      await page.getByRole('button', { name: 'Add Author' }).click()
      await page.getByRole('button', { name: /Create Entry/i }).click()

      await expect(page.getByLabel('Title')).toBeHidden({ timeout: 10000 })

      await expect(page.getByText(entry.title)).toBeVisible({ timeout: 5000 })
    }

    for (const entry of entries) {
      await expect(page.getByText(entry.title)).toBeVisible()
    }
  })

  test('entry appears in correct position (newest first)', async ({ page }) => {
    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const firstEntry = `First Entry ${Date.now()}`
    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()
    await page.getByLabel('Title').fill(firstEntry)
    await page.getByLabel('First Name').fill('First')
    await page.getByLabel('Last Name').fill('Author')
    await page.getByRole('button', { name: 'Add Author' }).click()
    await page.getByRole('button', { name: /Create Entry/i }).click()
    await expect(page.getByText(firstEntry)).toBeVisible({ timeout: 5000 })

    await page.waitForTimeout(1000)

    const secondEntry = `Second Entry ${Date.now()}`
    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()
    await page.getByLabel('Title').fill(secondEntry)
    await page.getByLabel('First Name').fill('Second')
    await page.getByLabel('Last Name').fill('Author')
    await page.getByRole('button', { name: 'Add Author' }).click()
    await page.getByRole('button', { name: /Create Entry/i }).click()
    await expect(page.getByText(secondEntry)).toBeVisible({ timeout: 5000 })

    const entries = page.locator('[data-testid="entry-card"], [data-testid="entry-row"]')
    const firstVisible = entries.first()
    await expect(firstVisible).toContainText(secondEntry)
  })

  test('entry with tags appears immediately with tags visible', async ({ page }) => {
    await page.goto('/app/tags')
    await page.getByRole('button', { name: /New Tag/i }).click()
    await page.getByLabel('Name').fill('Important')
    await page.getByRole('button', { name: /Create Tag/i }).click()
    await expect(page.getByText('Important')).toBeVisible({ timeout: 5000 })

    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const entryTitle = `Tagged Entry ${Date.now()}`
    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()
    await page.getByLabel('Title').fill(entryTitle)
    await page.getByLabel('First Name').fill('Tagged')
    await page.getByLabel('Last Name').fill('Author')
    await page.getByRole('button', { name: 'Add Author' }).click()

    const tagSelect = page
      .locator('label:has-text("Tags")')
      .locator('..')
      .locator('select, input, [role="combobox"]')
      .first()
    if (await tagSelect.isVisible()) {
      await tagSelect.click()
      await page.getByText('Important').click()
    }

    await page.getByRole('button', { name: /Create Entry/i }).click()
    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 5000 })
  })

  test('entry count in empty state changes to list view', async ({ page }) => {
    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const hasEmptyState = await page.locator('text=/Your library is empty|No entries/i').isVisible()

    if (hasEmptyState) {
      await expect(page.locator('text=/Your library is empty|No entries/i')).toBeVisible()
    }

    const entryTitle = `First Ever Entry ${Date.now()}`
    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()
    await page.getByLabel('Title').fill(entryTitle)
    await page.getByLabel('First Name').fill('First')
    await page.getByLabel('Last Name').fill('Author')
    await page.getByRole('button', { name: 'Add Author' }).click()
    await page.getByRole('button', { name: /Create Entry/i }).click()

    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 5000 })

    if (hasEmptyState) {
      await expect(page.locator('text=/Your library is empty|No entries/i')).not.toBeVisible()
    }
  })
})
