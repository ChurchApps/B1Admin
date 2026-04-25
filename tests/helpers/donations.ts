import { expect, type Page } from "@playwright/test";

// Form-fill helpers for the Donations area. Each performs the fill + save —
// callers handle opening the form (add button vs. row-edit button) and
// post-save assertions, so these stay assertion-free and reusable.

export type FillFundFormInput = {
  name: string;
  // Click the taxDeductible checkbox after filling the name. The demo data
  // pattern is: create as Non-Deductible (toggle on initially), then edit
  // back to Deductible (toggle on again to flip).
  toggleTaxDeductible?: boolean;
};

export async function fillFundForm(page: Page, input: FillFundFormInput) {
  const fundName = page.locator('[name="fundName"]');
  await expect(fundName).toBeVisible({ timeout: 10000 });
  await fundName.fill(input.name);
  if (input.toggleTaxDeductible) {
    await page.locator('[name="taxDeductible"]').click();
  }
  await page.locator("button").getByText("Save").click();
}
