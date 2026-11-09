import { test, expect } from "./fixtures";

test("login page renders and reaches the API", async ({ page }) => {
  const providers = page.waitForResponse((r) => /\/membership\/users\/sso\/providers/.test(r.url()), { timeout: 30000 });
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  expect((await providers).status()).toBeLessThan(400);
});
