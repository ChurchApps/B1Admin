import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToMobile } from "./helpers/navigation";

// ChurchAppsSupport#1314: a Member Directory tab's Visibility only hides the tab; the editor must point at Show in Directory.
async function openAddTabDrawer(page: import("@playwright/test").Page) {
  await navigateToMobile(page);
  await page.waitForURL(/\/mobile\/navigation/, { timeout: 15000 });
  await page.getByRole("button", { name: /^Add Tab$/i }).first().click();
  await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
}

async function chooseTabType(page: import("@playwright/test").Page, optionText: string) {
  await page.getByLabel("Tab Type", { exact: true }).first().click();
  await page.locator('li[role="option"]', { hasText: new RegExp(`^${optionText}$`, "i") }).first().click();
  await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
}

test("a Member Directory tab points from Visibility to Show in Directory", async ({ page }) => {
  await openAddTabDrawer(page);
  const hint = page.getByText(/Who can open the directory is set by Show in Directory/i);
  await chooseTabType(page, "Bible");
  await expect(hint).toHaveCount(0);
  await chooseTabType(page, "Member Directory");
  await expect(hint).toBeVisible({ timeout: 10000 });
});
