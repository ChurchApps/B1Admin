import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateTo } from './helpers/navigation';

// Coverage for donation-report.md steps 29-35 (Giving Statements + Stripe Import).
// Existing donations.spec.ts covers the funds + batches + donation entry workflows.
// This file fills the statements / Stripe Import gap.
//
// Note on year selection: BatchGivingStatementsPage defaults to the current year.
// Demo seed data (Api/tools/dbScripts/giving/demo.sql) places all donations in 2025,
// so tests that need to see donors must explicitly switch the year picker to 2025.
test.describe('Donation Statements and Stripe Import', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Giving Statements page', () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, 'statements');
      await expect(page).toHaveURL(/\/donations\/statements/);
    });

    test('renders year selector and summary card', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Select Year' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Total Donors:')).toBeVisible();
      await expect(page.getByText('Total Donations:')).toBeVisible();
      await expect(page.getByText('Total Amount:')).toBeVisible();

      const yearSelect = page.locator('[role="combobox"]').first();
      await expect(yearSelect).toBeVisible();
    });

    test('selecting a year with donations exposes Download ZIP and Print All buttons', async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      const year2025 = page.locator('[data-value="2025"]');
      await expect(year2025).toBeVisible({ timeout: 5000 });
      await year2025.click();

      await expect(page.getByText('Download Options')).toBeVisible({ timeout: 10000 });

      const zipBtn = page.locator('button').filter({ hasText: /Download ZIP/i }).first();
      await expect(zipBtn).toBeVisible();

      const printBtn = page.locator('button').filter({ hasText: /Print All/i }).first();
      await expect(printBtn).toBeVisible();
    });

    test('selecting a year with no donations shows the no-donations alert', async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      // Year options are [currentYear .. currentYear-5]. 2021 is always in range and
      // never has seed donations, so it's a stable "empty" choice.
      const year2021 = page.locator('[data-value="2021"]');
      await expect(year2021).toBeVisible({ timeout: 5000 });
      await year2021.click();

      await expect(page.getByText(/No donations found for 2021/i)).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button').filter({ hasText: /Download ZIP/i })).toHaveCount(0);
      await expect(page.locator('button').filter({ hasText: /Print All/i })).toHaveCount(0);
    });

    test('Download ZIP triggers a per-year zip download', async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      await page.locator('[data-value="2025"]').click();

      const zipBtn = page.locator('button').filter({ hasText: /Download ZIP/i }).first();
      await expect(zipBtn).toBeVisible({ timeout: 10000 });

      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await zipBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/giving_statements_2025\.zip/);
    });
  });

  test.describe('Stripe Import', () => {
    test('Import missing Stripe transactions link on Batches navigates to Stripe Import', async ({ page }) => {
      await navigateTo(page, 'batches');

      const stripeLink = page.locator('a').filter({ hasText: /Import missing Stripe transactions/i }).first();
      await expect(stripeLink).toBeVisible({ timeout: 10000 });
      await stripeLink.click();
      await expect(page).toHaveURL(/\/donations\/stripe-import/);
    });

    test('Stripe Import page renders date range and action controls', async ({ page }) => {
      await page.goto('/donations/stripe-import');
      await expect(page).toHaveURL(/\/donations\/stripe-import/);

      const dateInputs = page.locator('input[type="date"]');
      await expect(dateInputs).toHaveCount(2, { timeout: 10000 });

      const previewBtn = page.locator('button').filter({ hasText: /^Preview$/ }).first();
      await expect(previewBtn).toBeVisible();
      await expect(previewBtn).toBeEnabled();

      // Import Missing is gated on a successful preview returning new events; without
      // running a real preview against Stripe, it should remain disabled.
      const importBtn = page.locator('button').filter({ hasText: /Import Missing/i }).first();
      await expect(importBtn).toBeVisible();
      await expect(importBtn).toBeDisabled();
    });
  });
});
