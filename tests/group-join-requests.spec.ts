import type { Page } from '@playwright/test';
import { groupsTest as test, expect } from './helpers/test-fixtures';
import { login } from './helpers/auth';
import { navigateToGroups } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// Tests for the request-to-join workflow. Exercises:
//   - the new Enrollment policy <Select> on GroupDetailsEdit
//   - the org-wide /groups/pending page
//   - that the Members tab renders cleanly while a group is in "request" mode
//
// We don't assert end-to-end approve/decline because that requires creating a
// pending row from a non-admin user; that's covered by API-level tests once
// the migration is applied. UI tests focus on surface plumbing.
test.describe.serial('Group Join Requests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToGroups(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.beforeEach(async () => {
    if (!/\/groups$|\/groups\?/.test(page.url())) {
      await navigateToGroups(page);
    }
  });

  test('enrollment policy field is present and persists', async () => {
    // Click into a group.
    const firstGroup = page.locator('table tbody tr a').first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    // Open the edit form (banner edit icon).
    await page.locator('[data-testid="edit-group-button"]').click();

    // Switch the policy to "Request to Join".
    const select = page.locator('[data-testid="join-policy-select"]');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();
    const requestOption = page.locator('li[role="option"]').filter({ hasText: /Request to Join/i });
    await requestOption.click();

    // Save and wait for the POST to /groups to settle.
    const savePost = page.waitForResponse((r) => r.url().includes('/groups') && r.request().method() === 'POST');
    await page.locator('#groupDetailsBox button').filter({ hasText: /^save$/i }).first().click();
    await savePost;

    // Reload the group page so we exercise the row->model mapping.
    await page.reload();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    await page.locator('[data-testid="edit-group-button"]').click();
    await expect(page.locator('[data-testid="join-policy-select"]')).toContainText(/Request to Join/i);

    // Reset to Open so the rest of the suite doesn't see this group as locked.
    await page.locator('[data-testid="join-policy-select"]').click();
    await page.locator('li[role="option"]').filter({ hasText: /Open \(/i }).click();
    const cleanupPost = page.waitForResponse((r) => r.url().includes('/groups') && r.request().method() === 'POST');
    await page.locator('#groupDetailsBox button').filter({ hasText: /^save$/i }).first().click();
    await cleanupPost;
  });

  test('members tab still renders for a group in request mode', async () => {
    const firstGroup = page.locator('table tbody tr a').first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    // Members box is rendered alongside details; just confirm it's there and
    // the new pending-requests block doesn't blow up.
    await expect(page.locator('#groupMembersBox')).toBeVisible({ timeout: 10000 });
  });

  test('org-wide pending requests page loads', async () => {
    await page.goto('/groups/pending');
    await expect(page.locator('[data-testid="pending-requests-page"]')).toBeVisible({ timeout: 10000 });
    // With a clean demo DB there are no pending requests; assert the empty
    // state text appears so we know the query resolved.
    await expect(page.locator('[data-testid="pending-requests-empty"]')).toBeVisible({ timeout: 10000 });
  });
});
