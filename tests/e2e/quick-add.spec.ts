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

async function openQuickAdd(page: import('@playwright/test').Page) {
  await page.getByTestId('quick-add-button').click()
  await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
    timeout: 5000,
  })
}

const SEARCH_PLACEHOLDER = 'Paste DOI, ISBN, URL… or search — type / for fields'

test.describe('Quick Add - Desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('opens Quick Add modal when header button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await openQuickAdd(page)

    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toBeVisible()
  })

  test('closes Quick Add modal when Cancel is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await openQuickAdd(page)

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('closes Quick Add modal when X button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await openQuickAdd(page)

    await page.getByTestId('quick-add-close').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('can type in search field in the modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await openQuickAdd(page)

    const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await searchInput.fill('Test Entry Title')

    await expect(searchInput).toHaveValue('Test Entry Title')
  })

  test('searches by DOI, selects result, and adds to library', async ({ page }) => {
    test.setTimeout(60000)
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAdd(page)

    const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await searchInput.fill('10.1038/nature12373')

    // Wait for the suggest API response
    await page.waitForResponse(
      (r) => r.url().includes('/api/entries/suggest') && r.status() === 200,
      { timeout: 15000 },
    )

    // A suggestion matching this DOI should appear - click the first result
    const firstSuggestion = page.locator('button').filter({ hasText: /10\.1038\/nature12373/i }).first()
    await expect(firstSuggestion).toBeVisible({ timeout: 5000 })
    await firstSuggestion.click()

    // Should now be in preview mode with "Add to library" button
    const addButton = page.getByRole('button', { name: /Add to library/i })
    await expect(addButton).toBeVisible({ timeout: 5000 })

    // Click "Add to library" and verify the API call succeeds
    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
        { timeout: 15000 },
      ),
      addButton.click(),
    ])

    const responseBody = await createResponse.json()
    expect(createResponse.status()).toBe(200)
    expect(responseBody.title).toBeTruthy()

    // Modal should close on success
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('searches by title, selects result, and adds to library', async ({ page }) => {
    test.setTimeout(60000)
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAdd(page)

    const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await searchInput.fill('quantum computing')

    // Wait for suggest API to return
    await page.waitForResponse(
      (r) => r.url().includes('/api/entries/suggest') && r.status() === 200,
      { timeout: 15000 },
    )

    // Should have at least one search result - click the first one
    const firstResult = page.locator('button.w-full.text-left').first()
    await expect(firstResult).toBeVisible({ timeout: 5000 })
    await firstResult.click()

    // Should now be in preview mode with "Add to library" button
    const addButton = page.getByRole('button', { name: /Add to library/i })
    await expect(addButton).toBeVisible({ timeout: 5000 })

    // Click "Add to library" and verify the API call succeeds
    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
        { timeout: 15000 },
      ),
      addButton.click(),
    ])

    const responseBody = await createResponse.json()
    expect(createResponse.status()).toBe(200)
    expect(responseBody.title).toBeTruthy()
    expect(responseBody.id).toBeTruthy()

    // Modal should close on success
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 5000,
    })

    // Entry should appear in the library
    await page.goto('/app/library')
    await expect(page.getByText(responseBody.title, { exact: false })).toBeVisible({
      timeout: 5000,
    })
  })

  test('adds entry with Add anyway when no results match', async ({ page }) => {
    test.setTimeout(60000)
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAdd(page)

    const uniqueTitle = `xxyyzz-unique-noresults-${Date.now()}-qqwwee`

    const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await searchInput.fill(uniqueTitle)

    // Wait for the suggest API to return (will have no/irrelevant results)
    await page.waitForResponse(
      (r) => r.url().includes('/api/entries/suggest') && r.status() === 200,
      { timeout: 15000 },
    )

    // "Add anyway" button should appear
    const addAnywayButton = page.getByRole('button', { name: /Add anyway/i })
    await expect(addAnywayButton).toBeVisible({ timeout: 8000 })

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
        { timeout: 10000 },
      ),
      addAnywayButton.click(),
    ])

    expect(createResponse.status()).toBe(200)
    const createdEntry = await createResponse.json()
    expect(createdEntry.title).toBe(uniqueTitle)

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 5000,
    })

    // Entry should appear in library
    await page.goto('/app/library')
    await expect(page.getByText(uniqueTitle, { exact: false })).toBeVisible({ timeout: 5000 })
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
    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toBeVisible()
  })

  test('opens Quick Add when bottom nav FAB is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible()

    await page.getByTestId('quick-add-fab').click()

    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toBeVisible()
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

    const searchInput = page.getByPlaceholder(SEARCH_PLACEHOLDER)
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
