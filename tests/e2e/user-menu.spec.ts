import { test, expect } from '@playwright/test'

async function signUpAndLogin(page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo) {
  const testUser = {
    name: 'User Menu Test',
    email: `e2e-user-menu-${testInfo.parallelIndex}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'testpassword123',
  }
  await page.goto('/signup')
  await page.waitForLoadState('networkidle')
  
  // Handle potential redirect to login if signup is disabled or other flows, but assuming standard flow
  const heading = page.getByRole('heading', { name: /Create your account/i })
  if (await heading.isVisible()) {
    await page.getByPlaceholder('Your name').fill(testUser.name)
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/register'), { timeout: 15000 }),
      page.getByRole('button', { name: 'Create Account' }).click(),
    ])
    
    if (!response.ok()) {
       // If register fails, try login (maybe user exists from previous run if cleanup failed)
       console.log('Register failed, trying login...')
    }
  }

  await expect(page).toHaveURL('/app', { timeout: 15000 })
}

test.describe('User Menu Navigation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signUpAndLogin(page, testInfo)
    await page.goto('/app')
  })

  test('User can open avatar menu and see navigation options', async ({ page }) => {
    // Wait for the avatar to be visible
    const avatar = page.getByTestId('user-menu-trigger')
    await expect(avatar).toBeVisible()

    // Click the avatar to open the menu
    await avatar.click()

    // Check for menu items using text first to be safe
    await expect(page.getByText('User Menu Test')).toBeVisible()
    await expect(page.getByText('Profile')).toBeVisible()
    await expect(page.getByText('Settings')).toBeVisible()
    await expect(page.getByText('Subscription')).toBeVisible()
    await expect(page.getByText('Sign out')).toBeVisible()
  })

  test('User can navigate to Settings from user menu', async ({ page }) => {
    await page.getByTestId('user-menu-trigger').click()
    await page.getByText('Settings').click()
    
    await expect(page).toHaveURL('/app/settings')
  })

  test('User can log out from user menu', async ({ page }) => {
    await page.getByTestId('user-menu-trigger').click()
    await page.getByText('Sign out').click()
    
    // Should redirect to login or home
    await expect(page).toHaveURL(/\/login|^\/$/)
  })
})
