import { test, expect } from '@playwright/test'

async function signUpAndLogin(
  page: import('@playwright/test').Page,
  testInfo: import('@playwright/test').TestInfo,
) {
  const testUser = {
    name: 'Dashboard Quick Actions User',
    email: `e2e-dashboard-qa-${testInfo.parallelIndex}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
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

test.describe('Dashboard Quick Actions', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signUpAndLogin(page, testInfo)
    await page.goto('/app')
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 5000 })
  })

  test('Add Entry opens Quick Add modal so user can add a reference', async ({ page }) => {
    await page.getByTestId('dashboard-quick-action-add-entry').click()

    await expect(page.getByRole('heading', { name: 'Quick Add' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Type' })).toBeVisible()
    await expect(page.getByPlaceholder('Enter title...')).toBeVisible()
  })

  test('New Project opens create modal and user can create a project', async ({ page }) => {
    await page.getByTestId('dashboard-quick-action-new-project').click()

    await expect(page.getByRole('heading', { name: 'Create Project' })).toBeVisible({
      timeout: 5000,
    })
    const projectName = `Dashboard Test Project ${Date.now()}`
    await page.getByTestId('project-modal-name').fill(projectName)
    await page
      .getByPlaceholder('What is this project about?')
      .fill('Created from dashboard quick action')
    await page.getByTestId('project-modal-submit').click()

    await expect(page.getByRole('heading', { name: 'Create Project' })).not.toBeVisible({
      timeout: 10000,
    })
    await page.goto('/app/projects')
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 })
  })

  test('Import navigates to Library where user can manage entries', async ({ page }) => {
    await page.getByTestId('dashboard-quick-action-import').click()

    await expect(page).toHaveURL('/app/library')
    await expect(page.getByRole('heading', { name: /Library/i })).toBeVisible()
  })

  test('Export opens export modal so user can export bibliography', async ({ page }) => {
    await page.getByTestId('dashboard-quick-action-export').scrollIntoViewIfNeeded()
    await page.getByTestId('dashboard-quick-action-export').click()

    await expect(page.getByText('Export Bibliography')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Excel')).toBeVisible()
    await expect(page.getByText('Export Format')).toBeVisible()
  })
})
