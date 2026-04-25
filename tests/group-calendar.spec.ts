import { loggedInTest as test, expect } from './helpers/test-fixtures';
import { navigateToCalendars } from './helpers/navigation';

// Curated Calendar admin coverage (Website → Calendars).
// Group-level event editing lives in B1App (the public site), not B1Admin —
// see .notes/B1Admin-test-judgment-log.md. B1Admin's role is creating curated
// calendars (CuratedCalendar = aggregation of group events for public display)
// and managing which groups feed into them.

const DISPOSABLE_CALENDAR = 'Octavian Test Curated Calendar';

async function openCalendarsPage(page: import('@playwright/test').Page) {
  await navigateToCalendars(page);
  await expect(page).toHaveURL(/\/calendars/, { timeout: 15000 });
  // Wait for the page header to render (loading state may show first)
  await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]'))
    .first().waitFor({ state: 'visible', timeout: 15000 });
  // Then wait for either the table body to populate or the empty state to settle —
  // the page-header Add button appears before /curatedCalendars resolves, so without
  // this wait we race the data fetch when looking up rows by name.
  await page.locator('table tbody tr').or(page.locator('[data-testid="empty-state-add-calendar"]'))
    .first().waitFor({ state: 'visible', timeout: 15000 });
}

async function findCalendarRow(page: import('@playwright/test').Page, name: string) {
  const row = page.locator('table tbody tr').filter({ hasText: name }).first();
  await row.waitFor({ state: 'visible', timeout: 15000 });
  return row;
}

// No beforeAll cleanup: it would run once per worker and race with the lifecycle
// describe.serial in another worker. The pretest reset-demo handles fresh state,
// and the final lifecycle test deletes the disposable calendar.

test.describe('Curated Calendars page', () => {
  test('renders Calendars page with Add Calendar affordance', async ({ page }) => {
    await openCalendarsPage(page);
    // Either the toolbar Add button or the empty-state Create button must be visible.
    const addBtn = page.locator('[data-testid="add-calendar"]');
    const emptyAddBtn = page.locator('[data-testid="empty-state-add-calendar"]');
    await expect(addBtn.or(emptyAddBtn).first()).toBeVisible();
  });

  test('opens the Create Calendar drawer when Add is clicked', async ({ page }) => {
    await openCalendarsPage(page);
    // Use whichever Add button is visible.
    const tlBtn = page.locator('[data-testid="add-calendar"]');
    const emptyBtn = page.locator('[data-testid="empty-state-add-calendar"]');
    if (await tlBtn.isVisible().catch(() => false)) {
      await tlBtn.click();
    } else {
      await emptyBtn.click();
    }
    await expect(page.locator('[data-testid="calendar-name-input"] input')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="save-calendar-button"]')).toBeVisible();
  });

  test('blocks Create with empty name (Create button disabled)', async ({ page }) => {
    await openCalendarsPage(page);
    const tlBtn = page.locator('[data-testid="add-calendar"]');
    const emptyBtn = page.locator('[data-testid="empty-state-add-calendar"]');
    if (await tlBtn.isVisible().catch(() => false)) {
      await tlBtn.click();
    } else {
      await emptyBtn.click();
    }
    // Save button is disabled until calendar.name has content.
    await expect(page.locator('[data-testid="save-calendar-button"]')).toBeDisabled();
  });
});

test.describe.serial('Curated calendar lifecycle', () => {
  test('creates a curated calendar', async ({ page }) => {
    await openCalendarsPage(page);
    const tlBtn = page.locator('[data-testid="add-calendar"]');
    const emptyBtn = page.locator('[data-testid="empty-state-add-calendar"]');
    if (await tlBtn.isVisible().catch(() => false)) {
      await tlBtn.click();
    } else {
      await emptyBtn.click();
    }
    await page.locator('[data-testid="calendar-name-input"] input').fill(DISPOSABLE_CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    // After save, the drawer closes (updatedCallback sets currentCalendar to null) and list refreshes.
    const row = page.locator('table tbody tr').filter({ hasText: DISPOSABLE_CALENDAR }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
  });

  test('navigates to the calendar detail page when row is clicked', async ({ page }) => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });
    // CalendarPage shows two cards: "Calendar Events" (with FullCalendar) and "Groups in Calendar".
    await expect(page.locator('text=Calendar Events').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Groups in Calendar').first()).toBeVisible({ timeout: 10000 });
  });

  test('detail page renders an empty state when no groups have been added', async ({ page }) => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });
    // The "no groups" empty state copy comes from calendars.calendarPage.noGroupsAdded.
    await expect(page.getByText(/No groups have been added|No groups added/i).first())
      .toBeVisible({ timeout: 10000 });
  });

  test('opens the edit drawer and renames the calendar', async ({ page }) => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.locator('[data-testid^="edit-calendar-"]').first().click();
    const input = page.locator('[data-testid="calendar-name-input"] input');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    const renamed = `${DISPOSABLE_CALENDAR} v2`;
    await input.fill(renamed);
    await page.locator('[data-testid="save-calendar-button"]').click();
    await expect(page.locator('table tbody tr').filter({ hasText: renamed }).first())
      .toBeVisible({ timeout: 15000 });
    // Rename back so cleanup test finds it.
    const renamedRow = page.locator('table tbody tr').filter({ hasText: renamed }).first();
    await renamedRow.locator('[data-testid^="edit-calendar-"]').first().click();
    await input.fill(DISPOSABLE_CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    await expect(page.locator('table tbody tr').filter({ hasText: DISPOSABLE_CALENDAR }).first())
      .toBeVisible({ timeout: 15000 });
  });

  test('deletes the curated calendar via the edit drawer', async ({ page }) => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.locator('[data-testid^="edit-calendar-"]').first().click();
    await page.locator('[data-testid="calendar-name-input"] input').waitFor({ state: 'visible', timeout: 10000 });
    page.once('dialog', async d => { await d.accept(); });
    await page.locator('[data-testid="delete-calendar-button"]').click();
    await expect(page.locator('table tbody tr').filter({ hasText: DISPOSABLE_CALENDAR }))
      .toHaveCount(0, { timeout: 15000 });
  });
});
