import type { Locator, Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

const PHONE_WIDTH = 390;

async function expectFullyOnScreen(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE_WIDTH);
}

async function selectMuiOption(page: Page, openLocator: Locator, optionText: string) {
  await openLocator.click();
  const option = page.locator('li[role="option"]', { hasText: optionText }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 10000 }).catch(() => { });
}

// ChurchAppsSupport#1553: on a phone the header photo thumbnail squeezed the Add Photo button and hint into a sliver.
test.describe("Add Form header photo picker on a phone", () => {
  test.use({ viewport: { width: PHONE_WIDTH, height: 844 } });

  test("shows the Add Photo button and its hint at a readable width", async ({ page }) => {
    await page.goto("/forms");
    await page.locator('[data-testid="add-form-button"]').click();
    await page.locator('[data-testid="form-name-input"] input').waitFor({ state: "visible", timeout: 15000 });
    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "Stand Alone");

    const formBox = page.locator("#formBox");
    await expectFullyOnScreen(formBox.locator('[data-testid="form-photo-button"]'));
    const hint = formBox.getByText("Shown across the top of the form", { exact: false });
    await expectFullyOnScreen(hint);
    expect((await hint.boundingBox())!.width).toBeGreaterThan(150);
  });
});
