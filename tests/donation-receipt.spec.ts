import { type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateTo } from "./helpers/navigation";

// A receipt for one gift: the statement document scoped to a single donation, reached from the batch row and the Edit Donation form.
async function openFirstBatchWithDonations(page: Page) {
  await navigateTo(page, "batches");
  const batchLink = page.locator("tbody a[href*='/donations/batches/']").first();
  await expect(batchLink).toBeVisible({ timeout: 10000 });
  await batchLink.click();
  await expect(page).toHaveURL(/\/donations\/batches\/[^/]+$/);
  await expect(page.locator("[data-testid^='donation-row-']").first()).toBeVisible({ timeout: 15000 });
}

test.describe("Donation receipt", () => {
  test("each batch row has a Receipt link that prints a one-gift receipt", async ({ page }) => {
    await openFirstBatchWithDonations(page);
    const firstRow = page.locator("[data-testid^='donation-row-']").first();
    const rowTestId = await firstRow.getAttribute("data-testid");
    const donationId = (rowTestId || "").replace("donation-row-", "");
    const amount = (await firstRow.locator("td").nth(4).innerText()).trim();

    const receiptLink = page.getByTestId("donation-receipt-" + donationId);
    await expect(receiptLink).toHaveText("Receipt");
    await receiptLink.click();

    await expect(page).toHaveURL(new RegExp("/donations/receipt/" + donationId + "$"));
    await expect(page.getByRole("heading", { name: "Donation Receipt" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/^Date: /)).toBeVisible();
    await expect(page.getByText("Total:", { exact: true })).toBeVisible();
    await expect(page.locator(".total-amount")).toHaveText(amount);
    await expect(page.getByTestId("statement-disclaimer")).toContainText("No goods or services");
  });

  test("the Edit Donation form links to the receipt", async ({ page }) => {
    await openFirstBatchWithDonations(page);
    await page.locator("[data-cy='edit-link-0']").click();
    const link = page.locator("#donationBox").getByTestId("donation-receipt-link");
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await expect(page).toHaveURL(/\/donations\/receipt\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Donation Receipt" })).toBeVisible({ timeout: 15000 });
  });
});
