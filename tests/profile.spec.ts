import { loggedInTest as test, expect } from "./helpers/test-fixtures";

test.describe("Profile", () => {
  test("the profile page offers the theme toggle and linked accounts", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByTestId("theme-toggle")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("delete-account-button")).toBeVisible();
  });

  test("devices explains what a paired screen is when there are none", async ({ page }) => {
    await page.route("**/devices/my", (route) => route.fulfill({ json: [] }));
    await page.goto("/profile/devices");
    await expect(page.locator("#mainContent table")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("No paired screens yet")).toBeVisible();
  });
});
