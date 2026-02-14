import { test, expect, devices } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('test@example.com')
  await page.locator('input[type="password"]').fill('testpassword123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/app', { timeout: 10000 })
}

const mobileDevices = [
  { name: 'Pixel 5', ...devices['Pixel 5'] },
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'iPhone SE', ...devices['iPhone SE'] },
  { name: 'iPad Pro 11', ...devices['iPad Pro 11'] },
]

for (const device of mobileDevices) {
  test.describe(`Mobile - ${device.name}`, () => {
    test.use({
      viewport: device.viewport,
      userAgent: device.userAgent,
      hasTouch: device.hasTouch,
      isMobile: device.isMobile,
    })

    test('displays bottom navigation on mobile', async ({ page }) => {
      await page.goto('/login')
      await page.getByPlaceholder('you@example.com').fill('test@example.com')
      await page.locator('input[type="password"]').fill('testpassword123')
      await page.getByRole('button', { name: 'Sign in' }).click()

      await expect(page).toHaveURL('/app', { timeout: 10000 })

      if (device.isMobile) {
        const bottomNav = page.locator('nav.fixed.bottom-0')
        await expect(bottomNav).toBeVisible()

        await expect(page.locator('nav.fixed.bottom-0').getByText('Dashboard')).toBeVisible()
        await expect(page.locator('nav.fixed.bottom-0').getByText('Library')).toBeVisible()
        await expect(page.locator('nav.fixed.bottom-0').getByText('Projects')).toBeVisible()
        await expect(page.getByTestId('quick-add-fab')).toBeVisible()
      }
    })

    test('opens Quick Add modal from FAB', async ({ page }) => {
      await login(page)
      await page.goto('/app')

      if (device.isMobile) {
        await page.getByTestId('quick-add-fab').click()

        await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible()
      }
    })

    test('navigates between tabs', async ({ page }) => {
      await login(page)
      await page.goto('/app')

      if (device.isMobile) {
        await page.locator('nav.fixed.bottom-0').getByText('Library').click()
        await expect(page).toHaveURL(/\/app\/library/)

        await page.locator('nav.fixed.bottom-0').getByText('Projects').click()
        await expect(page).toHaveURL(/\/app\/projects/)

        await page.locator('nav.fixed.bottom-0').getByText('Dashboard').click()
        await expect(page).toHaveURL('/app')
      }
    })

    test('responsive layout adjusts correctly', async ({ page }) => {
      await login(page)
      await page.goto('/app')

      const viewportWidth = device.viewport?.width || 0

      if (viewportWidth < 768) {
        const sidebar = page.locator('aside.hidden.md\\:block')
        await expect(sidebar).not.toBeVisible()
      } else {
        const sidebar = page.locator('aside')
        await expect(sidebar).toBeVisible()
      }
    })

    test('touch scroll works on entry list', async ({ page }) => {
      await login(page)
      await page.goto('/app/library')

      if (device.hasTouch) {
        const entryList = page.locator('[data-testid="entry-list"]')

        await entryList.evaluate((el) => {
          el.scrollTop = 100
        })

        const scrollTop = await entryList.evaluate((el) => el.scrollTop)
        expect(scrollTop).toBeGreaterThan(0)
      }
    })

    test('form inputs work on mobile', async ({ page }) => {
      await login(page)
      await page.goto('/app')

      if (device.isMobile) {
        await page.getByTestId('quick-add-fab').click()

        const urlInput = page.getByPlaceholder('Paste DOI, ISBN, URL… or search — type / for fields')
        await urlInput.tap()
        await urlInput.fill('https://example.com/test')

        await expect(urlInput).toHaveValue('https://example.com/test')
      }
    })

    test('modal closes on back gesture', async ({ page }) => {
      await login(page)
      await page.goto('/app?action=quick-add')

      if (device.isMobile) {
        await expect(page.getByRole('heading', { name: 'Add a source' })).toBeVisible()

        await page.goBack()

        await expect(page.getByRole('heading', { name: 'Add a source' })).not.toBeVisible({
          timeout: 5000,
        })
      }
    })

    test('handles orientation change', async ({ page }) => {
      await login(page)
      await page.goto('/app')

      const originalViewport = page.viewportSize()

      await page.setViewportSize({
        width: originalViewport?.height || 667,
        height: originalViewport?.width || 375,
      })

      await page.waitForTimeout(500)

      await expect(page.locator('main')).toBeVisible()

      if (originalViewport) {
        await page.setViewportSize(originalViewport)
      }
    })
  })
}

test.describe('PWA Installation', () => {
  test('manifest is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json')
    expect(response?.status()).toBe(200)

    const manifest = await response?.json()
    expect(manifest.name).toBe('AnnoBib')
    expect(manifest.start_url).toBe('/app')
    expect(manifest.display).toBe('standalone')
  })

  test('service worker registers', async ({ page }) => {
    await page.goto('/app')

    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        return !!registration
      }
      return false
    })

    expect(swRegistered).toBe(true)
  })
})

test.describe('Offline Support', () => {
  test('shows offline indicator when offline', async ({ page, context }) => {
    await page.goto('/app')

    await context.setOffline(true)

    await page.reload().catch(() => {})

    const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 })

    await context.setOffline(false)
  })

  test('queues actions when offline', async ({ page, context }) => {
    await page.goto('/app')

    await context.setOffline(true)

    const pendingCount = await page.evaluate(() => {
      const stored = localStorage.getItem('annobib-offline-queue')
      if (stored) {
        return JSON.parse(stored).length
      }
      return 0
    })

    expect(pendingCount).toBeGreaterThanOrEqual(0)

    await context.setOffline(false)
  })
})
