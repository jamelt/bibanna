import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  const testUser = {
    name: 'E2E Test User',
    email: `e2e-${Date.now()}@example.com`,
    password: 'testpassword123',
  }

  test('should sign up, create account, logout, and log in', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible()

    await page.getByPlaceholder('Your name').fill(testUser.name)
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/register'), { timeout: 15000 }),
      page.getByRole('button', { name: 'Create Account' }).click(),
    ])

    if (!response.ok()) {
      const body = await response.text().catch(() => 'Unable to read response body')
      throw new Error(`Register API failed: ${response.status()} - ${body}`)
    }

    await expect(page).toHaveURL('/app', { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 })

    await page.request.post('/api/auth/logout')
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible()

    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    
    const [loginResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])
    
    if (!loginResponse.ok()) {
      const body = await loginResponse.text().catch(() => 'Unable to read response body')
      throw new Error(`Login API failed: ${loginResponse.status()} - ${body}`)
    }

    await expect(page).toHaveURL('/app', { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 })
  })

  test('should stay logged in after page reload', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)

    const [loginResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/login'), { timeout: 10000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    if (!loginResponse.ok()) {
      const body = await loginResponse.text().catch(() => 'Unable to read response body')
      throw new Error(`Login API failed: ${loginResponse.status()} - ${body}`)
    }

    await expect(page).toHaveURL('/app', { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 })

    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL('/app', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 })
  })
})
