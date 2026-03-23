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

  const emailInput = page.locator('input[type="email"]');

  // Wait for login form
  await emailInput.waitFor({ state: "visible", timeout: 15000 });

  await page.fill('input[type="email"]', "demo@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  // After submit, the login form stays mounted while the church selection dialog is shown.
  // SelectChurchModal always appears on a fresh session (no lastChurchId cookie).
  // Wait for either: church selection dialog OR navigation away from /login.
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {}),
  ]);

  // Handle church selection dialog if present
  const dialogVisible = await churchDialog.isVisible().catch(() => false);
  if (dialogVisible) {
    const graceChurch = page
      .locator('[role="dialog"] h3:has-text("Grace Community Church")')
      .first()
      .or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }

  // Save authenticated state
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
export { STORAGE_STATE_PATH };
