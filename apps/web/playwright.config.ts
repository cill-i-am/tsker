import { defineConfig } from "@playwright/test";

const webUrl = "http://app.localhost:3000";
const apiUrl = "http://api.localhost:3002";

export default defineConfig({
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  retries: process.env.CI ? 2 : 0,
  testDir: "./e2e",
  use: {
    baseURL: webUrl,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm run e2e:start:api",
      env: {
        APP_ENV: process.env.APP_ENV ?? "local",
        AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN ?? "localhost",
        AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS ?? webUrl,
        BETTER_AUTH_SECRET:
          process.env.BETTER_AUTH_SECRET ?? "test-secret-test-secret-test-secret!",
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? apiUrl,
        DATABASE_URL:
          process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/tsker",
        PORT: process.env.PORT ?? "3002",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      url: `${apiUrl}/up`,
    },
    {
      command: "pnpm run e2e:start:web",
      env: {
        VITE_API_URL: process.env.VITE_API_URL ?? apiUrl,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      url: webUrl,
    },
  ],
});
