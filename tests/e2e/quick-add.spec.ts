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

    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible()

    await page.getByTestId('quick-add-button').click()

    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Type' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Voice' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'URL' })).toBeVisible()
  })

  test('closes Quick Add modal when Cancel is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('closes Quick Add modal when X button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })

    await page.getByTestId('quick-add-close').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('can fill in form fields in the modal', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })

    await page.getByPlaceholder('Enter title...').fill('Test Entry Title')
    await page.getByPlaceholder('John Smith, Jane Doe').fill('Ada Lovelace')

    await expect(page.getByPlaceholder('Enter title...')).toHaveValue('Test Entry Title')
    await expect(page.getByPlaceholder('John Smith, Jane Doe')).toHaveValue('Ada Lovelace')
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

    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible()

    await page.getByTestId('quick-add-button-mobile').click()

    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Type' })).toBeVisible()
  })

  test('opens Quick Add when bottom nav FAB is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible()

    await page.getByTestId('quick-add-fab').click()

    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByPlaceholder('Enter title...')).toBeVisible()
  })

  test('opens Quick Add when navigating to /app?action=quick-add', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible()

    await page.goto('/app?action=quick-add')

    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })
  })

  test('closes Quick Add when X button is clicked', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-fab').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })

    await page.getByTestId('quick-add-close').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('URL tab and input are available in Quick Add', async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')

    await page.getByTestId('quick-add-fab').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'URL' }).click()
    await expect(page.getByPlaceholder('https://...')).toBeVisible()
  })
})

test.describe('Quick Add - Cross-browser', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('Chrome desktop - Quick Add button works', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium')
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible()

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })
  })

  test('WebKit (Safari) desktop - Quick Add button works', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit')
    await signUpAndLogin(page)
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Quick Add' })).not.toBeVisible()

    await page.getByTestId('quick-add-button').click()
    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })
  })
})
