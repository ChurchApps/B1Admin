import type { Locator } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

const PHONE_WIDTH = 390;

async function expectFullyOnScreen(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE_WIDTH);
}

// ChurchAppsSupport#1553: on a phone the event photo thumbnail squeezed the Add Photo button and hint out of the dialog.
test.describe("New Event photo picker on a phone", () => {
  test.use({ viewport: { width: PHONE_WIDTH, height: 844 } });

  test("shows the Add Photo button and its hint inside the dialog", async ({ page }) => {
    await page.goto("/calendars/CAL00000004");
    await page.locator('[data-testid="new-event-button"]').click();
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toBeVisible({ timeout: 15000 });

    const dialog = page.getByRole("dialog");
    await expectFullyOnScreen(dialog.locator('[data-testid="new-event-photo-button"]'));
    const hint = dialog.getByText("Shown at the top of the event page", { exact: false });
    await expectFullyOnScreen(hint);
    // The hint reads as a sentence, not a column a few characters wide.
    expect((await hint.boundingBox())!.width).toBeGreaterThan(150);
  });
});
