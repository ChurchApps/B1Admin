import { type Page } from '@playwright/test';
import { donationsTest as test, expect } from './helpers/test-fixtures';
import { fillFundForm } from './helpers/donations';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
// donations.spec.ts:
//   Donations Management (serial) — covers Funds + Batches + Donation entry workflows from
//   donation-report.md / manual-input.md (steps 3-27): create fund, edit fund, create batch,
//   edit batch, add donation, edit donation (incl. multi-fund split), delete donation,
//   delete batch, delete fund.
//   Summary view — period selector + "Run Report" coverage from donation-report.md step 28.
//   Fund detail page — clicking a fund opens donation history with date filters
//   (donation-report.md steps 13-14).

const TEST_FUND_INITIAL = 'Octavian Fund';
const TEST_FUND_RENAMED = 'Octavius Fund';
const TEST_BATCH_INITIAL = 'October 10, 2025 Batch';
const TEST_BATCH_RENAMED = 'October 1, 2025 Batch';

// Find a fund row's edit button by the fund's display name. The funds list is
// alphabetically sorted, so .last() / .nth(N) is brittle; this helper anchors on
// the row text instead.
function fundRowEditButton(page: Page, name: string) {
  return page
    .locator('tr')
    .filter({ has: page.locator('a').getByText(name, { exact: true }) })
    .locator('[data-cy^="edit-"]');
}

async function openFundsTab(page: Page) {
  const fundsBtn = page.locator('[id="secondaryMenu"]').getByText('Funds');
  await fundsBtn.click();
  await expect(page).toHaveURL(/\/donations\/funds/);
}

async function openBatchesTab(page: Page) {
  const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
  await batchesBtn.click();
  await expect(page).toHaveURL(/\/donations\/batches/);
}

// Entire describe.serial chain — create fund → create batch → add/edit/delete donation →
// delete batch → delete fund. Each step relies on entities created earlier.
test.describe.serial('Donations Management', () => {
  test.describe('Funds', () => {
    test('should create fund', async ({ page }) => {
      await openFundsTab(page);
      const addBtn = page.locator('[data-testid="add-fund-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      // Toggle off — saves as Non-Deductible so we can verify edit later flips it back.
      await fillFundForm(page, { name: TEST_FUND_INITIAL, toggleTaxDeductible: true });

      await expect(page.locator('a').getByText(TEST_FUND_INITIAL, { exact: true })).toHaveCount(1, { timeout: 10000 });
      // After this, exactly one Non-Deductible row should exist (the Octavian Fund).
      await expect(page.locator('p').getByText('Non-Deductible')).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit fund', async ({ page }) => {
      await openFundsTab(page);

      // Target the Octavian Fund row specifically — alphabetical sort puts other
      // funds after it (e.g. Youth Ministry), so .last() is unreliable.
      const editBtn = fundRowEditButton(page, TEST_FUND_INITIAL);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      // Toggle taxDeductible: Octavian was non-deductible → Octavius becomes deductible.
      await fillFundForm(page, { name: TEST_FUND_RENAMED, toggleTaxDeductible: true });

      await expect(page.locator('a').getByText(TEST_FUND_RENAMED, { exact: true })).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator('a').getByText(TEST_FUND_INITIAL, { exact: true })).toHaveCount(0, { timeout: 10000 });
      // Octavius is now deductible, so no fund in the list should be Non-Deductible.
      await expect(page.locator('p').getByText('Non-Deductible')).toHaveCount(0, { timeout: 10000 });
    });

    test('should cancel editing fund', async ({ page }) => {
      await openFundsTab(page);
      const editBtn = fundRowEditButton(page, TEST_FUND_RENAMED);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const fundName = page.locator('[name="fundName"]');
      await expect(fundName).toBeVisible({ timeout: 10000 });
      await page.locator('button').getByText('Cancel').click();
      await expect(fundName).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Batches', () => {
    test('should create batch', async ({ page }) => {
      await openBatchesTab(page);

      const addBtn = page.locator('[data-testid="add-batch-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await page.locator('[name="name"]').fill(TEST_BATCH_INITIAL);
      await page.locator('[name="date"]').fill('2025-10-10');
      await page.locator('button').getByText('Save').click();

      await expect(page.locator('a').getByText(TEST_BATCH_INITIAL)).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator('p').getByText('Oct 10, 2025')).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit batch', async ({ page }) => {
      await openBatchesTab(page);

      // Find the row for the just-created batch and click its edit button.
      const editBtn = page
        .locator('tr')
        .filter({ has: page.locator('a').getByText(TEST_BATCH_INITIAL) })
        .locator('[data-cy^="edit-"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const batchName = page.locator('[name="name"]');
      await expect(batchName).toBeVisible({ timeout: 10000 });
      await batchName.fill(TEST_BATCH_RENAMED);
      await page.locator('[name="date"]').fill('2025-10-01');
      await page.locator('button').getByText('Save').click();

      await expect(page.locator('a').getByText(TEST_BATCH_RENAMED)).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator('p').getByText('Oct 1, 2025')).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing batch', async ({ page }) => {
      await openBatchesTab(page);

      const editBtn = page
        .locator('tr')
        .filter({ has: page.locator('a').getByText(TEST_BATCH_RENAMED) })
        .locator('[data-cy^="edit-"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const batchName = page.locator('[name="name"]');
      await expect(batchName).toBeVisible({ timeout: 10000 });
      await page.locator('button').getByText('Cancel').click();
      await expect(batchName).toHaveCount(0, { timeout: 10000 });
    });

    test('should add donation to batch', async ({ page }) => {
      await openBatchesTab(page);

      await page.locator('a').getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      // Choose Anonymous on the BulkDonationEntry person picker.
      const anon = page.locator('button').getByText('Anonymous');
      await expect(anon).toBeVisible({ timeout: 10000 });
      await anon.click();

      // MUI TextField puts data-testid on the wrapping FormControl div — drill
      // into the underlying input to issue fill/click actions.
      await page.locator('[data-testid="bulk-donation-date"] input').fill('2025-05-02');

      // Method dropdown — switch to Cash so methodDetails field is hidden.
      // For MUI Select, the clickable trigger is the [role="combobox"] inside.
      const methodSelect = page.locator('[data-testid="bulk-donation-method"] [role="combobox"]');
      await methodSelect.click();
      await page.locator('[data-value="Cash"]').click();

      // Fund dropdown — only renders when there is more than one fund (always true in seed).
      const fundSelect = page.locator('[data-testid="bulk-donation-fund"] [role="combobox"]');
      await fundSelect.click();
      await page.locator('li').getByText(TEST_FUND_RENAMED, { exact: true }).click();

      await page.locator('[data-testid="bulk-donation-notes"] input').fill('Test Donation Notes');
      await page.locator('[data-testid="bulk-donation-amount"] input').fill('20.00');
      const submitBtn = page.locator('[data-testid="add-donation-submit"]');
      await expect(submitBtn).toBeVisible({ timeout: 10000 });
      await submitBtn.click();

      await expect(page.locator('table td').getByText('Anonymous')).toHaveCount(1, { timeout: 10000 });
      await expect(page.locator('table td').getByText('May 2, 2025')).toHaveCount(1, { timeout: 10000 });
      // Two cells contain a $ sign: the donation row and the totals row.
      await expect(page.locator('table td').getByText('$')).toHaveCount(2, { timeout: 10000 });
    });

    test('should edit a batch donation', async ({ page }) => {
      await openBatchesTab(page);
      await page.locator('a').getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      // The donation form uses the FundDonations subcomponent — find the editable
      // amount field. The DonationEdit form re-uses [name="amount"] within the
      // FundDonations component for each fund row.
      const amount = page.locator('[name="amount"]').first();
      await expect(amount).toBeVisible({ timeout: 10000 });
      await amount.fill('30.00');
      await page.locator('button').getByText('Save').click();

      // After save, look for the amount text in the table. CurrencyHelper formats
      // with a non-breaking space ( ) between $ and the amount on some locales.
      // Match the digits — locale-independent.
      await expect(page.locator('table td').filter({ hasText: /30\.00/ })).toHaveCount(2, { timeout: 10000 });
    });

    test('should split a donation across multiple funds', async ({ page }) => {
      // donation-report.md step 26 / manual-input.md steps 10-13: a donation can
      // be allocated across multiple funds; the total automatically calculates
      // from the sum of the fund allocations.
      await openBatchesTab(page);
      await page.locator('a').getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      // FundDonations renders one row per allocation. The existing donation has
      // a single $30 allocation — split into $20 + $15 = $35 total so the table
      // shows a clearly-different value after saving.
      const firstAmount = page.locator('input[name="amount"]').first();
      await expect(firstAmount).toBeVisible({ timeout: 10000 });
      await firstAmount.fill('20.00');

      const addRowBtn = page.locator('[aria-label="add-fund-donation"]');
      await expect(addRowBtn).toBeVisible({ timeout: 10000 });
      await addRowBtn.click();

      // Second amount row is now present.
      await page.locator('input[name="amount"]').nth(1).fill('15.00');

      await page.locator('button').getByText('Save').click();

      // The donations table now shows the new total ($35.00) — appearing in both
      // the donation row and the totals row.
      await expect(page.locator('table td').filter({ hasText: /35\.00/ })).toHaveCount(2, { timeout: 10000 });
    });

    test('should cancel editing a batch donation', async ({ page }) => {
      await openBatchesTab(page);
      await page.locator('a').getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const amount = page.locator('[name="amount"]').first();
      await expect(amount).toBeVisible({ timeout: 10000 });
      await page.locator('button').getByText('Cancel').click();
      await expect(amount).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete a batch donation', async ({ page }) => {
      await openBatchesTab(page);
      await page.locator('a').getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const editBtn = page.locator('[data-cy="edit-link-0"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();

      // The donation row is gone — the donations table should now show no donation rows.
      await expect(page.locator('table td').getByText('Anonymous')).toHaveCount(0, { timeout: 10000 });
    });

    test('should go back to person select on donation entry', async ({ page }) => {
      await openBatchesTab(page);
      await page.locator('a').getByText(TEST_BATCH_RENAMED).click();
      await expect(page).toHaveURL(/\/donations\/batches\//);

      const anon = page.locator('button').getByText('Anonymous');
      await expect(anon).toBeVisible({ timeout: 10000 });
      await anon.click();
      const change = page.locator('button').getByText('Change');
      await expect(change).toBeVisible({ timeout: 10000 });
      await change.click();
      // After Change, the person selector is shown again — the Anonymous link is
      // visible once more.
      await expect(page.locator('button').getByText('Anonymous')).toBeVisible({ timeout: 10000 });
    });

    test('should delete batch', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      await openBatchesTab(page);
      const editBtn = page
        .locator('tr')
        .filter({ has: page.locator('a').getByText(TEST_BATCH_RENAMED) })
        .locator('[data-cy^="edit-"]');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();

      await expect(page.locator('a').getByText(TEST_BATCH_RENAMED)).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete fund', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      await openFundsTab(page);
      const editBtn = fundRowEditButton(page, TEST_FUND_RENAMED);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await expect(page.locator('a').getByText(TEST_FUND_RENAMED, { exact: true })).toHaveCount(0, { timeout: 10000 });
    });
  });
});

// Read-only summary + fund-detail tests run in parallel — no mutation, no chain.
test.describe('Donations summary and fund detail (read-only)', () => {
  test('summary period toggle switches between Weekly / Monthly / Quarterly reports', async ({ page }) => {
    // donation-report.md step 28: "Donations Summary page shows visual reports
    // with options to view different report formats."
    // The page header for the Weekly variant comes from the report definition.
    // Switch to Monthly → page reloads the Monthly report definition.

    // Wait for autoRun to land — the Filter Report card always renders once the
    // report definition arrives.
    await expect(page.getByRole('heading', { name: 'Filter Report' })).toBeVisible({ timeout: 15000 });

    // Switch to Monthly — Reset reportToRun + report state, refilter.
    await page.getByRole('button', { name: 'Monthly' }).click();
    await expect(page.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'true');

    // Wait for the new report definition to load — the Filter card re-renders.
    await expect(page.getByRole('heading', { name: 'Filter Report' })).toBeVisible({ timeout: 15000 });

    // Switch to Quarterly.
    await page.getByRole('button', { name: 'Quarterly' }).click();
    await expect(page.getByRole('button', { name: 'Quarterly' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Filter Report' })).toBeVisible({ timeout: 15000 });
  });

  test('Run Report renders the Giving Dashboard report with KPI cards', async ({ page }) => {
    // donation-report.md steps 1-2: dashboard with charts and filters.
    // Verify the report header (displayName) and KPI cards render after running.
    const startDate = page.locator('[name="startDate"]');
    await expect(startDate).toBeVisible({ timeout: 15000 });
    await startDate.fill('2025-03-01');
    await page.locator('[name="endDate"]').fill('2025-05-01');
    await page.locator('button').getByText('Run Report').click();

    // The DisplayBox header shows the report's displayName once reportResult arrives.
    await expect(page.getByText('Giving Dashboard - Weekly')).toBeVisible({ timeout: 20000 });
    // KPI cards render once the /donations/kpis call returns.
    await expect(page.getByText('Total Giving')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Unique Donors')).toBeVisible();
  });

  test('clicking a fund opens its detail page with date filter and donation history', async ({ page }) => {
    // donation-report.md steps 13-14: "Click on a fund name to view detailed
    // donation history. The fund detail page shows all donations with date range
    // filters and summary statistics."
    const fundsBtn = page.locator('[id="secondaryMenu"]').getByText('Funds');
    await fundsBtn.click();
    await expect(page).toHaveURL(/\/donations\/funds/);

    await page.locator('a').getByText('General Fund', { exact: true }).click();
    await expect(page).toHaveURL(/\/donations\/funds\/FUN00000001/);

    // Date filter card + Filter button.
    await expect(page.locator('[data-cy="start-date"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-cy="end-date"]')).toBeVisible();
    const filterBtn = page.locator('button').filter({ hasText: /^Filter$/ });
    await expect(filterBtn).toBeVisible();

    // Use a wide date range so seed data (March-May 2025) is included.
    // [data-cy] is on the FormControl wrapper — drill into the input.
    await page.locator('[data-cy="start-date"] input').fill('2025-01-01');
    await page.locator('[data-cy="end-date"] input').fill('2025-12-31');
    await filterBtn.click();

    // Donations table shows seed donations — every General Fund seed row is from
    // a known person, so the donor column should not be empty after filter.
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr a').first()).toBeVisible();
  });
});

// Edge-case extensions: gaps from .notes/B1Admin-test-coverage-gaps.md §3 (donations).
test.describe('Donations — navigation and listing extras', () => {
  test('Donations primary page exposes Funds, Batches, Statements secondary nav', async ({ page }) => {
    await expect(page.locator('[id="secondaryMenu"]').getByText('Funds').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[id="secondaryMenu"]').getByText('Batches').first()).toBeVisible();
    await expect(page.locator('[id="secondaryMenu"]').getByText('Giving Statements').first()).toBeVisible();
  });

  test('Funds list page shows the seed General Fund', async ({ page }) => {
    const fundsBtn = page.locator('[id="secondaryMenu"]').getByText('Funds').first();
    await fundsBtn.click();
    await page.waitForURL(/\/donations\/funds/, { timeout: 10000 });
    await expect(page.locator('a').getByText('General Fund', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('Batches list page exposes Add Batch and Stripe import affordances', async ({ page }) => {
    const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches').first();
    await batchesBtn.click();
    await page.waitForURL(/\/donations\/batches/, { timeout: 10000 });
    // Either an "Add" button or "+" icon button on the batches page.
    const addBtn = page.locator('button').getByText(/Add/).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    // Stripe import link is shown on Batches page (see donation-statements.spec for the navigation).
    await expect(page.locator('a').filter({ hasText: /Import missing Stripe transactions/i }).first())
      .toBeVisible({ timeout: 10000 });
  });

  test('Donation Summary autorun loads default report on landing', async ({ page }) => {
    // No navigation needed — donationsTest fixture lands on /donations which auto-runs the report.
    await expect(page.getByRole('heading', { name: 'Filter Report' })).toBeVisible({ timeout: 15000 });
    // Period toggle: Weekly is the default selection.
    await expect(page.getByRole('button', { name: 'Weekly' })).toHaveAttribute('aria-pressed', 'true');
  });
});
