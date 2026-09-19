import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1098: the giving statement print pages resolve every static label through
// Locale.label(labelPrefix + "." + key). When those keys are missing from en.json,
// Locale.label falls back to echoing the raw key, so the statement renders
// "donations.printAllStatementsPage.annualStatementTitle" instead of English text.
test.describe("Issue #1098 - giving statements show raw locale keys", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {};
    });
  });

  test("batch giving statement renders English labels, not placeholder keys", async ({ page }) => {
    await page.goto("/donations/print-all?year=2025");

    // The statement body has to be on screen before we judge its labels.
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("2025 Annual Giving Statement").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Donor Information").first()).toBeVisible();
    await expect(page.getByText("Statement Summary").first()).toBeVisible();
    await expect(page.getByText("Fund Breakdown").first()).toBeVisible();
    await expect(page.getByText("Contribution Details").first()).toBeVisible();

    // No raw i18n key may survive to the printed page.
    await expect(page.getByText(/donations\.printAllStatementsPage\./)).toHaveCount(0);
  });
});
