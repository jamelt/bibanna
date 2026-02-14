import { test, expect, type Page } from '@playwright/test'

/**
 * Environment diagnostic tests — run against any deployed (or local) instance.
 *
 * Uses Playwright's baseURL, which is set from the BASE_URL env var
 * (falls back to http://localhost:3000 when unset).
 *
 * Examples:
 *   BASE_URL=https://staging.annobib.com  pnpm test:e2e --project=chromium tests/e2e/diagnostic.spec.ts
 *   BASE_URL=https://annobib.com          pnpm test:e2e --project=chromium tests/e2e/diagnostic.spec.ts
 *   pnpm test:e2e --project=chromium tests/e2e/diagnostic.spec.ts   # → localhost:3000
 */

const ENV_LABEL = process.env.BASE_URL || 'localhost'

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ConsoleEntry {
  type: string
  text: string
}

interface NetworkError {
  url: string
  status: number
  statusText: string
  body: string
}

function attachConsoleCollector(page: Page): ConsoleEntry[] {
  const messages: ConsoleEntry[] = []
  page.on('console', (msg) => {
    messages.push({ type: msg.type(), text: msg.text() })
  })
  return messages
}

function collectFailedResponses(page: Page): NetworkError[] {
  const errors: NetworkError[] = []
  page.on('response', async (res) => {
    if (res.status() >= 400) {
      const body = await res.text().catch(() => '<unreadable>')
      errors.push({
        url: res.url(),
        status: res.status(),
        statusText: res.statusText(),
        body: body.slice(0, 500),
      })
    }
  })
  return errors
}

function dumpDiagnostics(
  label: string,
  consoleMessages: ConsoleEntry[],
  networkErrors: NetworkError[],
) {
  if (networkErrors.length > 0) {
    console.log(`\n── ${label}: Network errors (${networkErrors.length}) ──`)
    for (const e of networkErrors) {
      console.log(`  ${e.status} ${e.statusText} ${e.url}`)
      if (e.body) console.log(`    body: ${e.body.slice(0, 200)}`)
    }
  }
  const warns = consoleMessages.filter((m) => m.type === 'error' || m.type === 'warning')
  if (warns.length > 0) {
    console.log(`\n── ${label}: Console errors/warnings (${warns.length}) ──`)
    for (const m of warns) {
      console.log(`  [${m.type}] ${m.text.slice(0, 300)}`)
    }
  }
}

// ─── 1. Infrastructure health ───────────────────────────────────────────────

test.describe(`[${ENV_LABEL}] Infrastructure Health`, () => {
  test('landing page returns 200 and serves HTML', async ({ page }) => {
    const consoleMessages = attachConsoleCollector(page)
    const networkErrors = collectFailedResponses(page)

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)

    const contentType = response!.headers()['content-type'] || ''
    expect(contentType).toContain('text/html')

    await expect(page.locator('body')).toBeVisible()

    dumpDiagnostics('landing', consoleMessages, networkErrors)
    expect(networkErrors.filter((e) => e.url.includes('/_nuxt/'))).toHaveLength(0)
  })

  test('static assets (_nuxt chunks) load without errors', async ({ page }) => {
    const failedAssets: string[] = []

    page.on('response', (res) => {
      if (res.url().includes('/_nuxt/') && res.status() >= 400) {
        failedAssets.push(`${res.status()} ${res.url()}`)
      }
    })

    await page.goto('/', { waitUntil: 'networkidle' })

    if (failedAssets.length > 0) {
      console.log('\n── Failed _nuxt assets ──')
      failedAssets.forEach((a) => console.log(`  ${a}`))
    }
    expect(failedAssets).toHaveLength(0)
  })

  test('API health — unauthenticated endpoint responds', async ({ request }) => {
    const res = await request.get('/')
    expect(res.status()).toBe(200)
  })
})

// ─── 2. Authentication flow ─────────────────────────────────────────────────

test.describe(`[${ENV_LABEL}] Auth Flow`, () => {
  const testUser = {
    name: 'Diag Test User',
    email: `diag-${Date.now()}@example.com`,
    password: 'DiagTest123!',
  }

  test('signup → dashboard → logout → login → dashboard', async ({ page, baseURL }) => {
    const consoleMessages = attachConsoleCollector(page)
    const networkErrors = collectFailedResponses(page)

    // ── Signup ──
    await test.step('load signup page', async () => {
      await page.goto('/signup', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible({
        timeout: 15000,
      })
    })

    await test.step('fill and submit signup form', async () => {
      await page.getByPlaceholder('Your name').fill(testUser.name)
      await page.getByPlaceholder('you@example.com').fill(testUser.email)
      await page.locator('input[type="password"]').first().fill(testUser.password)
      await page.locator('input[type="password"]').nth(1).fill(testUser.password)

      const [regResponse] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/auth/register'), { timeout: 20000 }),
        page.getByRole('button', { name: 'Create Account' }).click(),
      ])

      console.log(`Register response: ${regResponse.status()} ${regResponse.statusText()}`)
      if (!regResponse.ok()) {
        const body = await regResponse.text().catch(() => '<unreadable>')
        console.log(`Register body: ${body}`)
      }
      expect(regResponse.ok()).toBe(true)
    })

    await test.step('arrive at dashboard after signup', async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')

      const nuxtErrors = networkErrors.filter((e) => e.url.includes('/_nuxt/'))
      if (nuxtErrors.length > 0) {
        console.log(`\n── _nuxt errors after signup redirect (${nuxtErrors.length}) ──`)
        nuxtErrors.forEach((e) => console.log(`  ${e.status} ${e.url}`))
      }

      await page.screenshot({ path: '.output/test-results/diag-after-signup.png' })

      await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({
        timeout: 15000,
      })
    })

    dumpDiagnostics('signup-flow', consoleMessages, networkErrors)

    // ── Logout ──
    await test.step('logout', async () => {
      await page.request.post('/api/auth/logout')
      await page.goto('/login', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible()
    })

    consoleMessages.length = 0
    networkErrors.length = 0

    // ── Login ──
    await test.step('login with created account', async () => {
      await page.getByPlaceholder('you@example.com').fill(testUser.email)
      await page.locator('input[type="password"]').fill(testUser.password)

      const [loginResponse] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 15000 }),
        page.getByRole('button', { name: 'Sign in' }).click(),
      ])

      console.log(`Login response: ${loginResponse.status()} ${loginResponse.statusText()}`)
      if (!loginResponse.ok()) {
        const body = await loginResponse.text().catch(() => '<unreadable>')
        console.log(`Login body: ${body}`)
      }
      expect(loginResponse.ok()).toBe(true)
    })

    await test.step('arrive at dashboard after login', async () => {
      await expect(page).toHaveURL(/\/app/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')

      await page.screenshot({ path: '.output/test-results/diag-after-login.png' })

      await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({
        timeout: 15000,
      })
    })

    dumpDiagnostics('login-flow', consoleMessages, networkErrors)
  })
})

// ─── 3. Authenticated API & page health ─────────────────────────────────────

test.describe.serial(`[${ENV_LABEL}] Authenticated App Health`, () => {
  const testUser = {
    name: 'API Health User',
    email: `diag-api-${Date.now()}@example.com`,
    password: 'DiagTest123!',
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/signup', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Your name').fill(testUser.name)
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    const [regResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/register'), { timeout: 20000 }),
      page.getByRole('button', { name: 'Create Account' }).click(),
    ])

    if (!regResponse.ok()) {
      const body = await regResponse.text().catch(() => '<unreadable>')
      console.log(`[beforeAll] Register failed: ${regResponse.status()} - ${body}`)
    }

    await expect(page).toHaveURL(/\/app/, { timeout: 15000 })
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    await page.getByRole('button', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
  })

  test('GET /api/tags returns 200', async ({ page }) => {
    const res = await page.request.get('/api/tags')
    console.log(`GET /api/tags → ${res.status()}`)
    if (!res.ok()) {
      const body = await res.text().catch(() => '')
      console.log(`  body: ${body.slice(0, 500)}`)
    }
    expect(res.ok()).toBe(true)
  })

  test('GET /api/entries returns 200', async ({ page }) => {
    const res = await page.request.get('/api/entries')
    console.log(`GET /api/entries → ${res.status()}`)
    if (!res.ok()) {
      const body = await res.text().catch(() => '')
      console.log(`  body: ${body.slice(0, 500)}`)
    }
    expect(res.ok()).toBe(true)
  })

  test('GET /api/projects returns 200', async ({ page }) => {
    const res = await page.request.get('/api/projects')
    console.log(`GET /api/projects → ${res.status()}`)
    if (!res.ok()) {
      const body = await res.text().catch(() => '')
      console.log(`  body: ${body.slice(0, 500)}`)
    }
    expect(res.ok()).toBe(true)
  })

  test('GET /api/projects/starred returns 200', async ({ page }) => {
    const res = await page.request.get('/api/projects/starred')
    console.log(`GET /api/projects/starred → ${res.status()}`)
    if (!res.ok()) {
      const body = await res.text().catch(() => '')
      console.log(`  body: ${body.slice(0, 500)}`)
    }
    expect(res.ok()).toBe(true)
  })

  test('library page loads without JS errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/app/library', { waitUntil: 'networkidle' })
    await page.screenshot({ path: '.output/test-results/diag-library.png' })

    await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible({
      timeout: 10000,
    })

    if (consoleErrors.length > 0) {
      console.log(`\n── Library page console errors ──`)
      consoleErrors.forEach((e) => console.log(`  ${e.slice(0, 300)}`))
    }
  })

  test('tags page loads without JS errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/app/tags', { waitUntil: 'networkidle' })
    await page.screenshot({ path: '.output/test-results/diag-tags.png' })

    await expect(page.getByRole('heading', { name: 'Tags', exact: true })).toBeVisible({
      timeout: 10000,
    })

    if (consoleErrors.length > 0) {
      console.log(`\n── Tags page console errors ──`)
      consoleErrors.forEach((e) => console.log(`  ${e.slice(0, 300)}`))
    }
  })

  test('projects page loads without JS errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/app/projects', { waitUntil: 'networkidle' })
    await page.screenshot({ path: '.output/test-results/diag-projects.png' })

    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible({
      timeout: 10000,
    })

    if (consoleErrors.length > 0) {
      console.log(`\n── Projects page console errors ──`)
      consoleErrors.forEach((e) => console.log(`  ${e.slice(0, 300)}`))
    }
  })

  test('settings page loads without JS errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/app/settings', { waitUntil: 'networkidle' })
    await page.screenshot({ path: '.output/test-results/diag-settings.png' })

    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({ timeout: 10000 })

    if (consoleErrors.length > 0) {
      console.log(`\n── Settings page console errors ──`)
      consoleErrors.forEach((e) => console.log(`  ${e.slice(0, 300)}`))
    }
  })
})
