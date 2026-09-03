import { type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateTo } from "./helpers/navigation";

// Demo seed donations are in 2025; year picker defaults to current year.
test.describe("Donation Statements and Stripe Import", () => {
  test.describe("Giving Statements page", () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, "statements");
      await expect(page).toHaveURL(/\/donations\/statements/);
    });

    test("renders year selector and summary card", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Select Year" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Total Donors:")).toBeVisible();
      await expect(page.getByText("Total Donations:")).toBeVisible();
      await expect(page.getByText("Total Amount:")).toBeVisible();

      const yearSelect = page.locator('[role="combobox"]').first();
      await expect(yearSelect).toBeVisible();
    });

    test("selecting a year with donations exposes Download ZIP and Print All buttons", async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      const year2025 = page.locator('[data-value="2025"]');
      await expect(year2025).toBeVisible({ timeout: 5000 });
      await year2025.click();

      await expect(page.getByText("Download Options")).toBeVisible({ timeout: 10000 });

      const zipBtn = page.locator("button").filter({ hasText: /Download ZIP/i }).first();
      await expect(zipBtn).toBeVisible();

      const printBtn = page.locator("button").filter({ hasText: /Print All/i }).first();
      await expect(printBtn).toBeVisible();
    });

    test("selecting a year with no donations shows the no-donations alert", async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      const year2021 = page.locator('[data-value="2021"]');
      await expect(year2021).toBeVisible({ timeout: 5000 });
      await year2021.click();

      await expect(page.getByText(/No donations found for 2021/i)).toBeVisible({ timeout: 10000 });
      await expect(page.locator("button").filter({ hasText: /Download ZIP/i })).toHaveCount(0);
      await expect(page.locator("button").filter({ hasText: /Print All/i })).toHaveCount(0);
    });

    test("Download ZIP triggers a per-year zip download", async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      await page.locator('[data-value="2025"]').click();

      const zipBtn = page.locator("button").filter({ hasText: /Download ZIP/i }).first();
      await expect(zipBtn).toBeVisible({ timeout: 10000 });

      const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
      await zipBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/giving_statements_2025\.zip/);
    });
  });

  test.describe("Stripe Import", () => {
    test("Import missing Stripe transactions link on Batches navigates to Stripe Import", async ({ page }) => {
      await navigateTo(page, "batches");

      const stripeLink = page.locator("a").filter({ hasText: /Import missing Stripe transactions/i }).first();
      await expect(stripeLink).toBeVisible({ timeout: 10000 });
      await stripeLink.click();
      await expect(page).toHaveURL(/\/donations\/stripe-import/);
    });

    test("Stripe Import page renders date range and action controls", async ({ page }) => {
      await page.goto("/donations/stripe-import");
      await expect(page).toHaveURL(/\/donations\/stripe-import/);

      await expect(page.getByRole("group", { name: "Start Date" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("group", { name: "End Date" })).toBeVisible();

      const previewBtn = page.locator("button").filter({ hasText: /^Preview$/ }).first();
      await expect(previewBtn).toBeVisible();
      await expect(previewBtn).toBeEnabled();

      // Import Missing is gated on a successful preview returning new events; without
      // running a real preview against Stripe, it should remain disabled.
      const importBtn = page.locator("button").filter({ hasText: /Import Missing/i }).first();
      await expect(importBtn).toBeVisible();
      await expect(importBtn).toBeDisabled();
    });
  });
});

// Country receipt formats: the CRA/AU/NZ legal block is driven by church settings and
// rendered on the printed statement. Demo giving data is 2025; John Smith is PER00000001.
test.describe.serial("Country statement formats", () => {
  const REG_NUMBER = "119288945RR0001";

  const setFormat = async (page: Page, formatLabel: string) => {
    await navigateTo(page, "settings");
    await page.locator('[data-testid="settings-section-giving"]').click();
    const section = page.locator('[data-testid="settings-giving"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");
    const formatSelect = section.locator('[data-testid="statement-format-select"]');
    await expect(formatSelect).toBeVisible({ timeout: 10000 });
    await formatSelect.click();
    await page.getByRole("option", { name: formatLabel, exact: true }).click();
    if (formatLabel !== "Standard") {
      await section.getByLabel("CRA Registration Number").fill(REG_NUMBER);
      await section.getByLabel("Authorized Signatory Name").fill("Pastor Grace Miller");
      await section.getByLabel("City of Issue").fill("Toronto");
    }
    const settingsPost = page.waitForResponse(
      (r) => r.url().includes("/membership/settings") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await section.getByRole("button", { name: "Save" }).click();
    await settingsPost;
  };

  test.beforeEach(async ({ page }) => {
    // The print page auto-prints then navigates back after 1.5s; keep it on screen to assert.
    await page.addInitScript(() => {
      window.print = () => {};
      window.history.go = () => {};
    });
  });

  test("Canada format prints the CRA official receipt block with a receipt number", async ({ page }) => {
    await setFormat(page, "Canada - CRA official receipt");
    await page.goto("/donations/print/PER00000001?year=2025");

    const block = page.locator('[data-testid="statement-legal-block"]');
    await expect(block).toBeVisible({ timeout: 15000 });
    await expect(block.getByText("Official Receipt for Income Tax Purposes")).toBeVisible();
    await expect(block.getByText("Receipt number: 2025-PER00000001")).toBeVisible();
    await expect(block.getByText("Charity registration number: " + REG_NUMBER)).toBeVisible();
    await expect(block.getByText("Place of issue: Toronto")).toBeVisible();
    await expect(block.getByText(/Eligible amount of gift for income tax purposes: \$/)).toBeVisible();
    await expect(block.getByText("Pastor Grace Miller — Authorized signature")).toBeVisible();
    await expect(block.getByText("Canada Revenue Agency: canada.ca/charities-giving")).toBeVisible();
  });

  test("switching back to Standard drops the legal block", async ({ page }) => {
    await setFormat(page, "Standard");
    await page.goto("/donations/print/PER00000001?year=2025");
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="statement-legal-block"]')).toHaveCount(0);
  });
});
