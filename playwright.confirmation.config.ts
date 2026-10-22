import { defineConfig, devices } from "@playwright/test";
// Fully synthetic: intentionally does not use global-setup or the demo database reset.
export default defineConfig({
  testDir: "./tests", testMatch: "assignment-confirmation-preview.spec.ts", reporter: "list", workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3312", viewport: { width: 1280, height: 1000 } },
  webServer: { command: "corepack yarn start --host 127.0.0.1 --port 3312", url: "http://127.0.0.1:3312", reuseExistingServer: true, timeout: 90000 }
});
