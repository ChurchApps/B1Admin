import { settingsTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1150: disabling grade promotion failed with a "not found" error.
test("grade promotion can be disabled after being enabled", async ({ page }) => {
  await page.locator('[data-testid="settings-section-grade-promotion"]').click();
  const section = page.locator('[data-testid="settings-grade-promotion"]');
  await expect(section).toBeVisible({ timeout: 15000 });
  const toggle = section.locator('[data-testid="grade-promotion-enabled-switch"] input');

  await section.locator('[data-testid="small-button-edit"]').dispatchEvent("click");
  await expect(toggle).toBeVisible({ timeout: 10000 });
  if (!(await toggle.isChecked())) await toggle.check();
  await section.locator("button").getByText("Save").click();
  await expect(toggle).toHaveCount(0, { timeout: 10000 });
  await expect(section.getByText(/Promotes on .* each year/)).toBeVisible({ timeout: 10000 });

  await section.locator('[data-testid="small-button-edit"]').dispatchEvent("click");
  await expect(toggle).toBeChecked({ timeout: 10000 });
  await toggle.uncheck();
  await section.locator("button").getByText("Save").click();
  await expect(section.getByRole("alert")).toHaveCount(0);
  await expect(toggle).toHaveCount(0, { timeout: 10000 });
  await expect(section.getByText("Automatic promotion disabled")).toBeVisible({ timeout: 10000 });
});
