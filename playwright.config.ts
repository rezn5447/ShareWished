import { defineConfig, devices } from '@playwright/test'
import './e2e/support/env'

// Own port, so a `npm run dev` on :3000 is left alone.
const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * End-to-end tests against the real app, Clerk dev instance and Supabase
 * project from .env.local. See e2e/README.md.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Supabase and Clerk are remote, and `next dev` compiles routes on first hit.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      // Mobile-first app, so test at phone size.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // A production build: `next dev` compiles each route on first hit, which
        // under parallel tests is slow enough to time out steps. E2E_DEV=1 trades
        // that for a faster start while writing tests.
        command: process.env.E2E_DEV
          ? `npm run dev -- -p ${PORT}`
          : `npm run build && npm run start -- -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
