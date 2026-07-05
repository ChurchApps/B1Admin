import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { dismissSendInviteIfPresent, confirmDelete } from "./helpers/fixtures";

const CALENDAR = "Zacchaeus Reminder Calendar";
const EVENT_TITLE = "Zacchaeus Reminder Event";
const GROUP = "High School Youth";

const pad = (n: number) => n.toString().padStart(2, "0");
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const eventStart = new Date();
eventStart.setDate(eventStart.getDate() + 21);
eventStart.setHours(18, 0, 0, 0);
const eventEnd = new Date(eventStart);
eventEnd.setHours(20, 0, 0, 0);

const OFFSET_1_DAY = "reminder-offset-1440";
const OFFSET_7_DAYS = "reminder-offset-10080";

// Top-level routes; navigate directly, not via section nav.
async function gotoCalendars(page: Page) {
  await page.goto("/calendars");
  await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]'))
    .first().waitFor({ state: "visible", timeout: 15000 });
}

async function selectOption(page: Page, selectTestId: string, optionName: string | RegExp) {
  const combo = page.locator(`[data-testid="${selectTestId}"] [role="combobox"]`).first();
  await combo.click();
  const option = page.getByRole("option", { name: optionName }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
}

async function expandReminders(page: Page) {
  const toggle = page.locator('[data-testid="reminder-enabled-toggle"]');
  if (await toggle.isVisible({ timeout: 500 }).catch(() => false)) return;
  await page.getByText("Reminders", { exact: true }).first().click();
  await toggle.waitFor({ state: "visible", timeout: 10000 });
}

async function setEnabled(page: Page, on: boolean) {
  const toggle = page.locator('[data-testid="reminder-enabled-toggle"]');
  const checked = await toggle.isChecked();
  if (checked !== on) await toggle.click();
}

async function openRegistrationDetails(page: Page, eventId: string) {
  await page.goto(`/registrations/${eventId}`);
  // RegistrationDetailsPage renders the PageHeader once the event GET resolves.
  await page.getByText(EVENT_TITLE, { exact: false }).first().waitFor({ state: "visible", timeout: 15000 });
  await expandReminders(page);
}

test.describe.serial("Event reminders editor", () => {
  let page: Page;
  let eventId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    // Best-effort cleanup of the disposable calendar.
    try {
      await gotoCalendars(page);
      const editBtn = page.locator("table tbody tr").filter({ hasText: CALENDAR }).locator('[data-testid^="edit-calendar-"]').first();
      if (await editBtn.count().then((c) => c > 0).catch(() => false)) {
        await editBtn.click();
        await page.locator('[data-testid="calendar-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
        await page.locator('[data-testid="delete-calendar-button"]').click();
        await confirmDelete(page);
      }
    } catch { /* ignore */ }
    await page?.context().close();
  });

  test("creates an event with reminders enabled (new-event flow)", async () => {
    // Create a disposable calendar to host the event, then open it.
    await gotoCalendars(page);
    await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]')).first().click();
    await page.locator('[data-testid="calendar-name-input"] input').fill(CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    const row = page.locator("table tbody tr").filter({ hasText: CALENDAR }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator("a").first().click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });

    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-group-select", GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill(EVENT_TITLE);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(eventStart));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(eventEnd));

    await expandReminders(page);
    await setEnabled(page, true);
    // Pick non-default offset so saved state is unambiguously test-chosen.
    const oneDay = page.locator(`[data-testid="${OFFSET_1_DAY}"]`);
    const sevenDays = page.locator(`[data-testid="${OFFSET_7_DAYS}"]`);
    await sevenDays.click();
    await page.locator('[data-testid="reminder-time-input"] input').fill("08:30");
    await selectOption(page, "reminder-recipient-mode-select", "Group members");
    await expect(page.locator('[data-testid="reminder-channel-push"] input')).toBeChecked();
    await expect(page.locator('[data-testid="reminder-channel-email"] input')).toBeChecked();
    await expect(oneDay).toBeVisible();
    await expect(sevenDays).toBeVisible();

    const eventPost = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="new-event-save-button"]').click();
    const resp = await eventPost;
    const created = await resp.json();
    eventId = (Array.isArray(created) ? created[0]?.id : created?.id) as string;
    expect(eventId, "created event id").toBeTruthy();

    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });
    await dismissSendInviteIfPresent(page).catch(() => { });
  });

  test("round-trips the saved reminder through the Registration Details page (GET)", async () => {
    await openRegistrationDetails(page, eventId);

    await expect(page.locator('[data-testid="reminder-enabled-toggle"]')).toBeChecked();

    // Can't read MUI color, but chips and saved values must round-trip.
    await expect(page.locator(`[data-testid="${OFFSET_1_DAY}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="${OFFSET_7_DAYS}"]`)).toBeVisible();

    await expect(page.locator('[data-testid="reminder-time-input"] input')).toHaveValue("08:30");
    await expect(page.locator('[data-testid="reminder-recipient-mode-select"]')).toContainText("Group members");
    await expect(page.locator('[data-testid="reminder-channel-push"] input')).toBeChecked();
    await expect(page.locator('[data-testid="reminder-channel-email"] input')).toBeChecked();
  });

  test("renders a live preview with a recipient count", async () => {
    await expandReminders(page);
    const preview = page.locator('[data-testid="reminder-preview"]');
    // Debounced GET preview endpoint resolves demo group recipient count.
    await expect(preview).toContainText("will be reminded", { timeout: 15000 });
  });

  test("edits and upserts the reminder (POST), then disables it (DELETE)", async () => {
    await openRegistrationDetails(page, eventId);

    await page.locator('[data-testid="reminder-time-input"] input').fill("07:15");
    await page.locator('[data-testid="reminder-channel-push"] input').uncheck();
    const upsert = page.waitForResponse((r) => /\/messaging\/reminders\/event\//.test(r.url()) && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await upsert;

    await openRegistrationDetails(page, eventId);
    await expect(page.locator('[data-testid="reminder-time-input"] input')).toHaveValue("07:15");
    await expect(page.locator('[data-testid="reminder-channel-push"] input')).not.toBeChecked();
    await expect(page.locator('[data-testid="reminder-channel-email"] input')).toBeChecked();

    await setEnabled(page, false);
    const del = page.waitForResponse((r) => /\/messaging\/reminders\//.test(r.url()) && r.request().method() === "DELETE" && r.ok(), { timeout: 15000 });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await del;

    await openRegistrationDetails(page, eventId);
    await expect(page.locator('[data-testid="reminder-enabled-toggle"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="reminder-time-input"]')).toHaveCount(0);
  });
});
