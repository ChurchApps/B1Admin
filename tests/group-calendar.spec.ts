import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToCalendars } from "./helpers/navigation";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Curated Calendar admin coverage (Website → Calendars).
// Group-level event editing lives in B1App (the public site), not B1Admin —
// see .notes/B1Admin-test-judgment-log.md. B1Admin's role is creating curated
// calendars (CuratedCalendar = aggregation of group events for public display)
// and managing which groups feed into them.

const DISPOSABLE_CALENDAR = "Zacchaeus Test Curated Calendar";

async function openCalendarsPage(page: import("@playwright/test").Page) {
  await navigateToCalendars(page);
  await expect(page).toHaveURL(/\/calendars/, { timeout: 15000 });
  // Wait for the page header to render (loading state may show first)
  await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]'))
    .first().waitFor({ state: "visible", timeout: 15000 });
  // Then wait for either the table body to populate or the empty state to settle —
  // the page-header Add button appears before /curatedCalendars resolves, so without
  // this wait we race the data fetch when looking up rows by name.
  await page.locator("table tbody tr").or(page.locator('[data-testid="empty-state-add-calendar"]'))
    .first().waitFor({ state: "visible", timeout: 15000 });
}

async function findCalendarRow(page: import("@playwright/test").Page, name: string) {
  const row = page.locator("table tbody tr").filter({ hasText: name }).first();
  await row.waitFor({ state: "visible", timeout: 15000 });
  return row;
}

// No beforeAll cleanup: it would run once per worker and race with the lifecycle
// describe.serial in another worker. The pretest reset-demo handles fresh state,
// and the final lifecycle test deletes the disposable calendar.

test.describe("Curated Calendars page", () => {
  test("renders Calendars page with Add Calendar affordance", async ({ page }) => {
    await openCalendarsPage(page);
    // Either the toolbar Add button or the empty-state Create button must be visible.
    const addBtn = page.locator('[data-testid="add-calendar"]');
    const emptyAddBtn = page.locator('[data-testid="empty-state-add-calendar"]');
    await expect(addBtn.or(emptyAddBtn).first()).toBeVisible();
  });

  test("opens the Create Calendar drawer when Add is clicked", async ({ page }) => {
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

  test("blocks Create with empty name (Create button disabled)", async ({ page }) => {
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

test.describe.serial("Curated calendar lifecycle", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("creates a curated calendar", async () => {
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
    const row = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_CALENDAR }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
  });

  test("navigates to the calendar detail page when row is clicked", async () => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });
    // CalendarPage shows two cards: "Calendar Events" (with FullCalendar) and "Groups in Calendar".
    await expect(page.locator("text=Calendar Events").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Groups in Calendar").first()).toBeVisible({ timeout: 10000 });
  });

  test("detail page renders an empty state when no groups have been added", async () => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });
    // The "no groups" empty state copy comes from calendars.calendarPage.noGroupsAdded.
    await expect(page.getByText(/No groups have been added|No groups added/i).first())
      .toBeVisible({ timeout: 10000 });
  });

  test("opens the edit drawer and renames the calendar", async () => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.locator('[data-testid^="edit-calendar-"]').first().click();
    const input = page.locator('[data-testid="calendar-name-input"] input');
    await input.waitFor({ state: "visible", timeout: 10000 });
    const renamed = `${DISPOSABLE_CALENDAR} v2`;
    await input.fill(renamed);
    await page.locator('[data-testid="save-calendar-button"]').click();
    await expect(page.locator("table tbody tr").filter({ hasText: renamed }).first())
      .toBeVisible({ timeout: 15000 });
    // Rename back so cleanup test finds it.
    const renamedRow = page.locator("table tbody tr").filter({ hasText: renamed }).first();
    await renamedRow.locator('[data-testid^="edit-calendar-"]').first().click();
    await input.fill(DISPOSABLE_CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    await expect(page.locator("table tbody tr").filter({ hasText: DISPOSABLE_CALENDAR }).first())
      .toBeVisible({ timeout: 15000 });
  });

  test("deletes the curated calendar via the edit drawer", async () => {
    await openCalendarsPage(page);
    const row = await findCalendarRow(page, DISPOSABLE_CALENDAR);
    await row.locator('[data-testid^="edit-calendar-"]').first().click();
    await page.locator('[data-testid="calendar-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
    page.once("dialog", async d => { await d.accept(); });
    await page.locator('[data-testid="delete-calendar-button"]').click();
    await expect(page.locator("table tbody tr").filter({ hasText: DISPOSABLE_CALENDAR }))
      .toHaveCount(0, { timeout: 15000 });
  });
});

// NewEventModal's Recurring checkbox (restored in place of the old daily/weekly/monthly
// dropdown) reveals apphelper's RRuleEditor. Own disposable calendar + serial chain so this
// doesn't interleave with the lifecycle chain above.
const RECURRING_CALENDAR = "Zacchaeus Recurring Test Calendar";
const RECURRING_EVENT_TITLE = "Zacchaeus Recurring Test Event";
const RECURRING_GROUP = "High School Youth";

const pad2 = (n: number) => n.toString().padStart(2, "0");
const toInputValue = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

test.describe.serial("New Event modal — Recurring", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);

    await openCalendarsPage(page);
    const tlBtn = page.locator('[data-testid="add-calendar"]');
    const emptyBtn = page.locator('[data-testid="empty-state-add-calendar"]');
    if (await tlBtn.isVisible().catch(() => false)) await tlBtn.click(); else await emptyBtn.click();
    await page.locator('[data-testid="calendar-name-input"] input').fill(RECURRING_CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    const row = page.locator("table tbody tr").filter({ hasText: RECURRING_CALENDAR }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });
  });

  test.afterAll(async () => {
    // Best-effort cleanup of the disposable calendar (deleting it also removes curatedEvents rows).
    try {
      await openCalendarsPage(page);
      const row = page.locator("table tbody tr").filter({ hasText: RECURRING_CALENDAR }).first();
      await row.locator('[data-testid^="edit-calendar-"]').first().click();
      await page.locator('[data-testid="calendar-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
      page.once("dialog", async (d) => { await d.accept(); });
      await page.locator('[data-testid="delete-calendar-button"]').click();
    } catch { /* ignore */ }
    await page?.context().close();
  });

  test("Recurring checkbox reveals RRuleEditor frequency/interval/weekday/end controls", async () => {
    await page.locator('[data-testid="new-event-button"]').click();
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toBeVisible({ timeout: 10000 });

    const groupSelect = page.locator('[data-testid="new-event-group-select"] [role="combobox"]');
    await groupSelect.click();
    await page.getByRole("option", { name: RECURRING_GROUP }).click();

    await page.locator('[data-testid="new-event-title-input"] input').fill(RECURRING_EVENT_TITLE);
    const start = new Date();
    start.setDate(start.getDate() + 14);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19, 0, 0, 0);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInputValue(start));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInputValue(end));

    // The old daily/weekly/monthly dropdown is gone — RRuleEditor only renders once Recurring is checked.
    const recurringCheckbox = page.locator('[data-testid="new-event-recurring-checkbox"]');
    await expect(recurringCheckbox).toBeVisible();
    await expect(page.locator('[data-testid="recurrence-frequency-select"]')).toHaveCount(0);
    await recurringCheckbox.click();

    const freqSelect = page.locator('[data-testid="recurrence-frequency-select"]');
    await expect(freqSelect).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="recurrence-interval-input"] input')).toBeVisible();
    await expect(page.locator('[data-testid="recurrence-ends-select"]')).toBeVisible();

    // Switch frequency to Week — weekday toggle buttons appear (7 of them).
    await freqSelect.click();
    await page.getByRole("option", { name: "Week" }).click();
    await expect(page.locator('[data-testid^="weekday-"]')).toHaveCount(7, { timeout: 10000 });

    // Switch Ends to "After" N occurrences — the occurrences count input appears.
    const endsSelect = page.locator('[data-testid="recurrence-ends-select"]');
    await endsSelect.click();
    await page.getByRole("option", { name: "After" }).click();
    await expect(page.locator('[data-testid="recurrence-count-input"] input')).toBeVisible({ timeout: 10000 });

    // Unchecking Recurring removes the RRuleEditor entirely.
    await recurringCheckbox.click();
    await expect(page.locator('[data-testid="recurrence-frequency-select"]')).toHaveCount(0);

    await page.locator('[data-testid="new-event-cancel-button"]').click();
  });

  test("saves a recurring event with a persisted recurrence rule", async () => {
    await page.locator('[data-testid="new-event-button"]').click();
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toBeVisible({ timeout: 10000 });

    const groupSelect = page.locator('[data-testid="new-event-group-select"] [role="combobox"]');
    await groupSelect.click();
    await page.getByRole("option", { name: RECURRING_GROUP }).click();

    await page.locator('[data-testid="new-event-title-input"] input').fill(RECURRING_EVENT_TITLE);
    const start = new Date();
    start.setDate(start.getDate() + 14);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19, 0, 0, 0);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInputValue(start));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInputValue(end));

    await page.locator('[data-testid="new-event-recurring-checkbox"]').click();
    await expect(page.locator('[data-testid="recurrence-frequency-select"]')).toBeVisible({ timeout: 10000 });

    const eventPost = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="new-event-save-button"]').click();
    const resp = await eventPost;
    const created = await resp.json();
    // The POST response body is the saved entity — the recurrence rule persisted.
    expect(created[0]?.recurrenceRule, "saved recurrenceRule").toContain("FREQ=DAILY");

    // Modal closes on success. (The "Groups in Calendar" card only lists groups the
    // current user belongs to — /groups/my — so it's not a reliable save signal.)
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });
  });
});
