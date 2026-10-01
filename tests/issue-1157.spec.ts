import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1157: saving the Announcement Bar never cleared B1App's cache, so the public site showed the old banner.
test("saving announcement and widgets clears the public site cache", async ({ page }) => {
  const revalidated: string[] = [];
  await page.route("**/api/revalidate/**", async (route) => {
    revalidated.push(route.request().url());
    await route.fulfill({ status: 200, body: "{}" });
  });

  await page.goto("/site/appearance");
  const banner = page.locator('[data-testid="banner-enabled-checkbox"] input');
  await expect(banner).toBeVisible({ timeout: 15000 });
  if (!(await banner.isChecked())) await banner.check();

  const saved = page.waitForResponse((r) => r.url().endsWith("/settings") && r.request().method() === "POST");
  await page.locator('[data-testid="site-widgets-save"]').click();
  await saved;

  await expect.poll(() => revalidated.length, { timeout: 5000 }).toBeGreaterThan(0);
  expect(revalidated[0]).toMatch(/\/api\/revalidate\/[^/]+$/);
});
