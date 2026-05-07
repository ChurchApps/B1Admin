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
    // FundEdit re-renders mid-click as the panel hydrates; force-click
    // avoids the "element detached" race on the checkbox.
    await page.locator('[name="taxDeductible"]').click({ force: true });
  }
  // Wait for the fund POST to complete so the table refresh is reflected
  // before the caller asserts on row counts. Without this, retries can
  // create duplicate funds and trigger "found 2 instead of 1" failures.
  const fundPost = page.waitForResponse(
    r => r.url().includes("/giving/funds") && r.request().method() === "POST",
    { timeout: 15000 }
  );
  await page.locator("button").getByText("Save").click({ force: true });
  await fundPost;
}
