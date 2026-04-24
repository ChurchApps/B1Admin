import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateToDonations } from './helpers/navigation';

// Coverage for donation-report.md steps 29-35 (Giving Statements + Stripe Import).
// Existing donations.spec.ts covers funds + batches + donation entry.
// This fills the statements / Stripe gap.
test.describe('Donation Statements and Stripe Import', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDonations(page);
    await expect(page).toHaveURL(/\/donations/);
  });

  test('opens Giving Statements from Donations', async ({ page }) => {
    const statementsLink = page
      .locator('[id="secondaryMenu"] a, a, button')
      .filter({ hasText: /Giving Statements|Statements/i })
      .first();
    await expect(statementsLink).toBeVisible({ timeout: 10000 });
    await statementsLink.click();

    const yearSelectOrPrintBtn = page
      .locator('select, input[type="number"], button')
      .filter({ hasText: /Print|Download|Year|\d{4}/ })
      .first();
    await expect(yearSelectOrPrintBtn).toBeVisible({ timeout: 10000 });
  });

  test('opens Stripe Import from Batches page', async ({ page }) => {
    const batchesLink = page
      .locator('[id="secondaryMenu"] a, a, button')
      .filter({ hasText: /Batches/i })
      .first();
    if (await batchesLink.isVisible().catch(() => false)) {
      await batchesLink.click();
    }

    const stripeLink = page
      .locator('a, button')
      .filter({ hasText: /Stripe Import|Import from Stripe/i })
      .first();
    // Stripe import is only exposed when the Stripe integration is configured.
    // Demo data does not provision Stripe — this link may not appear; if so, skip.
    if (!(await stripeLink.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Stripe import not configured in demo — link not rendered');
    }
    await stripeLink.click();

    const dateRangeControl = page.locator('input[type="date"], [placeholder*="date" i]').first();
    await expect(dateRangeControl).toBeVisible({ timeout: 10000 });
  });
});
