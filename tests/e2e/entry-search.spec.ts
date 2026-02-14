import { test, expect, type Page } from '@playwright/test'

async function signUp(page: Page, testId: string): Promise<void> {
  const uniqueId = `${testId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const email = `search-${uniqueId}@example.com`

  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Name').fill('Search Test User')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill('testpassword123')
    await page.getByLabel('Confirm Password').fill('testpassword123')
    await page.getByRole('button', { name: 'Create Account' }).click()

    try {
      await expect(page).toHaveURL(/\/app/, { timeout: 10000 })
      return
    } catch {
      // Rate limited or other error, wait and retry
      await page.waitForTimeout(3000 * (attempt + 1))
    }
  }

  // Final attempt with longer timeout
  await page.goto('/signup')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Name').fill('Search Test User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('testpassword123')
  await page.getByLabel('Confirm Password').fill('testpassword123')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/app/, { timeout: 15000 })
}

async function createEntry(page: Page, title: string): Promise<void> {
  await page
    .getByRole('button', { name: /Add Entry/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: /Add Entry/i })).toBeVisible({ timeout: 5000 })
  const titleInput = page.getByLabel('Title')
  await titleInput.fill(title)
  await expect(titleInput).toHaveValue(title)
  await page.getByRole('button', { name: 'Add Entry' }).last().click()
  await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
}

test.describe('Entry Search', () => {
  test.setTimeout(90000)

  test.describe('Library search', () => {
    test('filters entries when typing in the search box', async ({ page }) => {
      await signUp(page, 'lib-filter')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await createEntry(page, 'Quantum Computing Advances')
      await createEntry(page, 'Machine Learning Review')
      await createEntry(page, 'Neural Network Architecture')

      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await expect(page.getByText('Quantum Computing Advances')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Machine Learning Review')).toBeVisible()
      await expect(page.getByText('Neural Network Architecture')).toBeVisible()

      const searchInput = page.getByPlaceholder('Search entries...')
      await searchInput.fill('Quantum')
      await page.waitForTimeout(2000)

      await expect(page.getByText('Quantum Computing Advances')).toBeVisible()
      await expect(page.getByText('Machine Learning Review')).not.toBeVisible()
      await expect(page.getByText('Neural Network Architecture')).not.toBeVisible()
    })

    test('shows all entries when search is cleared', async ({ page }) => {
      await signUp(page, 'lib-clear')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await createEntry(page, 'Alpha Paper')
      await createEntry(page, 'Beta Study')

      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('Alpha Paper')).toBeVisible({ timeout: 10000 })

      const searchInput = page.getByPlaceholder('Search entries...')
      await searchInput.fill('Alpha')
      await page.waitForTimeout(2000)
      await expect(page.getByText('Beta Study')).not.toBeVisible()

      await searchInput.fill('')
      await page.waitForTimeout(2000)
      await expect(page.getByText('Alpha Paper')).toBeVisible()
      await expect(page.getByText('Beta Study')).toBeVisible()
    })

    test('returns no results for non-matching query', async ({ page }) => {
      await signUp(page, 'lib-nomatch')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await createEntry(page, 'Some Research Paper')

      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText('Some Research Paper')).toBeVisible({ timeout: 10000 })

      const searchInput = page.getByPlaceholder('Search entries...')
      await searchInput.fill('xyznonexistent')
      await page.waitForTimeout(2000)
      await expect(page.getByText('Some Research Paper')).not.toBeVisible()
    })

    test('search works with URL query parameter', async ({ page }) => {
      await signUp(page, 'lib-url')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await createEntry(page, 'Unique Title Alpha')
      await createEntry(page, 'Different Title Beta')

      await page.goto('/app/library?q=Alpha')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      await expect(page.getByText('Unique Title Alpha')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Different Title Beta')).not.toBeVisible()
    })
  })

  test.describe('API search', () => {
    test('returns filtered results for search query', async ({ page }) => {
      await signUp(page, 'api-filter')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await createEntry(page, 'API Test Quantum Paper')
      await createEntry(page, 'API Test Machine Paper')

      const res = await page.request.get('/api/entries?q=Quantum')
      expect(res.ok()).toBe(true)
      const data = await res.json()
      expect(data.data.length).toBe(1)
      expect(data.data[0].title).toContain('Quantum')
    })

    test('returns all entries when no query is provided', async ({ page }) => {
      await signUp(page, 'api-all')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await createEntry(page, 'Full List Entry One')
      await createEntry(page, 'Full List Entry Two')

      const res = await page.request.get('/api/entries')
      expect(res.ok()).toBe(true)
      const data = await res.json()
      expect(data.data.length).toBe(2)
    })

    test('returns empty results for non-matching query', async ({ page }) => {
      await signUp(page, 'api-nomatch')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await createEntry(page, 'Existing Paper')

      const res = await page.request.get('/api/entries?q=NONEXISTENT_TERM')
      expect(res.ok()).toBe(true)
      const data = await res.json()
      expect(data.data.length).toBe(0)
    })

    test('searches by year', async ({ page }) => {
      await signUp(page, 'api-year')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      // Create entries with specific years via API
      await page.request.post('/api/entries?skipDedupe=true', {
        data: { title: 'Old Study', entryType: 'journal_article', year: 1999 },
      })
      await page.request.post('/api/entries?skipDedupe=true', {
        data: { title: 'Recent Study', entryType: 'journal_article', year: 2024 },
      })

      const res = await page.request.get('/api/entries?q=2024')
      expect(res.ok()).toBe(true)
      const data = await res.json()
      expect(data.data.length).toBe(1)
      expect(data.data[0].title).toBe('Recent Study')
    })

    test('searches by journal name', async ({ page }) => {
      await signUp(page, 'api-journal')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await page.request.post('/api/entries?skipDedupe=true', {
        data: {
          title: 'Nature Article',
          entryType: 'journal_article',
          metadata: { journal: 'Nature' },
        },
      })
      await page.request.post('/api/entries?skipDedupe=true', {
        data: {
          title: 'Science Article',
          entryType: 'journal_article',
          metadata: { journal: 'Science' },
        },
      })

      const res = await page.request.get('/api/entries?q=Nature')
      expect(res.ok()).toBe(true)
      const data = await res.json()
      expect(data.data.length).toBe(1)
      expect(data.data[0].title).toBe('Nature Article')
    })

    test('searches by editor and series', async ({ page }) => {
      await signUp(page, 'api-editor')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      await page.request.post('/api/entries?skipDedupe=true', {
        data: {
          title: 'Proceedings Paper',
          entryType: 'book',
          metadata: { editor: 'Johnson', series: 'Lecture Notes' },
        },
      })
      await page.request.post('/api/entries?skipDedupe=true', {
        data: { title: 'Unrelated Paper', entryType: 'book' },
      })

      const editorRes = await page.request.get('/api/entries?q=Johnson')
      expect(editorRes.ok()).toBe(true)
      const editorData = await editorRes.json()
      expect(editorData.data.length).toBe(1)
      expect(editorData.data[0].title).toBe('Proceedings Paper')

      const seriesRes = await page.request.get('/api/entries?q=Lecture')
      expect(seriesRes.ok()).toBe(true)
      const seriesData = await seriesRes.json()
      expect(seriesData.data.length).toBe(1)
      expect(seriesData.data[0].title).toBe('Proceedings Paper')
    })

    test('relevance scoring ranks title matches above metadata matches', async ({ page }) => {
      await signUp(page, 'api-relevance')
      await page.goto('/app/library')
      await page.waitForLoadState('networkidle')

      // Entry with "Quantum" only in the abstract
      await page.request.post('/api/entries?skipDedupe=true', {
        data: {
          title: 'Generic Physics Paper',
          entryType: 'journal_article',
          metadata: { abstract: 'This paper discusses quantum mechanics.' },
        },
      })
      // Entry with "Quantum" in the title
      await page.request.post('/api/entries?skipDedupe=true', {
        data: {
          title: 'Quantum Computing Breakthrough',
          entryType: 'journal_article',
        },
      })
      // Entry with "Quantum" in notes
      await page.request.post('/api/entries?skipDedupe=true', {
        data: {
          title: 'Another Physics Paper',
          entryType: 'journal_article',
          notes: 'Related to quantum research',
        },
      })

      const res = await page.request.get('/api/entries?q=Quantum')
      expect(res.ok()).toBe(true)
      const data = await res.json()
      expect(data.data.length).toBe(3)
      // Title match should be ranked first
      expect(data.data[0].title).toBe('Quantum Computing Breakthrough')
    })
  })
})
