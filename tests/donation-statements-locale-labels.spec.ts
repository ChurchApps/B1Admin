import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue 1098: the printed giving statement resolves every label through Locale.label().
// The keys were built by concatenating a runtime labelPrefix, so locale-sync's static scan
// could not see them and pruned donations.printAllStatementsPage.* / printDonationPage.* /
// statementLegal.* out of en.json. Locale.label then echoes the key, and the statement
// prints placeholders like "donations.printDonationPage.donorInformation".
test.describe("Issue 1098 - giving statements show raw locale keys", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {};
    });
  });

  test("single donor statement renders English labels, not raw i18n keys", async ({ page }) => {
    await page.goto("/donations/print/PER00000001?year=2025");

    // Wait for the statement body itself, not just the toolbar.
    await expect(page.getByText("Donor Information").first()).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("2025 Annual Giving Statement").first()).toBeVisible();
    await expect(page.getByText("Statement Summary").first()).toBeVisible();
    await expect(page.getByText("Fund Breakdown").first()).toBeVisible();
    await expect(page.getByText("Contribution Details").first()).toBeVisible();
    await expect(page.getByText("Organization").first()).toBeVisible();

    await expect(page.getByText(/donations\.printDonationPage\./)).toHaveCount(0);
  });

  test("batch statement page renders English labels, not raw i18n keys", async ({ page }) => {
    await page.goto("/donations/print-all?year=2025");

    await expect(page.getByText("Donor Information").first()).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("2025 Annual Giving Statement").first()).toBeVisible();
    await expect(page.getByText("Statement Summary").first()).toBeVisible();

    await expect(page.getByText(/donations\.printAllStatementsPage\./)).toHaveCount(0);
  });
});
