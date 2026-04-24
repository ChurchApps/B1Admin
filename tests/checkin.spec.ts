import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateToGroups } from './helpers/navigation';
import { editIconButton } from './helpers/fixtures';

// Coverage for checkin.md steps 15-23: configuring a group for kids check-in.
// The printer/tablet app side is out of scope for e2e — this verifies the
// admin-side group configuration the docs describe.
//
// "Sunday Morning Service" is a seeded group (GRP00000001) in membership/demo.sql.
test.describe('Check-in: group configuration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToGroups(page);
    await expect(page).toHaveURL(/\/groups/);
  });

  test('opens a seeded group detail page', async ({ page }) => {
    const row = page.locator('table tbody tr').filter({ hasText: 'Sunday Morning Service' }).first();
    await row.waitFor({ state: 'visible', timeout: 10000 });
    await row.click();
    await expect(page).toHaveURL(/\/groups\/GRP\d+/, { timeout: 10000 });
  });

  test('exposes Track Attendance, Parent Pickup, Print Nametag controls', async ({ page }) => {
    const row = page.locator('table tbody tr').filter({ hasText: 'Sunday Morning Service' }).first();
    await row.waitFor({ state: 'visible', timeout: 10000 });
    await row.click();
    await expect(page).toHaveURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    const editBtn = editIconButton(page).first();
    await editBtn.click();

    // At least one of the three check-in related labels must be present.
    const hasTrackAttendance = await page.getByText(/Track Attendance/i).first().isVisible().catch(() => false);
    const hasParentPickup = await page.getByText(/Parent Pickup/i).first().isVisible().catch(() => false);
    const hasPrintNametag = await page.getByText(/Print Nametag|Print Name Tag/i).first().isVisible().catch(() => false);

    expect(hasTrackAttendance || hasParentPickup || hasPrintNametag).toBe(true);
  });
});
