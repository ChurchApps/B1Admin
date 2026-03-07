import type { Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/");

  const emailInput = page.locator('input[type="email"]');

  // Check if login form is visible. If not, we're already authenticated.
  const needsLogin = await emailInput
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!needsLogin) return;

  // Full login flow
  await emailInput.fill("demo@b1.church");
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
}
