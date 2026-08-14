import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/ocr',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 180_000,
  reporter: 'list',
  outputDir: 'test-results/ocr',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
    ...devices['Desktop Chrome'],
  },
})
