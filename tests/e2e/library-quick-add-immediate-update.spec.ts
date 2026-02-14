import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

let sharedPage: import('@playwright/test').Page

test.describe('Library - Quick Add Immediate Update', () => {
  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()
    const testUser = {
      email: `library-quickadd-${Date.now()}@example.com`,
      password: 'testpassword123',
    }

    await sharedPage.goto('/signup')
    await sharedPage.waitForLoadState('networkidle')
    await expect(sharedPage.getByRole('heading', { name: /Create your account/i })).toBeVisible()

    await sharedPage.getByPlaceholder('Your name').fill('Quick Add Test User')
    await sharedPage.getByPlaceholder('you@example.com').fill(testUser.email)
    await sharedPage.locator('input[type="password"]').first().fill(testUser.password)
    await sharedPage.locator('input[type="password"]').nth(1).fill(testUser.password)

    const [response] = await Promise.all([
      sharedPage.waitForResponse((r) => r.url().includes('/api/auth/register'), { timeout: 15000 }),
      sharedPage.getByRole('button', { name: 'Create Account' }).click(),
    ])

    if (!response.ok()) {
      const body = await response.text().catch(() => 'Unable to read response body')
      throw new Error(`Register API failed: ${response.status()} - ${body}`)
    }

    await expect(sharedPage).toHaveURL('/app', { timeout: 10000 })
    await sharedPage.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  test('entry added via Quick Add appears immediately on library page without refresh', async () => {
    await sharedPage.goto('/app/library')
    await sharedPage.waitForLoadState('networkidle')

    await expect(sharedPage.getByRole('heading', { name: 'Library', exact: true })).toBeVisible()

    const entryTitle = `Quick Add Test ${Date.now()}`

    await sharedPage.getByTestId('quick-add-button').click()

    await expect(sharedPage.getByRole('heading', { name: /Add a source/i })).toBeVisible({
      timeout: 5000,
    })

    const input = sharedPage.getByPlaceholder(/Paste DOI, ISBN, URL/i)
    await input.fill(entryTitle)

    await sharedPage
      .waitForResponse((r) => r.url().includes('/api/entries/suggest'), { timeout: 10000 })
      .catch(() => null)
    await sharedPage.waitForTimeout(500)

    const addAnywayButton = sharedPage.getByRole('button', { name: /Add anyway/i })

    try {
      await expect(addAnywayButton).toBeVisible({ timeout: 3000 })
      await addAnywayButton.click()
    } catch {
      const firstSuggestion = sharedPage.locator('button').filter({ hasText: entryTitle }).first()
      await expect(firstSuggestion).toBeVisible({ timeout: 2000 })
      await firstSuggestion.click()
      await expect(sharedPage.getByRole('button', { name: /Add to library/i })).toBeVisible({
        timeout: 5000,
      })
      await sharedPage.getByRole('button', { name: /Add to library/i }).click()
    }

    await sharedPage.waitForResponse(
      (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
      { timeout: 10000 },
    )

    await expect(sharedPage.getByRole('heading', { name: /Add a source/i })).toBeHidden({
      timeout: 10000,
    })

    await expect(sharedPage.getByText(entryTitle)).toBeVisible({ timeout: 5000 })

    const entryElement = sharedPage.locator(`text="${entryTitle}"`).first()
    await expect(entryElement).toBeVisible()
  })

  test('multiple entries added via Quick Add all appear without refresh', async () => {
    await sharedPage.goto('/app/library')
    await sharedPage.waitForLoadState('networkidle')

    const timestamp = Date.now()
    const entries = [`Quick Entry One ${timestamp}`, `Quick Entry Two ${timestamp + 1}`]

    for (const entryTitle of entries) {
      await sharedPage.getByTestId('quick-add-button').click()
      await expect(sharedPage.getByRole('heading', { name: /Add a source/i })).toBeVisible({
        timeout: 5000,
      })

      const input = sharedPage.getByPlaceholder(/Paste DOI, ISBN, URL/i)
      await input.fill(entryTitle)

      await sharedPage
        .waitForResponse((r) => r.url().includes('/api/entries/suggest'), { timeout: 10000 })
        .catch(() => null)
      await sharedPage.waitForTimeout(500)

      const addAnywayButton = sharedPage.getByRole('button', { name: /Add anyway/i })

      try {
        await expect(addAnywayButton).toBeVisible({ timeout: 3000 })
        await addAnywayButton.click()
      } catch {
        const firstSuggestion = sharedPage.locator('button').filter({ hasText: entryTitle }).first()
        await expect(firstSuggestion).toBeVisible({ timeout: 2000 })
        await firstSuggestion.click()
        await expect(sharedPage.getByRole('button', { name: /Add to library/i })).toBeVisible({
          timeout: 5000,
        })
        await sharedPage.getByRole('button', { name: /Add to library/i }).click()
      }

      await sharedPage.waitForResponse(
        (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
        { timeout: 10000 },
      )
      await expect(sharedPage.getByRole('heading', { name: /Add a source/i })).toBeHidden({
        timeout: 10000,
      })

      await expect(sharedPage.getByText(entryTitle)).toBeVisible({ timeout: 5000 })
    }

    for (const entryTitle of entries) {
      await expect(sharedPage.getByText(entryTitle)).toBeVisible()
    }
  })

  test('entry added via Quick Add from dashboard shows immediately on library page', async () => {
    await sharedPage.goto('/app')
    await sharedPage.waitForLoadState('networkidle')

    const entryTitle = `Dashboard Quick Add ${Date.now()}`

    await sharedPage.getByTestId('quick-add-button').click()
    await expect(sharedPage.getByRole('heading', { name: /Add a source/i })).toBeVisible({
      timeout: 5000,
    })

    const input = sharedPage.getByPlaceholder(/Paste DOI, ISBN, URL/i)
    await input.fill(entryTitle)
    await sharedPage.waitForTimeout(1500)

    const firstSuggestion = sharedPage.locator('button').filter({ hasText: entryTitle }).first()
    const addAnywayButton = sharedPage.getByRole('button', { name: /Add anyway/i })

    const hasSuggestion = await firstSuggestion.isVisible().catch(() => false)
    const hasAddAnyway = await addAnywayButton.isVisible().catch(() => false)

    if (hasSuggestion) {
      await firstSuggestion.click()
      await expect(sharedPage.getByRole('button', { name: /Add to library/i })).toBeVisible({
        timeout: 5000,
      })
      await sharedPage.getByRole('button', { name: /Add to library/i }).click()
    } else if (hasAddAnyway) {
      await addAnywayButton.click()
    }

    await sharedPage.waitForResponse(
      (r) => r.url().includes('/api/entries') && r.request().method() === 'POST',
      { timeout: 10000 },
    )
    await expect(sharedPage.getByRole('heading', { name: /Add a source/i })).toBeHidden({
      timeout: 10000,
    })

    await sharedPage.goto('/app/library')
    await sharedPage.waitForLoadState('networkidle')

    await expect(sharedPage.getByText(entryTitle)).toBeVisible({ timeout: 5000 })
  })
})
