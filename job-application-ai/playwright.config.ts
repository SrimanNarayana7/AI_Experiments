import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration for the Job Application AI Copilot.
 *
 * The app runs in Docker Compose — web on :5173, api on :3001.
 * The Vite dev server proxies /api to the backend, so tests hit the
 * same origin as a real user.
 */
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 180_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});