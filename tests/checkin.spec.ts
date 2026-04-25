import { groupsTest as test, expect } from './helpers/test-fixtures';
import { editIconButton } from './helpers/fixtures';

// Coverage scope: checkin.md steps 19-23 — configuring a group for kids check-in.
// Steps 1-7 (people), 8-14 (campus/service/service-time), and 15-18 (group create)
// are exercised by people.spec, attendance.spec, and groups.spec respectively.
// The printer/tablet runtime side is out of scope for e2e.
//
// Anchored to the seed group "Sunday Morning Service" (GRP00000001) which is
// configured as: trackAttendance=Yes, parentPickup=No, printNametag=Yes,
// and assigned to the 9:00 AM and 10:30 AM service times.
test.describe('Check-in: group configuration', () => {
  // Step 19: "Click on the group you just created to configure it for check-in."
  test('opens a seeded group detail page from the list', async ({ page }) => {
    await page.getByRole('link', { name: 'Sunday Morning Service', exact: true }).click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
  });

  // Step 21 (display): the documented attendance settings are rendered with seed values.
  test('displays Track Attendance, Parent Pickup, Print Nametag from seed', async ({ page }) => {
    await page.getByRole('link', { name: 'Sunday Morning Service', exact: true }).click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    await expect(page.getByText('Track Attendance').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Parent Pickup').first()).toBeVisible();
    await expect(page.getByText(/Print Nametag|Print Name Tag/i).first()).toBeVisible();
  });

  // Step 20-21 (edit form): "Click the edit pencil... Configure your attendance settings."
  // The edit form must expose all three Yes/No selects so they can be toggled.
  test('edit form exposes Track Attendance, Parent Pickup, Print Nametag selects', async ({ page }) => {
    await page.getByRole('link', { name: 'Sunday Morning Service', exact: true }).click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    await editIconButton(page).first().click();

    await expect(page.locator('[data-cy="select-attendance-type"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[name="parentPickup"]')).toBeVisible();
    await expect(page.locator('[name="printNametag"]')).toBeVisible();

    // Cancel out without mutating — other tests share this seed group.
    await page.locator('button').getByText('Cancel').click();
  });

  // Step 22: "select labels that apply to this group, then choose a service time from the dropdown".
  // Verify the group's seed service-time assignments are visible on the detail page.
  test('shows assigned service times for the group', async ({ page }) => {
    await page.getByRole('link', { name: 'Sunday Morning Service', exact: true }).click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    // GRP00000001 is assigned to SST00000001 (9:00 AM Service) and SST00000002 (10:30 AM Service).
    await expect(page.getByText('9:00 AM Service').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('10:30 AM Service').first()).toBeVisible();
  });

  // Step 22-23 (edit form): the Add Service Time select must offer available service times.
  test('edit form lists available service times for assignment', async ({ page }) => {
    await page.getByRole('link', { name: 'Sunday Morning Service', exact: true }).click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    await editIconButton(page).first().click();

    const select = page.locator('[data-cy="choose-service-time"]');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();

    // Service times are rendered with their longName ("<service> - <time>"),
    // e.g. "Sunday Morning Service - 9:00 AM Service".
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await expect(options.filter({ hasText: '9:00 AM Service' }).first()).toBeVisible();

    await page.keyboard.press('Escape');
    await page.locator('button').getByText('Cancel').click();
  });

  // Step 21 (round-trip): toggle Parent Pickup from No to Yes, save, verify display
  // updates, then revert. Validates the documented configure-and-save workflow end to end.
  test('saves a Parent Pickup toggle and reflects it in the display', async ({ page }) => {
    await page.getByRole('link', { name: 'Sunday Morning Service', exact: true }).click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    // The clickable MUI Select is the role=combobox; [name="parentPickup"] is a
    // hidden native input that intercepts pointer events when targeted directly.
    const parentPickupCombo = page.locator('#mui-component-select-parentPickup');

    // Open edit, flip Parent Pickup to Yes.
    await editIconButton(page).first().click();
    await expect(parentPickupCombo).toBeVisible({ timeout: 10000 });
    await parentPickupCombo.click();
    await page.getByRole('option', { name: 'Yes', exact: true }).click();

    const groupSavePromise = page.waitForResponse(
      (r) => r.url().includes('/groups') && r.request().method() === 'POST',
      { timeout: 10000 }
    );
    await page.locator('button').getByText('Save').click();
    await groupSavePromise;

    // Edit form closes (display mode restored) — the editable combobox disappears.
    await expect(parentPickupCombo).toHaveCount(0, { timeout: 10000 });

    // GroupBanner renders each attendance flag as <icon><label> in a Stack:
    // CheckCircleIcon when true, CancelIcon when false. After flipping
    // parentPickup to Yes, the row for "Parent Pickup" shows a CheckCircleIcon.
    const parentPickupRow = page.getByText('Parent Pickup', { exact: true }).locator('..');
    await expect(parentPickupRow.locator('svg[data-testid="CheckCircleIcon"]')).toBeVisible({ timeout: 10000 });

    // Revert to No so seed state is preserved for parallel/subsequent runs.
    await editIconButton(page).first().click();
    await expect(parentPickupCombo).toBeVisible({ timeout: 10000 });
    await parentPickupCombo.click();
    await page.getByRole('option', { name: 'No', exact: true }).click();
    const revertPromise = page.waitForResponse(
      (r) => r.url().includes('/groups') && r.request().method() === 'POST',
      { timeout: 10000 }
    );
    await page.locator('button').getByText('Save').click();
    await revertPromise;
    await expect(parentPickupCombo).toHaveCount(0, { timeout: 10000 });
    await expect(parentPickupRow.locator('svg[data-testid="CancelIcon"]')).toBeVisible({ timeout: 10000 });
  });
});
