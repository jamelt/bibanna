import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './.output/test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? '50%' : undefined,
  reporter: isCI
    ? [['list'], ['json', { outputFile: './.output/test-results/results.json' }]]
    : [['html', { outputFolder: './.output/playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isCI ? 'off' : 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'NODE_ENV=development pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !isCI,
        timeout: 120 * 1000,
        env: {
          NODE_ENV: 'development',
        },
      },
})
