import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(__dirname, "tests", ".auth-state.json");

const baseURL = process.env.BASE_URL || "http://localhost:3101";
const apiBase = process.env.API_BASE || "http://localhost:8084";
const messagingSocket = process.env.REACT_APP_MESSAGING_API_SOCKET || "ws://localhost:8087";
// Tests run against a production build served statically: a fresh page load is ~40 requests instead of the
// ~240 unbundled modules the Vite dev server sends, and every test starts with one (login + section nav).
// Measured 2026-11-13: the full suite went from 66 min to about 21. It is the production bundle; the two
// test-only differences (MUI icon data-testids kept, tests/fixtures pages built in) live in vite.config.ts, and
// tests/setup/serve.json keeps cleanUrls off so the fixture pages are reachable.
// Set PW_DEV_SERVER=1 to debug against `npm start`; only then is a server already on the port reused, so a
// Vite dev server left running by the demo stack fails the run loudly instead of silently slowing it down.
const useDevServer = !!process.env.PW_DEV_SERVER;

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // Single retry absorbs element re-render during click.
  retries: process.env.CI ? 1 : 1,
  // Cap workers to avoid dev server/DB overload; matches B1App.
  workers: process.env.CI ? 2 : 4,
  reporter: "list",
  timeout: 60 * 1000,
  expect: { timeout: 5 * 1000 },

  globalSetup: "./tests/global-setup.ts",

  use: {
    baseURL,
    storageState: STORAGE_STATE_PATH,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Video is off: recording every test cost about a core of ffmpeg on a 4-core box; screenshots and the
    // first-retry trace are what failure triage reads.
    video: "off",
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000
  },

  // LessonsApi (port 8090) must be started manually; not in webServer to avoid failure for local setups without it.
  webServer: [
    {
      command: "npm --prefix ../Api run dev",
      url: `${apiBase}/health`,
      reuseExistingServer: true,
      timeout: 60 * 1000,
      stdout: "pipe",
      stderr: "pipe"
    },
    {
      command: useDevServer ? "npm start" : "npm run build:test && npm run serve:test",
      // Force dev stage to use localhost URLs; messaging socket to local Api's WS.
      env: {
        PORT: new URL(baseURL).port || "3101",
        REACT_APP_STAGE: "dev",
        REACT_APP_API_BASE: apiBase,
        REACT_APP_MESSAGING_API_SOCKET: messagingSocket
      },
      url: baseURL,
      reuseExistingServer: useDevServer,
      timeout: (useDevServer ? 120 : 300) * 1000
    }
  ],

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true
      },
      fullyParallel: true
    }
  ]
});
