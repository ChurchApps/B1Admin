import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(__dirname, 'tests', '.auth-state.json');

const baseURL = process.env.BASE_URL || 'http://localhost:3101';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : '75%',
  reporter: 'list',
  timeout: 60 * 1000,
  expect: { timeout: 5 * 1000 },

  globalSetup: './tests/global-setup.ts',

  use: {
    baseURL,
    storageState: STORAGE_STATE_PATH,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },

  // Note: serving-lessons.spec also exercises LessonsApi (port 8090).
  // LessonsApi is not launched here; if you run that spec you must start it yourself.
  // Adding it to webServer would fail the run for anyone who hasn't set up LessonsApi locally.
  webServer: [
    {
      command: 'npm --prefix ../Api run dev',
      url: 'http://localhost:8084/health',
      reuseExistingServer: true,
      timeout: 60 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm start',
      url: 'http://localhost:3101',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],

  projects: [
    {
      name: 'settings',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
      testMatch: /settings\.spec\.ts/,
      fullyParallel: false,
    },
    {
      // Files run in parallel across workers. Chains of dependent tests
      // (create→edit→delete of the same entity) are wrapped in test.describe.serial(...)
      // within each spec; everything else can interleave.
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
      testIgnore: /settings\.spec\.ts/,
      fullyParallel: true,
    },
  ],
});
