import { type Page } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";
import { fillFundForm } from "./helpers/donations";
import { login } from "./helpers/auth";
import { navigateToDonations } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// Test names: ZACCHAEUS/ZEBEDEE used throughout; covers Funds + Batches + Donation entry from donation-report.md/manual-input.md (steps 3-27).

const TEST_FUND_INITIAL = "Zacchaeus Fund";
const TEST_FUND_RENAMED = "Zebedee Fund";
const TEST_BATCH_INITIAL = "October 10, 2025 Batch";
const TEST_BATCH_RENAMED = "October 1, 2025 Batch";

// Use getByRole (not data-cy) to avoid clicking the wrapper; MUI Button has inner span.
function fundRowEditButton(page: Page, name: string) {
  return page
    .locator("tr")
    .filter({ has: page.locator("a").getByText(name, { exact: true }) })
    .getByRole("button", { name: /Edit/ });
}

async function openFundsTab(page: Page) {
  const fundsBtn = page.locator('[id="secondaryMenu"]').getByText("Funds");
  await fundsBtn.click();
  await expect(page).toHaveURL(/\/donations\/funds/);
}

async function openBatchesTab(page: Page) {
  const batchesBtn = page.locator('[id="secondaryMenu"]').getByText("Batches");
  await batchesBtn.click();
  await expect(page).toHaveURL(/\/donations\/batches/);
}

// Entire describe.serial chain — create fund → create batch → add/edit/delete donation →
// delete batch → delete fund. Each step relies on entities created earlier.
test.describe.serial("Donations Management", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToDonations(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.describe("Funds", () => {
    test.describe.configure({ retries: 0 });

    test("should create fund", async () => {
      await openFundsTab(page);
      const addBtn = page.locator('[data-testid="add-fund-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await fillFundForm(page, { name: TEST_FUND_INITIAL, toggleTaxDeductible: true });

      await expect(page.locator("a").getByText(TEST_FUND_INITIAL, { exact: true })).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator("p").getByText("Non-Deductible")).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit fund", async () => {
      await openFundsTab(page);

      const editBtn = fundRowEditButton(page, TEST_FUND_INITIAL);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      await fillFundForm(page, { name: TEST_FUND_RENAMED, toggleTaxDeductible: true });

      await expect(page.locator("a").getByText(TEST_FUND_RENAMED, { exact: true })).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator("a").getByText(TEST_FUND_INITIAL, { exact: true })).toHaveCount(0, { timeout: 10000 });
      await expect(page.locator("p").getByText("Non-Deductible")).toHaveCount(0, { timeout: 10000 });
    });

    test("should cancel editing fund", async () => {
      await openFundsTab(page);
      const editBtn = fundRowEditButton(page, TEST_FUND_RENAMED);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const fundName = page.locator('[name="fundName"]');
      await expect(fundName).toBeVisible({ timeout: 10000 });
      await expect(fundName).toHaveValue(TEST_FUND_RENAMED, { timeout: 10000 });
      await page.locator("button").getByText("Cancel").click({ force: true });
      await expect(fundName).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe("Batches", () => {
    test.describe.configure({ retries: 0 });

    test("should create batch", async () => {
      await openBatchesTab(page);

      const addBtn = page.locator('[data-testid="add-batch-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await page.locator('[name="name"]').fill(TEST_BATCH_INITIAL);
      await page.locator('[name="date"]').fill("2025-10-10");
      const batchPost = page.waitForResponse(r => r.url().includes("/donationbatches") && r.request().method() === "POST", { timeout: 15000 }).catch((): null => null);
      await page.locator("button").getByText("Save").click();
      await batchPost;

      await expect(page.locator("a").getByText(TEST_BATCH_INITIAL)).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator("p").getByText("Oct 10, 2025")).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit batch", async () => {
      await openBatchesTab(page);

      const row = page.locator("tr").filter({ has: page.locator("a").getByText(TEST_BATCH_INITIAL) });
      const editBtn = row.getByRole("button", { name: /Edit/ });
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      const batchGet = page.waitForResponse(
        r => /\/giving\/donationbatches\/[^/?]+(\?|$)/.test(r.url()) && r.request().method() === "GET",
        { timeout: 15000 }
      ).catch((): null => null);
      await editBtn.click();
      await batchGet;

      const batchName = page.locator('[name="name"]');
      await expect(batchName).not.toHaveValue("", { timeout: 10000 });
      await batchName.fill(TEST_BATCH_RENAMED);
      await page.locator('[name="date"]').fill("2025-10-01");
      await page.locator("button").getByText("Save").click();

      await expect(page.locator("a").getByText(TEST_BATCH_RENAMED)).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator("p").getByText("Oct 1, 2025")).toHaveCount(1, { timeout: 10000 });
    });

    test("should cancel editing batch", async () => {
      await openBatchesTab(page);

      const row = page.locator("tr").filter({ has: page.locator("a").getByText(TEST_BATCH_RENAMED) });
      const editBtn = row.getByRole("button", { name: /Edit/ });
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      const batchGet = page.waitForResponse(
        r => /\/giving\/donationbatches\/[^/?]+(\?|$)/.test(r.url()) && r.request().method() === "GET",
        { timeout: 15000 }
      ).catch((): null => null);
      await editBtn.click();
      await batchGet;
      const batchName = page.locator('[name="name"]');
      await expect(batchName).toBeVisible({ timeout: 10000 });
      await expect(batchName).not.toHaveValue("", { timeout: 10000 });
      await page.locator("button").getByText("Cancel").click();
      await expect(batchName).toHaveCount(0, { timeout: 10000 });
    });

    test("should add donation to batch", async () => {
      await openBatchesTab(page);

      await page.locator("a").getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const anon = page.locator("button").getByText("Anonymous");
      await expect(anon).toBeVisible({ timeout: 10000 });
      await anon.click();

      await page.locator('[data-testid="bulk-donation-date"] input').fill("2025-05-02");

      const methodSelect = page.locator('[data-testid="bulk-donation-method"] [role="combobox"]');
      await methodSelect.click();
      await page.locator('[data-value="Cash"]').click();

      const fundSelect = page.locator('[data-testid="bulk-donation-fund"] [role="combobox"]');
      await fundSelect.click();
      await page.locator("li").getByText(TEST_FUND_RENAMED, { exact: true }).click();

      await page.locator('[data-testid="bulk-donation-notes"] input').fill("Test Donation Notes");
      await page.locator('[data-testid="bulk-donation-amount"] input').fill("20.00");
      const submitBtn = page.locator('[data-testid="add-donation-submit"]');
      await expect(submitBtn).toBeVisible({ timeout: 10000 });
      await submitBtn.click();

      await expect(page.locator("table td").getByText("Anonymous")).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator("table td").getByText("May 2, 2025")).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator("table td").getByText("$")).toHaveCount(2, { timeout: 10000 });
    });

    test("should edit a batch donation", async () => {
      await openBatchesTab(page);
      await page.locator("a").getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const amount = page.locator('[name="amount"]').first();
      await expect(amount).toBeVisible({ timeout: 10000 });
      await amount.fill("30.00");
      await page.locator("button").getByText("Save").click();

      await expect(page.locator("table td").filter({ hasText: /30\.00/ })).toHaveCount(2, { timeout: 10000 });
    });

    test("should split a donation across multiple funds", async () => {
      await openBatchesTab(page);
      await page.locator("a").getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const firstAmount = page.locator('input[name="amount"]').first();
      await expect(firstAmount).toBeVisible({ timeout: 10000 });
      await firstAmount.fill("20.00");

      const addRowBtn = page.locator('[aria-label="add-fund-donation"]');
      await expect(addRowBtn).toBeVisible({ timeout: 10000 });
      await addRowBtn.click();

      await page.locator('input[name="amount"]').nth(1).fill("15.00");

      await page.locator("button").getByText("Save").click();

      await expect(page.locator("table td").filter({ hasText: /35\.00/ })).toHaveCount(2, { timeout: 10000 });
    });

    test("should cancel editing a batch donation", async () => {
      await openBatchesTab(page);
      await page.locator("a").getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const amount = page.locator('[name="amount"]').first();
      await expect(amount).toBeVisible({ timeout: 10000 });
      await page.locator("button").getByText("Cancel").click();
      await expect(amount).toHaveCount(0, { timeout: 10000 });
    });

    test("should delete a batch donation", async () => {
      await openBatchesTab(page);
      await page.locator("a").getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await confirmDelete(page);

      await expect(page.locator("table td").getByText("Anonymous")).toHaveCount(0, { timeout: 10000 });
    });

    test("should go back to person select on donation entry", async () => {
      await openBatchesTab(page);
      await page.locator("a").getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const anon = page.locator("button").getByText("Anonymous");
      await expect(anon).toBeVisible({ timeout: 10000 });
      await anon.click();
      const change = page.locator("button").getByText("Change");
      await expect(change).toBeVisible({ timeout: 10000 });
      await change.click();
      await expect(page.locator("button").getByText("Anonymous")).toBeVisible({ timeout: 10000 });
    });

    test("should delete batch", async () => {
      await openBatchesTab(page);
      const editBtn = page
        .locator("tr")
        .filter({ has: page.locator("a").getByText(TEST_BATCH_RENAMED) })
        .locator('[data-cy^="edit-"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await confirmDelete(page);

      await expect(page.locator("a").getByText(TEST_BATCH_RENAMED)).toHaveCount(0, { timeout: 10000 });
    });

    test("should delete fund", async () => {
      await openFundsTab(page);
      const editBtn = fundRowEditButton(page, TEST_FUND_RENAMED);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await confirmDelete(page);
      await expect(page.locator("a").getByText(TEST_FUND_RENAMED, { exact: true })).toHaveCount(0, { timeout: 10000 });
    });
  });
});

test.describe("Donations summary and fund detail (read-only)", () => {
  test("summary period toggle switches between Weekly / Monthly / Quarterly reports", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Filter Report" })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Monthly" }).click();
    await expect(page.getByRole("button", { name: "Monthly" })).toHaveAttribute("aria-pressed", "true");

    await expect(page.getByRole("heading", { name: "Filter Report" })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Quarterly" }).click();
    await expect(page.getByRole("button", { name: "Quarterly" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "Filter Report" })).toBeVisible({ timeout: 15000 });
  });

  test("Run Report renders the Giving Dashboard report with KPI cards", async ({ page }) => {
    const startDate = page.locator('[name="startDate"]');
    await expect(startDate).toBeVisible({ timeout: 15000 });
    await startDate.fill("2025-03-01");
    await page.locator('[name="endDate"]').fill("2025-05-01");
    await page.locator("button").getByText("Run Report").click();

    await expect(page.getByText("Giving Dashboard - Weekly")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Total Giving")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Unique Donors")).toBeVisible();
  });

  test("clicking a fund opens its detail page with date filter and donation history", async ({ page }) => {
    const fundsBtn = page.locator('[id="secondaryMenu"]').getByText("Funds");
    await fundsBtn.click();
    await expect(page).toHaveURL(/\/donations\/funds/);

    await page.locator("a").getByText("General Fund", { exact: true }).click();
    await expect(page).toHaveURL(/\/donations\/funds\/FUN00000001/);

    await expect(page.locator('[data-cy="start-date"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-cy="end-date"]')).toBeVisible();
    const filterBtn = page.locator("button").filter({ hasText: /^Filter$/ });
    await expect(filterBtn).toBeVisible();

    await page.locator('[data-cy="start-date"] input').fill("2025-01-01");
    await page.locator('[data-cy="end-date"] input').fill("2025-12-31");
    await filterBtn.click();

    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr a").first()).toBeVisible();
  });
});

// Edge-case extensions: gaps from .notes/B1Admin-test-coverage-gaps.md §3 (donations).
test.describe("Donations — navigation and listing extras", () => {
  test("Donations primary page exposes Funds, Batches, Statements secondary nav", async ({ page }) => {
    await expect(page.locator('[id="secondaryMenu"]').getByText("Funds").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[id="secondaryMenu"]').getByText("Batches").first()).toBeVisible();
    await expect(page.locator('[id="secondaryMenu"]').getByText("Giving Statements").first()).toBeVisible();
  });

  test("Funds list page shows the seed General Fund", async ({ page }) => {
    const fundsBtn = page.locator('[id="secondaryMenu"]').getByText("Funds").first();
    await fundsBtn.click();
    await page.waitForURL(/\/donations\/funds/, { timeout: 10000 });
    await expect(page.locator("a").getByText("General Fund", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("Batches list page exposes Add Batch and Stripe import affordances", async ({ page }) => {
    const batchesBtn = page.locator('[id="secondaryMenu"]').getByText("Batches").first();
    await batchesBtn.click();
    await page.waitForURL(/\/donations\/batches/, { timeout: 10000 });
    // Either an "Add" button or "+" icon button on the batches page.
    const addBtn = page.locator("button").getByText(/Add/).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    // Stripe import link is shown on Batches page (see donation-statements.spec for the navigation).
    await expect(page.locator("a").filter({ hasText: /Import missing Stripe transactions/i }).first())
      .toBeVisible({ timeout: 10000 });
  });

  test("Donation Summary autorun loads default report on landing", async ({ page }) => {
    // No navigation needed — donationsTest fixture lands on /donations which auto-runs the report.
    await expect(page.getByRole("heading", { name: "Filter Report" })).toBeVisible({ timeout: 15000 });
    // Period toggle: Weekly is the default selection.
    await expect(page.getByRole("button", { name: "Weekly" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Fund visibility", () => {
  test.describe.configure({ retries: 0 });

  test("unchecking Visible to Donors shows a Hidden chip; re-checking it removes the chip", async ({ page }) => {
    const TEST_HIDDEN_FUND = "Zacchaeus Concealed Fund";

    const fundsBtn = page.locator('[id="secondaryMenu"]').getByText("Funds").first();
    await fundsBtn.click();
    await expect(page).toHaveURL(/\/donations\/funds/, { timeout: 10000 });

    const addBtn = page.locator('[data-testid="add-fund-button"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const fundName = page.locator('[name="fundName"]');
    await expect(fundName).toBeVisible({ timeout: 10000 });
    await fundName.fill(TEST_HIDDEN_FUND);

    const visibleInput = page.locator('[data-testid="fund-visible-checkbox"] input');
    await expect(visibleInput).toBeChecked();
    await visibleInput.click({ force: true });
    await expect(visibleInput).not.toBeChecked();

    const fundPost1 = page.waitForResponse((r) => r.url().includes("/giving/funds") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("#fundsBox").getByRole("button", { name: "Save" }).click();
    await fundPost1;

    const row = page.locator("tr").filter({ has: page.locator("a").getByText(TEST_HIDDEN_FUND, { exact: true }) });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.getByText("Hidden", { exact: true })).toBeVisible({ timeout: 10000 });

    const editBtn = row.getByRole("button", { name: /Edit/ });
    await editBtn.click();
    const visibleInput2 = page.locator('[data-testid="fund-visible-checkbox"] input');
    await expect(visibleInput2).toBeVisible({ timeout: 10000 });
    await expect(visibleInput2).not.toBeChecked();
    await visibleInput2.click({ force: true });
    await expect(visibleInput2).toBeChecked();
    const fundPost2 = page.waitForResponse((r) => r.url().includes("/giving/funds") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("#fundsBox").getByRole("button", { name: "Save" }).click();
    await fundPost2;

    const row2 = page.locator("tr").filter({ has: page.locator("a").getByText(TEST_HIDDEN_FUND, { exact: true }) });
    await expect(row2).toBeVisible({ timeout: 10000 });
    await expect(row2.getByText("Hidden", { exact: true })).toHaveCount(0, { timeout: 10000 });

    await row2.getByRole("button", { name: /Edit/ }).click();
    await page.locator("#fundsBox").getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page.locator("a").getByText(TEST_HIDDEN_FUND, { exact: true })).toHaveCount(0, { timeout: 10000 });
  });
});
