import { test, expect } from '@playwright/test'

async function signUpAndLogin(page: import('@playwright/test').Page) {
  const testUser = {
    name: 'Export Test User',
    email: `e2e-export-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
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
    page.waitForResponse((r) => r.url().includes('/api/auth/register'), {
      timeout: 15000,
    }),
    page.getByRole('button', { name: 'Create Account' }).click(),
  ])
  if (!response.ok()) {
    const body = await response.text().catch(() => 'Unable to read response body')
    throw new Error(`Register API failed: ${response.status()} - ${body}`)
  }

  await expect(page).toHaveURL('/app', { timeout: 10000 })
}

async function createTestEntry(page: import('@playwright/test').Page, title: string) {
  await page.goto('/app/library')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /Add Entry/i })
    .first()
    .click()
  await expect(page.getByLabel('Title')).toBeVisible({ timeout: 5000 })
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('First Name').fill('Jane')
  await page.getByLabel('Last Name').fill('Doe')
  await page.getByRole('button', { name: 'Add Author' }).click()
  await page.getByRole('button', { name: /Create Entry/i }).click()
  await expect(page.getByLabel('Title')).toBeHidden({ timeout: 10000 })
  await expect(page.getByText(title)).toBeVisible({ timeout: 5000 })
}

test.describe('Export Modal - Opening from different pages', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndLogin(page)
  })

  test('opens export modal from dashboard quick action', async ({ page }) => {
    await page.goto('/app')
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 5000 })

    await page.getByTestId('dashboard-quick-action-export').scrollIntoViewIfNeeded()
    await page.getByTestId('dashboard-quick-action-export').click()

    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByTestId('export-modal-title')).toHaveText('Export Bibliography')
    await expect(page.getByTestId('export-format-selector')).toBeVisible()
  })

  test('opens export modal from library page', async ({ page }) => {
    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const exportButton = page.getByRole('button', { name: 'Export' }).first()
    await expect(exportButton).toBeVisible({ timeout: 5000 })
    await exportButton.click()

    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByTestId('export-format-selector')).toBeVisible()
  })
})

test.describe('Export Modal - Format selection and options', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndLogin(page)
    await page.goto('/app')
    await page.getByTestId('dashboard-quick-action-export').scrollIntoViewIfNeeded()
    await page.getByTestId('dashboard-quick-action-export').click()
    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })
  })

  test('defaults to Excel format with preset selector', async ({ page }) => {
    await expect(page.getByTestId('export-format-excel')).toBeVisible()
    await expect(page.getByText('Preset')).toBeVisible({ timeout: 5000 })
  })

  test('switching to PDF shows document options', async ({ page }) => {
    await page.getByTestId('export-format-pdf').click()

    await expect(page.getByTestId('export-pdf-options')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText('Paper Size')).toBeVisible()
    await expect(page.getByText('Font Size')).toBeVisible()
    await expect(page.getByText('Line Spacing')).toBeVisible()
    await expect(page.getByText('Sort By')).toBeVisible()
    await expect(page.getByTestId('export-pdf-checkboxes')).toBeVisible()
    await expect(page.getByText('Include annotations')).toBeVisible()
    await expect(page.getByText('Include title page')).toBeVisible()
    await expect(page.getByText('Include page numbers')).toBeVisible()
  })

  test('switching to DOCX shows same document options as PDF', async ({ page }) => {
    await page.getByTestId('export-format-docx').click()

    await expect(page.getByTestId('export-pdf-options')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText('Paper Size')).toBeVisible()
    await expect(page.getByText('Font Size')).toBeVisible()
  })

  test('switching to BibTeX shows info alert', async ({ page }) => {
    await page.getByTestId('export-format-bibtex').click()

    await expect(page.getByTestId('export-bibtex-info')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText('BibTeX Export')).toBeVisible()
    await expect(page.getByText(/compatible with LaTeX/)).toBeVisible()
  })

  test('switching between all formats preserves modal state', async ({ page }) => {
    await page.getByTestId('export-format-pdf').click()
    await expect(page.getByTestId('export-pdf-options')).toBeVisible({
      timeout: 5000,
    })

    await page.getByTestId('export-format-bibtex').click()
    await expect(page.getByTestId('export-bibtex-info')).toBeVisible({
      timeout: 5000,
    })

    await page.getByTestId('export-format-excel').click()
    await expect(page.getByText('Preset')).toBeVisible({ timeout: 5000 })

    await page.getByTestId('export-format-docx').click()
    await expect(page.getByTestId('export-pdf-options')).toBeVisible({
      timeout: 5000,
    })
  })

  test('cancel button closes the modal', async ({ page }) => {
    await page.getByTestId('export-cancel-btn').click()
    await expect(page.getByTestId('export-modal-title')).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('close button closes the modal', async ({ page }) => {
    await page.getByTestId('export-modal-close').click()
    await expect(page.getByTestId('export-modal-title')).not.toBeVisible({
      timeout: 5000,
    })
  })

  test('PDF and DOCX show tier restriction for free users', async ({ page }) => {
    await page.getByTestId('export-format-pdf').click()
    await expect(page.getByTestId('export-tier-warning')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText('Paid plan required')).toBeVisible()
    await expect(page.getByTestId('export-submit-btn')).toBeDisabled()
  })

  test('BibTeX does not show tier restriction for free users', async ({ page }) => {
    await page.getByTestId('export-format-bibtex').click()
    await expect(page.getByTestId('export-tier-warning')).not.toBeVisible()
    await expect(page.getByTestId('export-submit-btn')).toBeEnabled()
  })

  test('Excel does not show tier restriction for free users', async ({ page }) => {
    await expect(page.getByTestId('export-tier-warning')).not.toBeVisible()
    await expect(page.getByTestId('export-submit-btn')).toBeEnabled()
  })

  test('entry count displays correctly when no entries selected', async ({ page }) => {
    await expect(page.getByTestId('export-entry-count')).toContainText('All library entries')
  })
})

test.describe('Export Modal - Preview panel', () => {
  test('PDF format shows preview panel with bibliography content', async ({ page }) => {
    await signUpAndLogin(page)

    const entryTitle = `Preview Test Entry ${Date.now()}`
    await createTestEntry(page, entryTitle)

    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const exportButton = page.getByRole('button', { name: 'Export' }).first()
    await exportButton.click()
    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })

    await page.getByTestId('export-format-pdf').click()

    await expect(page.getByTestId('export-preview-panel')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText('Preview')).toBeVisible()
    await expect(page.getByTestId('export-preview-iframe')).toBeVisible({
      timeout: 10000,
    })
  })

  test('DOCX format shows preview panel', async ({ page }) => {
    await signUpAndLogin(page)

    await page.goto('/app')
    await page.getByTestId('dashboard-quick-action-export').scrollIntoViewIfNeeded()
    await page.getByTestId('dashboard-quick-action-export').click()
    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })

    await page.getByTestId('export-format-docx').click()
    await expect(page.getByTestId('export-preview-panel')).toBeVisible({
      timeout: 5000,
    })
  })

  test('preview panel is hidden for Excel format', async ({ page }) => {
    await signUpAndLogin(page)

    await page.goto('/app')
    await page.getByTestId('dashboard-quick-action-export').scrollIntoViewIfNeeded()
    await page.getByTestId('dashboard-quick-action-export').click()
    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })

    await expect(page.getByTestId('export-preview-panel')).not.toBeVisible()
  })

  test('preview panel is hidden for BibTeX format', async ({ page }) => {
    await signUpAndLogin(page)

    await page.goto('/app')
    await page.getByTestId('dashboard-quick-action-export').scrollIntoViewIfNeeded()
    await page.getByTestId('dashboard-quick-action-export').click()
    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })

    await page.getByTestId('export-format-bibtex').click()
    await expect(page.getByTestId('export-preview-panel')).not.toBeVisible()
  })
})

test.describe('Export Modal - BibTeX export flow', () => {
  test('exports BibTeX file with entries', async ({ page }) => {
    await signUpAndLogin(page)

    const entryTitle = `BibTeX Test Entry ${Date.now()}`
    await createTestEntry(page, entryTitle)

    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const exportButton = page.getByRole('button', { name: 'Export' }).first()
    await exportButton.click()
    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })

    await page.getByTestId('export-format-bibtex').click()
    await expect(page.getByTestId('export-bibtex-info')).toBeVisible({
      timeout: 5000,
    })

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByTestId('export-submit-btn').click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^bibliography-\d+\.bib$/)
  })
})

test.describe('Export Modal - Excel export flow', () => {
  test('exports Excel file with entries', async ({ page }) => {
    await signUpAndLogin(page)

    const entryTitle = `Excel Test Entry ${Date.now()}`
    await createTestEntry(page, entryTitle)

    await page.goto('/app/library')
    await page.waitForLoadState('networkidle')

    const exportButton = page.getByRole('button', { name: 'Export' }).first()
    await exportButton.click()
    await expect(page.getByTestId('export-modal-title')).toBeVisible({
      timeout: 10000,
    })

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    await page.getByTestId('export-submit-btn').click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^bibliography-\d+\.xlsx$/)
  })
})
