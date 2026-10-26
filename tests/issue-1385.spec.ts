import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { mockChurchLogo } from "./helpers/print-logo";

// Issue #1385: batch printouts carry the church letterhead, and Print covers the batches on screen.

test("batches Print with All selected includes the older seed batches", async ({ page }) => {
  await page.addInitScript(() => { window.print = () => {}; });
  await page.goto("/donations/batches");
  await page.getByTestId("print-batches-button").click();
  await expect(page).toHaveURL(/\/donations\/batches\/print-all/);
  await expect(page.getByTestId("batch-print-document").filter({ hasText: "March 2, 2025 Batch" })).toHaveCount(1, { timeout: 15000 });
});

test("batch printout shows the church logo above the church name", async ({ page }) => {
  await mockChurchLogo(page);
  await page.addInitScript(() => { window.print = () => {}; });
  await page.goto("/donations/batches/print-all?start=2025-03-01&end=2025-03-31");
  const doc = page.getByTestId("batch-print-document").first();
  await expect(doc).toBeVisible({ timeout: 15000 });
  await expect(doc.getByTestId("print-church-logo")).toBeVisible();
  await expect(doc.getByTestId("batch-print-church")).toHaveText("Grace Community Church");
});
