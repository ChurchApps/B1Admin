import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(__dirname, ".auth-state.json");

/**
 * Global setup: log in once as demo@b1.church and save the browser
 * storage state (cookies + localStorage) so every test worker can
 * reuse it instead of logging in again.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || process.env.BASE_URL || "http://localhost:3101";

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login flow
  await page.goto(baseURL + "/");
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"]', "demo@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  // After login, either "Select a Church" dialog appears (multiple churches)
  // or the app auto-selects via lastChurchId cookie and redirects directly.
  const churchDialog = page.locator("text=Select a Church");
  const navButton = page.locator("#primaryNavButton");
  const result = await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).then(() => "dialog" as const),
    navButton.waitFor({ state: "visible", timeout: 15000 }).then(() => "nav" as const),
  ]);

  if (result === "dialog") {
    const graceChurch = page
      .locator('[role="dialog"] h3:has-text("Grace Community Church")')
      .first()
      .or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    await page.waitForSelector("#primaryNavButton", { state: "visible" });
  }
  // If result === "nav", we're already on the dashboard

  // Save authenticated state
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
export { STORAGE_STATE_PATH };
