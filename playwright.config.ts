import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for the take-home API tests.
 *
 * `webServer` auto-starts the Reminders API before the tests run, so you can
 * simply run `npm test`. If you already have the API running (`npm run api`),
 * Playwright reuses it.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  webServer: {
    command: 'npm run api',
    url: 'http://localhost:3000/health',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
