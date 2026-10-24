import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToForms } from "./helpers/navigation";

async function selectMuiOption(page: import("@playwright/test").Page, openLocator: ReturnType<import("@playwright/test").Page["locator"]>, optionText: string) {
  await openLocator.click();
  const option = page.locator('li[role="option"]', { hasText: optionText }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 10000 }).catch(() => { });
}

// #1347: "Create a person record from submissions" only works on Stand Alone forms (the ones with a
// shareable link), so a new People form must not offer it, and the type picker explains the difference.
test("issue 1347: People forms do not offer person creation and the type picker explains the shareable link", async ({ page }) => {
  await navigateToForms(page);
  await page.locator('[data-testid="add-form-button"]').click();
  await page.locator('[data-testid="form-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
  await expect(page.locator("#formBox")).toContainText("Choose Stand Alone to get a shareable link.");
  await expect(page.locator('[data-testid="auto-create-person-checkbox"]')).toHaveCount(0);
  await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "Stand Alone");
  await expect(page.locator('[data-testid="auto-create-person-checkbox"]')).toBeVisible();
});
