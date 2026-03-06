import type { Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/");
  // await page.waitForLoadState("networkidle");

  // If storageState already has a valid session, we land on
  // the dashboard (or any non-login page) immediately.
  const emailInput = page.locator('input[type="email"]');
  const isLoginPage = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);

  if (!isLoginPage) {
    // Already authenticated via storageState — just wait for nav
    await page.waitForSelector("#primaryNavButton", { state: "visible", timeout: 10000 });
    return;
  }

  // Full login flow (fallback if storageState is missing/expired)
  await emailInput.fill("demo@b1.church");
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
    const graceChurch = page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first().or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    await page.waitForSelector("#primaryNavButton", { state: "visible" });
  }
  // If result === "nav", we're already on the dashboard
}
