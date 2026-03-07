import type { Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/");

  const emailInput = page.locator('input[type="email"]');
  const navButton = page.locator("#site-header");
  const churchDialog = page.locator("text=Select a Church");

  // Race navButton (already authenticated via storageState) against emailInput
  // (login form visible). Avoids false-positive isLoginPage checks caused by
  // React briefly rendering the login form before reading the stored JWT.
  const initial = await Promise.race([
    navButton.waitFor({ state: "visible", timeout: 10000 }).then(() => "nav" as const),
    emailInput.waitFor({ state: "visible", timeout: 10000 }).then(() => "login" as const),
  ]);

  if (initial === "nav") return;

  // Full login flow (storageState missing/expired or fresh context)
  await emailInput.fill("demo@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  // After submit: app either shows church selection dialog or goes straight to dashboard.
  const result = await Promise.race([
    navButton.waitFor({ state: "visible", timeout: 15000 }).then(() => "nav" as const),
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).then(() => "dialog" as const),
  ]);

  if (result === "dialog") {
    const graceChurch = page
      .locator('[role="dialog"] h3:has-text("Grace Community Church")')
      .first()
      .or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    await navButton.waitFor({ state: "visible", timeout: 10000 });
  }
}
