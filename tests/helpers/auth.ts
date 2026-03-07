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

  // After submit: wait for login form to disappear (navigated away from /login).
  // Handles both direct-to-dashboard (single church) and church-selection dialog cases.
  await emailInput.waitFor({ state: "hidden", timeout: 15000 });

  // Handle optional church selection dialog (only appears with multiple churches)
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  const dialogVisible = await churchDialog
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);

  if (dialogVisible) {
    const graceChurch = page
      .locator('[role="dialog"] h3:has-text("Grace Community Church")')
      .first()
      .or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  }
}
