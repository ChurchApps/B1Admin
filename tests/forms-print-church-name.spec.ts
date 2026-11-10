import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToForms } from "./helpers/navigation";
import { mockChurchLogo } from "./helpers/print-logo";

// Issue #1238: when the church has a logo, printed pages show the logo instead of the church name.

test("printed form keeps the church name under the logo", async ({ page }) => {
  await mockChurchLogo(page);
  await navigateToForms(page);
  const row = page.locator("table tbody tr").filter({ hasText: "Visitor Information Card" }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.locator('[data-testid^="print-form-button-"]').click();

  const dialog = page.locator('[data-testid="form-print-dialog"]');
  await expect(dialog.getByTestId("print-church-logo")).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByTestId("print-church-name")).toHaveText("Grace Community Church");
});
