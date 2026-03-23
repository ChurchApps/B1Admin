import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(__dirname, 'tests', '.auth-state.json');

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  timeout: 60 * 1000,
  expect: { timeout: 5 * 1000 },

  globalSetup: './tests/global-setup.ts',

  use: {
    baseURL: process.env.BASE_URL || 'https://demo.b1.church',
    storageState: STORAGE_STATE_PATH,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  projects: [
    // Settings must run first — it renames the church, which website tests depend on
    {
      name: 'settings',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
      testMatch: /settings\.spec\.ts/,
    },
    // All other tests run in parallel after settings completes
    {
      name: 'chromium',
      dependencies: ['settings'],
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
      testIgnore: /settings\.spec\.ts/,
    },
  ],
});
