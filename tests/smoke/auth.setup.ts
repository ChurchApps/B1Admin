import { test as setup, expect } from "@playwright/test";
import { SMOKE_STATE } from "./env";

setup("log in with the smoke account", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', process.env.SMOKE_EMAIL!);
  await page.fill('input[type="password"]', process.env.SMOKE_PASSWORD!);
  await page.click('button[type="submit"]');

  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 30000 }),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 })
  ]);
  if (await churchDialog.isVisible()) {
    const church = process.env.SMOKE_CHURCH;
    const choice = church ? churchDialog.locator("h3", { hasText: church }) : churchDialog.locator("h3");
    await choice.first().click();
  }

  await expect(page.getByTestId("command-palette-open")).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: SMOKE_STATE });
});
