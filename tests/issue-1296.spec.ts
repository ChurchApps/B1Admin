import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToSettings } from "./helpers/navigation";

// Issue #1296: FreePlay schedules use the church's stored time zone, but Church Information had no way to see or change it.

test("church time zone can be changed under Church Information", async ({ page }) => {
  await navigateToSettings(page);
  const section = page.locator('[data-testid="settings-section-church-info"]');
  await expect(section).toBeVisible({ timeout: 15000 });
  await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");
  await expect(page.locator('[name="churchName"]')).toBeVisible({ timeout: 10000 });

  await page.locator("#churchTimeZone").click();
  await page.getByRole("option", { name: "America/Chicago" }).click();
  const save = page.waitForResponse(r => r.url().includes("/membership/churches") && r.request().method() === "POST");
  await page.locator("button").getByText("Save").click();
  await save;

  await expect(page.locator('[name="churchName"]')).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByTestId("church-time-zone")).toHaveText("America/Chicago");
});
