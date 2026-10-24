import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToForms } from "./helpers/navigation";
import { mockChurchLogo } from "./helpers/print-logo";

// Issue #1352: the printed letterhead (logo, church name, form title) sat squeezed in the
// top-left corner. It now reads as a centered letterhead.
test("printed form centers the church letterhead", async ({ page }) => {
  await mockChurchLogo(page);
  await navigateToForms(page);
  const row = page.locator("table tbody tr").filter({ hasText: "Visitor Information Card" }).first();
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.locator('[data-testid^="print-form-button-"]').click();

  const dialog = page.locator('[data-testid="form-print-dialog"]');
  const title = dialog.getByRole("heading", { name: "Visitor Information Card" });
  const logo = dialog.getByTestId("print-church-logo");
  await expect(logo).toBeVisible({ timeout: 10000 });
  await expect(title).toBeVisible();

  const centerOf = async (l: typeof logo) => { const b = (await l.boundingBox())!; return b.x + b.width / 2; };
  const middle = await centerOf(title);
  expect(Math.abs((await centerOf(logo)) - middle)).toBeLessThan(4);
  await expect(dialog.getByTestId("print-church-name")).toHaveCSS("text-align", "center");
  await expect(title).toHaveCSS("text-align", "center");
});
