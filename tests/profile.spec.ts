import { test as anonTest } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

test.describe("Profile", () => {
  test("the profile page offers linked accounts and the user menu offers the theme", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("Linked Accounts", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("delete-account-button")).toBeVisible();
    await page.locator("#user-menu-button").click();
    await expect(page.getByTestId("user-menu-theme")).toBeVisible();
  });

  test("the Custom theme uses the church's app color and sticks after a reload", async ({ page }) => {
    await page.route(/\/membership\/settings\/public\//, async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, json: { ...(await res.json()), appTheme: JSON.stringify({ light: { primary: "#2E7D32" } }) } });
    });
    await page.goto("/people");
    await page.locator("#user-menu-button").click();
    await page.getByTestId("theme-custom").click();
    const primaryVar = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--b1-primary").trim().toUpperCase());
    await expect.poll(primaryVar).toBe("#2E7D32");
    await page.reload();
    await expect.poll(primaryVar, { timeout: 15000 }).toBe("#2E7D32");
    await page.evaluate(() => localStorage.removeItem("b1admin-theme"));
  });

  test("devices explains what a paired screen is when there are none", async ({ page }) => {
    await page.route("**/devices/my", (route) => route.fulfill({ json: [] }));
    await page.goto("/profile/devices");
    await expect(page.locator("#mainContent table")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("No paired screens yet")).toBeVisible();
  });
});

// Signed-out login flow; needs a clean context, so it does not use the logged-in fixture.
anonTest.describe("Login landing", () => {
  anonTest.use({ storageState: { cookies: [], origins: [] } });

  anonTest("logging in with no returnUrl lands on the dashboard, not /people", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 30000 });
    await page.fill('input[type="email"]', "demo@b1.church");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');

    const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
    await Promise.race([
      churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
      page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {})
    ]);

    if (await churchDialog.isVisible().catch(() => false)) {
      await page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first().click({ timeout: 10000 });
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    }

    await expect(page.getByTestId("command-palette-open")).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page).not.toHaveURL(/\/people/);
    await expect(page.getByTestId("sunday-home")).toBeVisible({ timeout: 15000 });
  });
});
