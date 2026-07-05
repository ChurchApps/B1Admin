import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToRoomsResources, navigateToApprovals, navigateToCalendars } from "./helpers/navigation";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// Rooms & resources admin (roadmap 2.7/2.8): CRUD, double-booking warnings, approval routing, .ics import.
const HALL = "Zacchaeus Hall";
const RESTRICTED_ROOM = "Zacchaeus Restricted Room";
const PROJECTOR = "Zacchaeus Projector";
const TEMPLATE = "Zacchaeus Template";
const CALENDAR = "Zacchaeus Facility Calendar";
const APPROVAL_GROUP = "High School Youth";

const pad = (n: number) => n.toString().padStart(2, "0");
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const eventDay = new Date();
eventDay.setDate(eventDay.getDate() + 14);
const eventStart = new Date(eventDay);
eventStart.setHours(18, 0, 0, 0);
const eventEnd = new Date(eventDay);
eventEnd.setHours(20, 0, 0, 0);

const blockoutStart = new Date(eventDay);
blockoutStart.setDate(blockoutStart.getDate() + 7);
blockoutStart.setHours(8, 0, 0, 0);
const blockoutEnd = new Date(blockoutStart);
blockoutEnd.setHours(22, 0, 0, 0);

const ICS_SAMPLE = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Zacchaeus Test//EN",
  "BEGIN:VEVENT",
  "DTSTART:20270115T180000",
  "DTEND:20270115T200000",
  "SUMMARY:Zacchaeus ICS Event One",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20270122T180000",
  "DTEND:20270122T200000",
  "SUMMARY:Zacchaeus ICS Event Two",
  "END:VEVENT",
  "END:VCALENDAR"
].join("\n");

async function selectOption(page: Page, selectTestId: string, optionName: string | RegExp, multiple = false) {
  // TextField select renders the clickable combobox inside the FormControl root.
  const root = page.locator(`[data-testid="${selectTestId}"]`);
  const combo = root.locator('[role="combobox"]').first();
  await combo.click();
  const option = page.getByRole("option", { name: optionName }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  if (multiple) {
    await page.keyboard.press("Escape");
    await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
  }
}

async function openTab(page: Page, tab: "rooms" | "resources" | "blockouts" | "templates") {
  await page.locator(`[data-testid="tab-${tab}"]`).click();
}

// Idempotent: serial-chain retries re-run cleanup, so already-deleted rows are skipped.
async function deleteViaEdit(page: Page, editButton: import("@playwright/test").Locator, deleteTestId: string) {
  const present = await editButton.count().then((c) => c > 0).catch(() => false);
  if (!present) return;
  await editButton.click();
  const deleteBtn = page.locator(`[data-testid="${deleteTestId}"]`);
  await deleteBtn.waitFor({ state: "visible", timeout: 10000 });
  await deleteBtn.click();
  await confirmDelete(page);
}

test.describe.serial("Rooms, resources & approvals", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("renders the Rooms & Resources page with all four tabs", async () => {
    await navigateToRoomsResources(page);
    await expect(page.locator('[data-testid="tab-rooms"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="tab-resources"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-blockouts"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-templates"]')).toBeVisible();
  });

  test("creates a room", async () => {
    await page.locator('[data-testid="add-room-resource"]').click();
    await page.locator('[data-testid="room-name-input"] input').fill(HALL);
    await page.locator('[data-testid="room-capacity-input"] input').fill("80");
    await page.locator('[data-testid="save-room-button"]').click();
    await expect(page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: HALL })).toBeVisible({ timeout: 15000 });
  });

  test("creates a room that requires approval", async () => {
    await page.locator('[data-testid="add-room-resource"]').click();
    await page.locator('[data-testid="room-name-input"] input').fill(RESTRICTED_ROOM);
    await selectOption(page, "room-approval-group-select", APPROVAL_GROUP);
    await page.locator('[data-testid="save-room-button"]').click();
    const row = page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: RESTRICTED_ROOM });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText(APPROVAL_GROUP);
  });

  test("creates a resource with a quantity", async () => {
    await openTab(page, "resources");
    await page.locator('[data-testid="add-room-resource"]').click();
    await page.locator('[data-testid="resource-name-input"] input').fill(PROJECTOR);
    await page.locator('[data-testid="resource-quantity-input"] input').fill("2");
    await page.locator('[data-testid="save-resource-button"]').click();
    await expect(page.locator('[data-testid="resources-table"] tbody tr').filter({ hasText: PROJECTOR })).toBeVisible({ timeout: 15000 });
  });

  test("creates a blockout for the room", async () => {
    await openTab(page, "blockouts");
    await page.locator('[data-testid="add-room-resource"]').click();
    await selectOption(page, "blockout-target-select", HALL);
    await page.locator('[data-testid="blockout-start-input"] input').fill(toInput(blockoutStart));
    await page.locator('[data-testid="blockout-end-input"] input').fill(toInput(blockoutEnd));
    await page.locator('[data-testid="blockout-reason-input"] input').fill("Zacchaeus Maintenance");
    await page.locator('[data-testid="save-blockout-button"]').click();
    await expect(page.locator('[data-testid="blockouts-table"] tbody tr').filter({ hasText: "Zacchaeus Maintenance" })).toBeVisible({ timeout: 15000 });
  });

  test("creates an event template", async () => {
    await openTab(page, "templates");
    await page.locator('[data-testid="add-room-resource"]').click();
    await page.locator('[data-testid="template-name-input"] input').fill(TEMPLATE);
    await page.locator('[data-testid="template-title-input"] input').fill("Zacchaeus Template Event");
    await page.locator('[data-testid="template-duration-input"] input').fill("90");
    await selectOption(page, "template-rooms-select", HALL, true);
    await page.locator('[data-testid="save-template-button"]').click();
    await expect(page.locator('[data-testid="templates-table"] tbody tr').filter({ hasText: TEMPLATE })).toBeVisible({ timeout: 15000 });
  });

  test("creates a curated calendar and schedules a new event with a room", async () => {
    await navigateToCalendars(page);
    await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]')).first().click();
    await page.locator('[data-testid="calendar-name-input"] input').fill(CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    const row = page.locator("table tbody tr").filter({ hasText: CALENDAR }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator("a").first().click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });

    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-group-select", APPROVAL_GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill("Zacchaeus Event A");
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(eventStart));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(eventEnd));
    await selectOption(page, "new-event-rooms-select", HALL, true);
    await page.locator('[data-testid="new-event-save-button"]').click();
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });
  });

  test("applying a template prefills the event details", async () => {
    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-template-select", TEMPLATE);
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue("Zacchaeus Template Event");
    await page.locator('[data-testid="new-event-cancel-button"]').click();
  });

  test("warns about a double-booked room before saving", async () => {
    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-group-select", APPROVAL_GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill("Zacchaeus Event B");
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(eventStart));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(eventEnd));
    await selectOption(page, "new-event-rooms-select", HALL, true);
    const warnings = page.locator('[data-testid="new-event-conflict-warnings"]');
    await expect(warnings).toBeVisible({ timeout: 15000 });
    await expect(warnings).toContainText(HALL);
    await expect(warnings).toContainText("Zacchaeus Event A");
    await page.locator('[data-testid="new-event-cancel-button"]').click();
  });

  test("warns about blockouts when scheduling over one", async () => {
    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-group-select", APPROVAL_GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill("Zacchaeus Event Blocked");
    const start = new Date(blockoutStart);
    start.setHours(10, 0, 0, 0);
    const end = new Date(blockoutStart);
    end.setHours(12, 0, 0, 0);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(start));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(end));
    await selectOption(page, "new-event-rooms-select", HALL, true);
    const warnings = page.locator('[data-testid="new-event-conflict-warnings"]');
    await expect(warnings).toBeVisible({ timeout: 15000 });
    await expect(warnings).toContainText("Zacchaeus Maintenance");
    await page.locator('[data-testid="new-event-cancel-button"]').click();
  });

  test("booking a restricted room queues it in the approvals inbox", async () => {
    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-group-select", APPROVAL_GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill("Zacchaeus Event C");
    const start = new Date(eventStart);
    start.setDate(start.getDate() + 1);
    const end = new Date(eventEnd);
    end.setDate(end.getDate() + 1);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(start));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(end));
    await selectOption(page, "new-event-rooms-select", RESTRICTED_ROOM, true);
    await page.locator('[data-testid="new-event-save-button"]').click();
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });

    await navigateToApprovals(page);
    const pendingRow = page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: "Zacchaeus Event C" });
    await expect(pendingRow).toBeVisible({ timeout: 15000 });
    await expect(pendingRow).toContainText(RESTRICTED_ROOM);
  });

  test("approving the booking clears it from the inbox", async () => {
    const pendingRow = page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: "Zacchaeus Event C" });
    await pendingRow.locator('[data-testid^="approve-booking-"]').click();
    await expect(page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: "Zacchaeus Event C" })).toHaveCount(0, { timeout: 15000 });
  });

  test("imports events from a pasted .ics calendar", async () => {
    await navigateToCalendars(page);
    const row = page.locator("table tbody tr").filter({ hasText: CALENDAR }).first();
    await row.locator("a").first().click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });
    await page.locator('[data-testid="import-ics-button"]').click();
    await selectOption(page, "import-ics-group-select", APPROVAL_GROUP);
    await page.locator('[data-testid="import-ics-text-input"] textarea').first().fill(ICS_SAMPLE);
    await page.locator('[data-testid="import-ics-submit"]').click();
    await expect(page.locator('[data-testid="import-ics-success"]')).toContainText("Imported 2 events", { timeout: 15000 });
    await page.locator('[data-testid="import-ics-close-button"]').click();
  });

  test("cleanup: deletes the calendar, rooms, resource, blockout and template", async () => {
    await navigateToCalendars(page);
    const calEditBtn = page.locator("table tbody tr").filter({ hasText: CALENDAR }).locator('[data-testid^="edit-calendar-"]').first();
    if (await calEditBtn.count().then((c) => c > 0).catch(() => false)) {
      await calEditBtn.click();
      await page.locator('[data-testid="calendar-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
      await page.locator('[data-testid="delete-calendar-button"]').click();
      await confirmDelete(page);
    }
    await expect(page.locator("table tbody tr").filter({ hasText: CALENDAR })).toHaveCount(0, { timeout: 15000 });

    await navigateToRoomsResources(page);
    await deleteViaEdit(page, page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: HALL }).locator('[data-testid^="edit-room-"]'), "delete-room-button");
    await expect(page.locator("tbody tr").filter({ hasText: HALL })).toHaveCount(0, { timeout: 15000 });
    await deleteViaEdit(page, page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: RESTRICTED_ROOM }).locator('[data-testid^="edit-room-"]'), "delete-room-button");
    await expect(page.locator("tbody tr").filter({ hasText: RESTRICTED_ROOM })).toHaveCount(0, { timeout: 15000 });

    await openTab(page, "resources");
    await deleteViaEdit(page, page.locator('[data-testid="resources-table"] tbody tr').filter({ hasText: PROJECTOR }).locator('[data-testid^="edit-resource-"]'), "delete-resource-button");
    await expect(page.locator("tbody tr").filter({ hasText: PROJECTOR })).toHaveCount(0, { timeout: 15000 });

    await openTab(page, "blockouts");
    await deleteViaEdit(page, page.locator('[data-testid="blockouts-table"] tbody tr').filter({ hasText: "Zacchaeus Maintenance" }).locator('[data-testid^="edit-blockout-"]'), "delete-blockout-button");
    await expect(page.locator("tbody tr").filter({ hasText: "Zacchaeus Maintenance" })).toHaveCount(0, { timeout: 15000 });

    await openTab(page, "templates");
    await deleteViaEdit(page, page.locator('[data-testid="templates-table"] tbody tr').filter({ hasText: TEMPLATE }).locator('[data-testid^="edit-template-"]'), "delete-template-button");
    await expect(page.locator("tbody tr").filter({ hasText: TEMPLATE })).toHaveCount(0, { timeout: 15000 });
  });
});
