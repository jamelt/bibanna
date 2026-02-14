import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.{test,spec}.{js,ts}', 'tests/integration/**/*.{test,spec}.{js,ts}'],
    alias: {
      '~/server': fileURLToPath(new URL('./server', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '#imports': fileURLToPath(new URL('./.nuxt/imports.d.ts', import.meta.url)),
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './.output/coverage',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'app/composables/**/*.ts', 'app/utils/**/*.ts'],
      exclude: ['node_modules', 'tests', '.nuxt', '.output'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
})
