import { loggedInTest as test, expect } from './helpers/test-fixtures';
import { navigateToMobile } from './helpers/navigation';

// Coverage for ChurchAppsSupport/b1Admin/mobile-admin.md (Tabs tutorial).
// Mobile App Settings lives at /mobile/navigation. Source files:
//   - src/settings/MobileAppSettingsPage.tsx (page shell, Add Tab, list)
//   - src/settings/components/AppTabs.tsx     (tab list w/ Edit/Move/Up/Down)
//   - src/settings/components/AppEdit.tsx     (create/edit/delete drawer)

const DISPOSABLE_TAB = 'Octavian Test Tab';

async function openMobileSettings(page: import('@playwright/test').Page) {
  await navigateToMobile(page);
  // Default /mobile redirects to /mobile/navigation.
  await page.waitForURL(/\/mobile\/navigation/, { timeout: 15000 });
  // PageHeader renders the title in #page-header-title (h3) and subtitle in #page-header-subtitle.
  // Anchor on the title id to avoid getByRole heading strict-mode collision with the subtitle.
  await page.locator('#page-header-title').filter({ hasText: 'Mobile App Settings' })
    .waitFor({ state: 'visible', timeout: 15000 });
}

async function openAddTabDrawer(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /^Add Tab$/i }).first().click();
  // The AppEdit drawer renders a CardWithHeader titled "Add Tab".
  await page.locator('input[name="text"]').waitFor({ state: 'visible', timeout: 10000 });
}

async function selectMuiByLabel(page: import('@playwright/test').Page, labelText: string, optionText: string) {
  const select = page.getByLabel(labelText, { exact: true }).first();
  await select.click();
  const option = page.locator('li[role="option"]', { hasText: new RegExp(`^${optionText}$`, 'i') }).first();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
  await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
}

async function findTabRow(page: import('@playwright/test').Page, tabName: string) {
  // AppTabs renders the tab name as a Typography subtitle1 (level-6 heading) inside an MUI ListItem.
  // First wait for the heading itself to confirm the tab exists in the list, then return the
  // listitem via filter-has so we can scope subsequent button lookups (Edit Tab, Move Up, etc.).
  const heading = page.getByRole('heading', { level: 6, name: tabName, exact: true });
  await heading.first().waitFor({ state: 'visible', timeout: 15000 });
  return page.getByRole('listitem').filter({ has: heading }).first();
}

test.describe('Mobile App Settings page', () => {
  test('renders the page with header, subtitle, and Add Tab button', async ({ page }) => {
    await openMobileSettings(page);
    await expect(page.locator('#page-header-title')).toContainText('Mobile App Settings');
    await expect(page.locator('#page-header-subtitle')).toContainText('Configure mobile app settings');
    await expect(page.getByRole('button', { name: /^Add Tab$/ }).first()).toBeVisible();
  });

  test('shows the App Tabs card heading', async ({ page }) => {
    await openMobileSettings(page);
    await expect(page.getByText('App Tabs').first()).toBeVisible({ timeout: 15000 });
  });

  test('opens Add Tab drawer with Name, Type, Visibility, and Save controls', async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    // Tab Name input
    await expect(page.locator('input[name="text"]')).toBeVisible();
    // Tab Type select (uses InputLabel "Tab Type")
    await expect(page.getByLabel('Tab Type')).toBeVisible();
    // Visibility select
    await expect(page.getByLabel('Visibility')).toBeVisible();
    // Save Tab button
    await expect(page.getByRole('button', { name: /Save Tab/i })).toBeVisible();
  });

  test('Tab Type dropdown exposes documented options (Bible, Live Stream, Donation, External URL)', async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.getByLabel('Tab Type').click();
    await expect(page.locator('li[role="option"]', { hasText: /^Bible$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('li[role="option"]', { hasText: /^Live Stream$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^Donation$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^External URL$/ })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Visibility dropdown exposes documented options including Specific Groups', async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.getByLabel('Visibility').click();
    await expect(page.locator('li[role="option"]', { hasText: /Everyone/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('li[role="option"]', { hasText: /Logged-in Users/i })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /Specific Groups/i })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('switching Tab Type to External URL surfaces the URL field', async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await selectMuiByLabel(page, 'Tab Type', 'External URL');
    await expect(page.locator('input[name="url"]')).toBeVisible({ timeout: 10000 });
  });

  test('switching Visibility to Specific Groups surfaces the group picker', async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await selectMuiByLabel(page, 'Visibility', 'Specific Groups...');
    // The group picker section displays "Select Groups:" or "No groups found"
    await expect(page.getByText(/Select Groups|No groups found/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe.serial('Mobile tab lifecycle', () => {
  test('creates a new External URL tab', async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(DISPOSABLE_TAB);
    await selectMuiByLabel(page, 'Tab Type', 'External URL');
    await page.locator('input[name="url"]').fill('https://example.org');
    await page.getByRole('button', { name: /Save Tab/i }).click();
    // After save the drawer closes and AppTabs refreshes via refreshKey.
    await findTabRow(page, DISPOSABLE_TAB);
  });

  test('opens the existing tab in the edit drawer with delete affordance', async ({ page }) => {
    await openMobileSettings(page);
    const row = await findTabRow(page, DISPOSABLE_TAB);
    // Edit button has the Tooltip title "Edit Tab" — clickable IconButton.
    await row.getByRole('button', { name: /Edit Tab/i }).click();
    // Drawer should show Edit Tab header + Delete Tab button.
    await expect(page.locator('input[name="text"]')).toHaveValue(DISPOSABLE_TAB, { timeout: 10000 });
    await expect(page.getByRole('button', { name: /Delete Tab/i })).toBeVisible();
  });

  test('deletes the disposable tab', async ({ page }) => {
    await openMobileSettings(page);
    const row = await findTabRow(page, DISPOSABLE_TAB);
    await row.getByRole('button', { name: /Edit Tab/i }).click();
    await page.locator('input[name="text"]').waitFor({ state: 'visible', timeout: 10000 });
    page.once('dialog', async d => { await d.accept(); });
    await page.getByRole('button', { name: /Delete Tab/i }).click();
    // Tab should disappear from the list.
    await expect(page.getByRole('heading', { level: 6, name: DISPOSABLE_TAB, exact: true }))
      .toHaveCount(0, { timeout: 15000 });
  });
});
