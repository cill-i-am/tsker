import { defineConfig } from '@playwright/test'

const webUrl = 'http://app.localtest.me:3000'
const apiUrl = 'http://api.localtest.me:3002'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm run e2e:start:api',
      url: `${apiUrl}/up`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        APP_ENV: process.env.APP_ENV ?? 'local',
        PORT: process.env.PORT ?? '3002',
        DATABASE_URL:
          process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/tsker',
        BETTER_AUTH_SECRET:
          process.env.BETTER_AUTH_SECRET ??
          'test-secret-test-secret-test-secret!',
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? apiUrl,
        AUTH_TRUSTED_ORIGINS:
          process.env.AUTH_TRUSTED_ORIGINS ?? webUrl,
        AUTH_COOKIE_DOMAIN:
          process.env.AUTH_COOKIE_DOMAIN ?? '.localtest.me',
      },
    },
    {
      command: 'pnpm run e2e:start:web',
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        VITE_API_URL: process.env.VITE_API_URL ?? apiUrl,
      },
    },
  ],
})
