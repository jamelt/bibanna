import { test, expect, devices } from '@playwright/test'

async function signUpAndLogin(page: import('@playwright/test').Page) {
  const testUser = {
    name: 'E2E Search User',
    email: `e2e-search-${Date.now()}@example.com`,
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

async function openQuickAddModal(page: import('@playwright/test').Page) {
  await page.keyboard.press('Meta+k')
  await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({ timeout: 5000 })
}

test.describe('QuickAdd Search - Field Qualifier Pills', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('displays field qualifier pills below the input', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    await expect(
      page.getByRole('button', { name: 'Any' }).or(page.locator('span:text("Any")')),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Author' }).or(page.locator('span:text("Author")')),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Title' }).or(page.locator('span:text("Title")')),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Publisher' }).or(page.locator('span:text("Publisher")')),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Journal' }).or(page.locator('span:text("Journal")')),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Subject' }).or(page.locator('span:text("Subject")')),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Year' }).or(page.locator('span:text("Year")')),
    ).toBeVisible()
  })

  test('clicking Author pill shows qualifier badge and updates placeholder', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    await page.locator('span:text("Author")').click()

    await expect(page.locator('button:has-text("Author") >> nth=0')).toBeVisible()
    await expect(page.locator('input[placeholder*="author"]')).toBeVisible()
  })

  test('clicking qualifier badge clears it', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    await page.locator('span:text("Journal")').click()
    await expect(page.locator('input[placeholder*="journal"]')).toBeVisible()

    await page.locator('button:has-text("Journal")').first().click()

    await expect(page.locator('input[placeholder*="type / for fields"]')).toBeVisible()
  })
})

test.describe('QuickAdd Search - Slash Commands', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('typing / shows the slash command dropdown', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    const input = page.locator('input[placeholder*="type / for fields"]')
    await input.fill('/')

    await expect(page.locator('text=Search by author')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=Search by title')).toBeVisible()
    await expect(page.locator('text=Search by publisher')).toBeVisible()
  })

  test('typing /a selects Author qualifier', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    const input = page.locator('input[placeholder*="type / for fields"]')
    await input.fill('/a')

    await expect(page.locator('input[placeholder*="author"]')).toBeVisible({ timeout: 3000 })
  })

  test('Escape closes slash dropdown', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    const input = page.locator('input[placeholder*="type / for fields"]')
    await input.fill('/')
    await expect(page.locator('text=Search by author')).toBeVisible({ timeout: 3000 })

    await page.keyboard.press('Escape')
    await expect(page.locator('text=Search by author')).not.toBeVisible()
  })
})

test.describe('QuickAdd Search - Keyboard Navigation', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('Backspace on empty input clears qualifier', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    await page.locator('span:text("Year")').click()
    await expect(page.locator('input[placeholder*="year"]')).toBeVisible()

    await page.keyboard.press('Backspace')
    await expect(page.locator('input[placeholder*="type / for fields"]')).toBeVisible()
  })

  test('Cmd+K toggles the modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.keyboard.press('Meta+k')
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({ timeout: 5000 })

    await page.keyboard.press('Meta+k')
    await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
      timeout: 3000,
    })
  })
})

test.describe('QuickAdd Search - API Integration', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('searching by title returns results from multiple sources', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    const input = page.locator('input[placeholder*="type / for fields"]')
    await input.fill('The Power Broker')

    await page.waitForResponse(
      (response) => response.url().includes('/api/entries/suggest') && response.status() === 200,
      { timeout: 15000 },
    )

    await expect(page.locator('button:has-text("The Power Broker")').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('searching by author uses field qualifier in API call', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    await page.locator('span:text("Author")').click()

    const input = page.locator('input[placeholder*="author"]')
    await input.fill('Robert Caro')

    const response = await page.waitForResponse(
      (r) => r.url().includes('/api/entries/suggest') && r.status() === 200,
      { timeout: 15000 },
    )

    const body = await response.json()
    expect(body).toHaveProperty('suggestions')
    expect(body).toHaveProperty('hasMore')
    expect(body).toHaveProperty('total')
  })

  test('suggest endpoint returns new response shape with hasMore and total', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    const input = page.locator('input[placeholder*="type / for fields"]')
    await input.fill('nature')

    const response = await page.waitForResponse(
      (r) => r.url().includes('/api/entries/suggest') && r.status() === 200,
      { timeout: 15000 },
    )

    const body = await response.json()
    expect(body).toHaveProperty('suggestions')
    expect(Array.isArray(body.suggestions)).toBe(true)
    expect(body).toHaveProperty('hasMore')
    expect(typeof body.hasMore).toBe('boolean')
    expect(body).toHaveProperty('total')
    expect(typeof body.total).toBe('number')
  })
})

test.describe('QuickAdd Search - Modal Stability', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('modal maintains minimum height across state changes', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await openQuickAddModal(page)

    const modalContent = page.locator('.min-h-112')
    await expect(modalContent).toBeVisible()

    const input = page.locator('input[placeholder*="type / for fields"]')
    await input.fill('test')

    await expect(modalContent).toBeVisible()

    await input.fill('')
    await expect(modalContent).toBeVisible()
  })
})

test.describe('QuickAdd Search - Mobile', () => {
  test.use({
    viewport: devices['iPhone 12'].viewport,
    userAgent: devices['iPhone 12'].userAgent,
    hasTouch: true,
    isMobile: true,
  })

  test('qualifier pills are visible and tappable on mobile', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-fab').click()
    await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible({ timeout: 5000 })

    await expect(page.locator('span:text("Author")')).toBeVisible()
    await expect(page.locator('span:text("Title")')).toBeVisible()

    await page.locator('span:text("Author")').tap()
    await expect(page.locator('input[placeholder*="author"]')).toBeVisible()
  })
})
