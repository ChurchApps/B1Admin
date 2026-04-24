import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateTo, openPrimaryNav } from './helpers/navigation';

// Smoke coverage for intro.md: every primary nav item opens its section, and the
// common secondary items (reachable via their parent primary section) open too.
//
// Primary nav items for the demo user (from Header.tsx primaryMenu):
//   Dashboard, People, Donations, Serving, Sermons, Website, Mobile, Settings.
// Groups/Attendance/Forms/Calendars/Registrations are secondary items — the
// navigateTo() helper opens their parent first, then clicks the secondaryMenu link.
test.describe('Primary Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('opens People', async ({ page }) => {
    await navigateTo(page, 'people');
    await expect(page).toHaveURL(/\/people/);
  });

  test('opens Donations', async ({ page }) => {
    await navigateTo(page, 'donations');
    await expect(page).toHaveURL(/\/donations/);
  });

  test('opens Serving', async ({ page }) => {
    await navigateTo(page, 'serving');
    await expect(page).toHaveURL(/\/serving/);
  });

  test('opens Sermons', async ({ page }) => {
    await navigateTo(page, 'sermons');
    await expect(page).toHaveURL(/\/sermons/);
  });

  test('opens Website (Pages)', async ({ page }) => {
    await navigateTo(page, 'website');
    await expect(page).toHaveURL(/\/site\/pages/);
  });

  test('opens Mobile', async ({ page }) => {
    await navigateTo(page, 'mobile');
    await expect(page).toHaveURL(/\/mobile/);
  });

  test('opens Settings', async ({ page }) => {
    await navigateTo(page, 'settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('hamburger menu toggles', async ({ page }) => {
    await openPrimaryNav(page);
    const anyNavItem = page.locator('[data-testid^="nav-item-"]').first();
    await expect(anyNavItem).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Secondary Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('opens Groups via People', async ({ page }) => {
    await navigateTo(page, 'groups');
    await expect(page).toHaveURL(/\/groups/);
  });

  test('opens Attendance via People', async ({ page }) => {
    await navigateTo(page, 'attendance');
    await expect(page).toHaveURL(/\/attendance/);
  });

  test('opens Forms via Settings', async ({ page }) => {
    await navigateTo(page, 'forms');
    await expect(page).toHaveURL(/\/forms/);
  });

  test('opens Calendars via Website', async ({ page }) => {
    await navigateTo(page, 'calendars');
    await expect(page).toHaveURL(/\/calendars/);
  });

  test('opens Registrations via Website', async ({ page }) => {
    await navigateTo(page, 'registrations');
    await expect(page).toHaveURL(/\/registrations/);
  });

  test('opens Songs via Serving', async ({ page }) => {
    await navigateTo(page, 'songs');
    await expect(page).toHaveURL(/\/serving\/songs/);
  });

  test('opens Batches via Donations', async ({ page }) => {
    await navigateTo(page, 'batches');
    await expect(page).toHaveURL(/\/donations\/batches/);
  });

  test('opens Funds via Donations', async ({ page }) => {
    await navigateTo(page, 'funds');
    await expect(page).toHaveURL(/\/donations\/funds/);
  });

  test('opens Giving Statements via Donations', async ({ page }) => {
    await navigateTo(page, 'statements');
    await expect(page).toHaveURL(/\/donations\/statements/);
  });

  test('opens Playlists via Sermons', async ({ page }) => {
    await navigateTo(page, 'playlists');
    await expect(page).toHaveURL(/\/sermons\/playlists/);
  });

  test('opens Live Stream Times via Sermons', async ({ page }) => {
    await navigateTo(page, 'liveStreamTimes');
    await expect(page).toHaveURL(/\/sermons\/times/);
  });
});
