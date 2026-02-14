import { test, expect } from '@playwright/test'

test.describe('Immediate UI Updates', () => {
  const testUser = {
    name: 'Immediate Update Test',
    email: `update-test-${Date.now()}@example.com`,
    password: 'testpassword123',
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Your name').fill(testUser.name)
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })
  })

  test('project appears immediately after creation without manual refresh', async ({ page }) => {
    await page.goto('/app/projects')
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible()

    await expect(page.locator('text=No projects yet')).toBeVisible()

    await page
      .getByRole('button', { name: /New Project|Create Project/i })
      .first()
      .click()

    const projectName = `Immediate Test ${Date.now()}`
    await page.getByTestId('project-modal-name').fill(projectName)
    await page.getByTestId('project-modal-submit').click()

    await expect(page.getByTestId('project-modal-name')).toBeHidden({ timeout: 10000 })

    await expect(page.locator('text=No projects yet')).not.toBeVisible()
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 })

    const projectCard = page.locator('.group', { hasText: projectName })
    await expect(projectCard).toBeVisible()
  })

  test('multiple projects appear immediately in correct order', async ({ page }) => {
    await page.goto('/app/projects')

    const projectNames: string[] = []
    for (let i = 1; i <= 3; i++) {
      const projectName = `Project ${i} ${Date.now()}`
      projectNames.push(projectName)

      await page
        .getByRole('button', { name: /New Project|Create Project/i })
        .first()
        .click()
      await page.getByTestId('project-modal-name').fill(projectName)
      await page.getByTestId('project-modal-submit').click()
      await expect(page.getByTestId('project-modal-name')).toBeHidden({ timeout: 10000 })

      await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 })
    }

    for (const name of projectNames) {
      await expect(page.getByText(name)).toBeVisible()
    }

    const projectCards = page.locator('.group')
    await expect(projectCards).toHaveCount(3)
  })

  test('entry appears immediately in library after creation', async ({ page }) => {
    await page.goto('/app/library')
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()

    const initialEntryCount = await page
      .locator('[data-testid="entry-card"], [data-testid="entry-row"]')
      .count()

    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()

    const entryTitle = `Test Entry ${Date.now()}`
    await page.getByLabel('Title').fill(entryTitle)
    await page.getByLabel('First Name').fill('John')
    await page.getByLabel('Last Name').fill('Doe')
    await page.getByRole('button', { name: 'Add Author' }).click()

    await page.getByRole('button', { name: /Create Entry|Save/i }).click()

    await expect(page.getByLabel('Title')).toBeHidden({ timeout: 10000 })

    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 5000 })

    const newEntryCount = await page
      .locator('[data-testid="entry-card"], [data-testid="entry-row"]')
      .count()
    expect(newEntryCount).toBe(initialEntryCount + 1)
  })

  test('multiple entries appear immediately without refresh', async ({ page }) => {
    await page.goto('/app/library')

    const entryTitles: string[] = []
    for (let i = 1; i <= 3; i++) {
      const entryTitle = `Entry ${i} ${Date.now()}`
      entryTitles.push(entryTitle)

      await page
        .getByRole('button', { name: /Add Entry/i })
        .first()
        .click()
      await page.getByLabel('Title').fill(entryTitle)
      await page.getByLabel('First Name').fill('Author')
      await page.getByLabel('Last Name').fill(`${i}`)
      await page.getByRole('button', { name: 'Add Author' }).click()
      await page.getByRole('button', { name: /Create Entry|Save/i }).click()

      await expect(page.getByLabel('Title')).toBeHidden({ timeout: 10000 })
      await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 5000 })
    }

    for (const title of entryTitles) {
      await expect(page.getByText(title)).toBeVisible()
    }
  })

  test('project created from dashboard appears in projects list', async ({ page }) => {
    await page.goto('/app')
    await page.getByTestId('dashboard-quick-action-new-project').click()

    const projectName = `Dashboard Project ${Date.now()}`
    await page.getByTestId('project-modal-name').fill(projectName)
    await page.getByTestId('project-modal-submit').click()

    await expect(page.getByTestId('project-modal-name')).toBeHidden({ timeout: 10000 })

    await page.goto('/app/projects')
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 })
  })

  test('entry created via quick add appears in library', async ({ page }) => {
    await page.goto('/app/library')

    await page.keyboard.press('Meta+K')
    await expect(page.getByPlaceholder(/search entries|add by/i)).toBeVisible({ timeout: 2000 })

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    const entryTitle = `Quick Add Entry ${Date.now()}`
    await page.getByLabel('Title').fill(entryTitle)
    await page.getByLabel('First Name').fill('Quick')
    await page.getByLabel('Last Name').fill('Author')
    await page.getByRole('button', { name: 'Add Author' }).click()
    await page.getByRole('button', { name: /Create Entry|Save/i }).click()

    await expect(page.getByLabel('Title')).toBeHidden({ timeout: 10000 })
    await expect(page.getByText(entryTitle)).toBeVisible({ timeout: 5000 })
  })

  test('project count updates immediately after creation', async ({ page }) => {
    await page.goto('/app')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    const statsCard = page.locator('text=Projects').locator('..').locator('..')
    const initialCount = await statsCard.locator('text=/^\\d+$/').first().textContent()

    await page.getByTestId('dashboard-quick-action-new-project').click()
    const projectName = `Count Test ${Date.now()}`
    await page.getByTestId('project-modal-name').fill(projectName)
    await page.getByTestId('project-modal-submit').click()

    await expect(page.getByTestId('project-modal-name')).toBeHidden({ timeout: 10000 })

    await page.goto('/app')
    await page.waitForLoadState('networkidle')

    const newCount = await statsCard.locator('text=/^\\d+$/').first().textContent()
    expect(Number.parseInt(newCount || '0')).toBe(Number.parseInt(initialCount || '0') + 1)
  })

  test('entry count updates immediately after creation', async ({ page }) => {
    await page.goto('/app')

    const statsCard = page.locator('text=Total Entries').locator('..').locator('..')
    const initialCount = await statsCard.locator('text=/^\\d+$/').first().textContent()

    await page.goto('/app/library')
    await page
      .getByRole('button', { name: /Add Entry/i })
      .first()
      .click()

    const entryTitle = `Count Entry ${Date.now()}`
    await page.getByLabel('Title').fill(entryTitle)
    await page.getByLabel('First Name').fill('Test')
    await page.getByLabel('Last Name').fill('User')
    await page.getByRole('button', { name: 'Add Author' }).click()
    await page.getByRole('button', { name: /Create Entry|Save/i }).click()

    await expect(page.getByLabel('Title')).toBeHidden({ timeout: 10000 })

    await page.goto('/app')
    await page.waitForLoadState('networkidle')

    const newCount = await statsCard.locator('text=/^\\d+$/').first().textContent()
    expect(Number.parseInt(newCount || '0')).toBe(Number.parseInt(initialCount || '0') + 1)
  })
})
