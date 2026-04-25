import { loggedInTest as test, expect } from './helpers/test-fixtures';
import { navigateTo, openPrimaryNav } from './helpers/navigation';

// Smoke coverage: every primary nav item opens its section, and every secondary
// item (reachable via its parent primary section) opens too. Mirrors the routes
// defined in helpers/navigation.ts so any addition there gets a smoke test here.
//
// Primary nav items for the demo user (from Header.tsx primaryMenu):
//   Dashboard, People, Donations, Serving, Sermons, Website, Mobile, Settings.
// Tasks is intentionally a SECONDARY item under Serving for users with plans
// access (the demo user); the primary "Tasks" entry only renders for users
// without plans access.
// Server Admin is gated on Permissions.membershipApi.server.admin and is not
// available to the demo user, so it is not exercised here.
test.describe('Primary Navigation', () => {
  test('opens Dashboard', async ({ page }) => {
    await navigateTo(page, 'dashboard');
    await expect(page).toHaveURL(/\/dashboard|\/$/);
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

  test('opens Tasks via Serving', async ({ page }) => {
    await navigateTo(page, 'tasks');
    await expect(page).toHaveURL(/\/serving\/tasks/);
  });

  test('opens Pages via Website', async ({ page }) => {
    await navigateTo(page, 'pages');
    await expect(page).toHaveURL(/\/site\/pages/);
  });

  test('opens Blocks via Website', async ({ page }) => {
    await navigateTo(page, 'blocks');
    await expect(page).toHaveURL(/\/site\/blocks/);
  });

  test('opens Appearance via Website', async ({ page }) => {
    await navigateTo(page, 'appearance');
    await expect(page).toHaveURL(/\/site\/appearance/);
  });

  test('opens Files via Website', async ({ page }) => {
    await navigateTo(page, 'files');
    await expect(page).toHaveURL(/\/site\/files/);
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
