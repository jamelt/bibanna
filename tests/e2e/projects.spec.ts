import { test, expect } from '@playwright/test'

test.describe('Projects Flow', () => {
  const testUser = {
    name: 'E2E Project User',
    email: `e2e-project-${Date.now()}@example.com`,
    password: 'testpassword123',
  }

  test('creates a project and can open it immediately', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible()

    await page.getByPlaceholder('Your name').fill(testUser.name)
    await page.getByPlaceholder('you@example.com').fill(testUser.email)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page).toHaveURL('/app', { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 10000 })

    await page.getByRole('link', { name: 'Projects' }).first().click()
    await expect(page).toHaveURL(/\/app\/projects/)
    await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible()

    const openModalButton = page.getByRole('button', { name: /New Project|Create Project/i }).first()
    await openModalButton.click()

    const nameField = page.getByTestId('project-modal-name')
    await expect(nameField).toBeVisible()

    const projectName = `Test Project ${Date.now()}`

    await nameField.fill(projectName)
    await page.getByPlaceholder('What is this project about?').fill('Created from e2e test')

    const createButton = page.getByTestId('project-modal-submit')
    await createButton.click()

    await expect(nameField).toBeHidden({ timeout: 10000 })
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 })

    const projectCard = page.locator('.group', { hasText: projectName }).first()
    await expect(projectCard).toBeVisible()
    await projectCard.click()

    await page.waitForURL(/\/app\/projects\/.+/, { timeout: 10000 })
    
    const currentUrl = page.url()
    console.log('Navigated to project URL:', currentUrl)

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 15000 })
    
    await expect(page.locator('text=Project not found')).not.toBeVisible()
    await expect(page.locator('text=0 entries')).toBeVisible()
  })

  test('creates project and accesses via direct URL with slug', async ({ page, context }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    const uniqueEmail = `e2e-slug-${Date.now()}@example.com`
    await page.getByPlaceholder('Your name').fill('Slug Test User')
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })

    await page.goto('/app/projects')
    await page.getByRole('button', { name: /New Project|Create Project/i }).first().click()

    const projectName = `Slug Test ${Date.now()}`
    await page.getByTestId('project-modal-name').fill(projectName)
    await page.getByTestId('project-modal-submit').click()

    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 })

    const projectCard = page.locator('.group', { hasText: projectName }).first()
    await projectCard.click()

    await page.waitForURL(/\/app\/projects\/.+/, { timeout: 10000 })
    const projectUrl = page.url()
    const projectSlugOrId = projectUrl.split('/projects/')[1]

    console.log('Project accessed via:', projectSlugOrId)

    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 15000 })

    await page.reload()
    await page.waitForLoadState('networkidle')
    
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Project not found')).not.toBeVisible()
  })

  test('creates project and tests all API operations with slug', async ({ page, request }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    const uniqueEmail = `e2e-api-${Date.now()}@example.com`
    await page.getByPlaceholder('Your name').fill('API Test User')
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })

    const cookies = await page.context().cookies()

    await page.goto('/app/projects')
    await page.getByRole('button', { name: /New Project|Create Project/i }).first().click()

    const projectName = `API Operations ${Date.now()}`
    await page.getByTestId('project-modal-name').fill(projectName)
    await page.getByTestId('project-modal-submit').click()

    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 })

    const projectCard = page.locator('.group', { hasText: projectName }).first()
    await projectCard.click()

    await page.waitForURL(/\/app\/projects\/.+/, { timeout: 10000 })
    const projectUrl = page.url()
    const projectSlugOrId = projectUrl.split('/projects/')[1]

    console.log('Testing API operations with:', projectSlugOrId)

    const baseURL = new URL(page.url()).origin

    const getResponse = await request.get(`${baseURL}/api/projects/${projectSlugOrId}`, {
      headers: {
        cookie: cookies.map(c => `${c.name}=${c.value}`).join('; '),
      },
    })
    expect(getResponse.ok()).toBeTruthy()
    const projectData = await getResponse.json()
    expect(projectData.name).toBe(projectName)

    const updateResponse = await request.put(`${baseURL}/api/projects/${projectSlugOrId}`, {
      headers: {
        cookie: cookies.map(c => `${c.name}=${c.value}`).join('; '),
        'content-type': 'application/json',
      },
      data: {
        description: 'Updated via API test',
      },
    })
    expect(updateResponse.ok()).toBeTruthy()

    await page.reload()
    await expect(page.locator('text=Updated via API test')).toBeVisible({ timeout: 10000 })
  })

  test('creates project from dashboard and opens it', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')

    const uniqueEmail = `e2e-dash-${Date.now()}@example.com`
    await page.getByPlaceholder('Your name').fill('Dashboard Test')
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail)
    await page.locator('input[type="password"]').first().fill(testUser.password)
    await page.locator('input[type="password"]').nth(1).fill(testUser.password)

    await page.getByRole('button', { name: 'Create Account' }).click()
    await expect(page).toHaveURL('/app', { timeout: 10000 })

    await page.getByTestId('dashboard-quick-action-new-project').click()

    const projectName = `Dashboard Project ${Date.now()}`
    await page.getByTestId('project-modal-name').fill(projectName)
    await page.getByTestId('project-modal-submit').click()

    await page.goto('/app/projects')
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 })

    const projectCard = page.locator('.group', { hasText: projectName }).first()
    await projectCard.click()

    await page.waitForURL(/\/app\/projects\/.+/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Project not found')).not.toBeVisible()
  })
})

