import { defineConfig, devices } from "@playwright/test";
import { SMOKE_STATE, hasCredentials } from "./tests/smoke/env";

// Post-deploy smoke: read-only checks against a deployed site.
//   SMOKE_BASE_URL=https://demo.b1.church SMOKE_EMAIL=… SMOKE_PASSWORD=… yarn test:smoke
// Without SMOKE_EMAIL/SMOKE_PASSWORD only the public checks run, unless SMOKE_REQUIRE_AUTH=1.
const baseURL = process.env.SMOKE_BASE_URL;
if (!baseURL) throw new Error("SMOKE_BASE_URL is required (e.g. https://demo.b1.church)");
// Smoke never runs against production: only demo and local hosts are allowed.
if (!/(^|\.)demo|^localhost$|\.localtest\.me$|^127\.0\.0\.1$/.test(new URL(baseURL).hostname)) {
  throw new Error(`SMOKE_BASE_URL ${baseURL} is not a demo or local host; smoke tests do not run against production`);
}
if (!hasCredentials && process.env.SMOKE_REQUIRE_AUTH) throw new Error("SMOKE_REQUIRE_AUTH is set but SMOKE_EMAIL/SMOKE_PASSWORD are not");
if (!hasCredentials) console.warn("smoke: SMOKE_EMAIL/SMOKE_PASSWORD not set; running public checks only");

const chrome = { ...devices["Desktop Chrome"], headless: true };

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 4,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  timeout: 60 * 1000,
  expect: { timeout: 15 * 1000 },
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", navigationTimeout: 30 * 1000 },
  projects: [
    { name: "public", testMatch: /public\.smoke\.ts/, use: chrome },
    ...(hasCredentials
      ? [
        { name: "setup", testMatch: /auth\.setup\.ts/, use: chrome },
        { name: "sections", testMatch: /sections\.smoke\.ts/, dependencies: ["setup"], use: { ...chrome, storageState: SMOKE_STATE } }
      ]
      : [])
  ]
});
