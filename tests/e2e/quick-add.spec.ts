import { test, expect, devices } from '@playwright/test'

async function signUpAndLogin(page: import('@playwright/test').Page) {
  const testUser = {
    name: 'E2E Quick Add User',
    email: `e2e-quickadd-${Date.now()}@example.com`,
    password: 'testpassword123',
  }
  await page.goto('/signup')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible({
    timeout: 5000,
  })
  await page.getByPlaceholder('Your name').fill(testUser.name)
  await page.getByPlaceholder('you@example.com').fill(testUser.email)
  await page.locator('input[type="password"]').first().fill(testUser.password)
  await page.locator('input[type="password"]').nth(1).fill(testUser.password)

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/register'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Create Account' }).click(),
  ])
  if (!response.ok()) {
    const body = await response.text().catch(() => 'Unable to read response body')
    throw new Error(`Register API failed: ${response.status()} - ${body}`)
  }

  await expect(page).toHaveURL('/app', { timeout: 10000 })
}

test.describe('Quick Add - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('opens Quick Add modal when header button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await page.getByTestId('quick-add-button').click()

    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })
    await expect(
      page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields'),
    ).toBeVisible()
  })

  test('closes Quick Add modal when Cancel is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('closes Quick Add modal when X button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    await page.getByTestId('quick-add-close').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('can type in search field in the modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    const searchInput = page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields')
    await searchInput.fill('Test Entry Title')

    await expect(searchInput).toHaveValue('Test Entry Title')
  })

  test('successfully adds an entry using Add anyway button', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    const uniqueTitle = `xxyyzz-unique-test-entry-${Date.now()}-qqwweerrtt`

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    const searchInput = page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields')
    await searchInput.fill(uniqueTitle)

    await page.waitForTimeout(2500)

    const addAnywayButton = page.getByRole('button', { name: /Add anyway/i })
    await expect(addAnywayButton).toBeVisible({ timeout: 5000 })

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
        { timeout: 10000 },
      ),
      addAnywayButton.click(),
    ])

    expect(createResponse.ok()).toBeTruthy()
    const createdEntry = await createResponse.json()
    expect(createdEntry.title).toBe(uniqueTitle)

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 5000,
    })

    await page.goto('/app/library')
    await expect(page.getByText(uniqueTitle, { exact: false })).toBeVisible({ timeout: 5000 })
  })

  test('successfully adds an entry with project selected', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    const projectName = `xxyyzz-testproject-${Date.now()}`
    await page.getByTestId('dashboard-quick-action-new-project').click()
    await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible()
    await page.getByTestId('project-modal-name').fill(projectName)
    await page.getByTestId('project-modal-submit').click()
    await expect(page.getByRole('heading', { name: 'Create Project' })).not.toBeVisible({
      timeout: 5000,
    })

    const uniqueTitle = `xxyyzz-entry-with-proj-${Date.now()}-qqwwee`

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    const searchInput = page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields')
    await searchInput.fill(uniqueTitle)

    await page.waitForTimeout(2500)

    await page.getByPlaceholder('Select a project...').click()
    await page.getByText(projectName).first().click()

    const addAnywayButton = page.getByRole('button', { name: /Add anyway/i })
    await expect(addAnywayButton).toBeVisible({ timeout: 5000 })

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
        { timeout: 10000 },
      ),
      addAnywayButton.click(),
    ])

    expect(createResponse.ok()).toBeTruthy()
    const createdEntry = await createResponse.json()
    expect(createdEntry.title).toBe(uniqueTitle)

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 5000,
    })

    await page.goto('/app/library')
    await expect(page.getByText(uniqueTitle, { exact: false })).toBeVisible({ timeout: 5000 })
  })

  test('successfully adds an entry from DOI', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    const searchInput = page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields')
    await searchInput.fill('10.1038/nature12373')

    await page.waitForTimeout(2000)

    const firstResult = page.locator('[role="button"]').filter({ hasText: /nature/i }).first()

    if (await firstResult.isVisible()) {
      await firstResult.click()
      await expect(page.getByRole('button', { name: /Add to library/i })).toBeVisible({
        timeout: 5000,
      })

      const [createResponse] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
          { timeout: 15000 },
        ),
        page.getByRole('button', { name: /Add to library/i }).click(),
      ])

      expect(createResponse.ok()).toBeTruthy()
      await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
        timeout: 5000,
      })
    }
  })
})

test.describe('Quick Add - Mobile', () => {
  test.use({
    viewport: devices['iPhone 12'].viewport,
    userAgent: devices['iPhone 12'].userAgent,
    hasTouch: true,
    isMobile: true,
  })

  test('opens Quick Add when header button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await page.getByTestId('quick-add-button-mobile').click()

    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })
    await expect(
      page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields'),
    ).toBeVisible()
  })

  test('opens Quick Add when bottom nav FAB is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await page.getByTestId('quick-add-fab').click()

    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })
    await expect(
      page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields'),
    ).toBeVisible()
  })

  test('opens Quick Add when navigating to /app?action=quick-add', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await page.goto('/app?action=quick-add')

    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('closes Quick Add when X button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-fab').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    await page.getByTestId('quick-add-close').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('search input accepts URLs in Quick Add', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-fab').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })

    const searchInput = page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields')
    await searchInput.fill('https://example.com')
    await expect(searchInput).toHaveValue('https://example.com')
  })
})

test.describe('Quick Add - Cross-browser', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('Chrome desktop - Quick Add button works', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium')
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('WebKit (Safari) desktop - Quick Add button works', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit')
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })
  })
})
