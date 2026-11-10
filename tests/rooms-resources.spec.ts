import type { APIRequestContext, Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToRoomsResources, navigateToApprovals, navigateToAvailability, navigateToCalendars } from "./helpers/navigation";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// Rooms & resources admin (roadmap 2.7/2.8): CRUD, double-booking warnings, approval routing, .ics import.
const HALL = "Zacchaeus Hall";
const RESTRICTED_ROOM = "Zacchaeus Restricted Room";
const PROJECTOR = "Zacchaeus Projector";
const HALL_DESC = "Gym with a stage";
const PROJECTOR_DESC = "Ceiling mount, HDMI";
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

// The availability calendar opens on the current month; a block ~2 weeks out may be in the next one.
async function findAvailabilityBlock(page: Page, name: string) {
  await page.locator(".rbc-calendar").waitFor({ state: "visible", timeout: 15000 });
  const block = page.locator(".rbc-event").filter({ hasText: name }).first();
  try {
    await block.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    await page.locator(".rbc-toolbar").getByRole("button", { name: "Next" }).click();
    await block.waitFor({ state: "visible", timeout: 10000 });
  }
  return block;
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

// A failed attempt stops the serial chain before its cleanup test, so the retry would start with a second
// Event A, Hall and calendar next to the first ones. Remove whatever this chain left behind before it starts.
async function purgeLeftovers(request: APIRequestContext) {
  const API = process.env.API_BASE || "http://localhost:8084";
  const body = await (await request.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const jwt = ((body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches[0]).jwt;
  const auth = { headers: { Authorization: "Bearer " + jwt } };
  const list = async (path: string): Promise<any[]> => { const r = await request.get(`${API}${path}`, auth); return r.ok() ? await r.json() : []; };
  const purge = async (path: string, match: (row: any) => boolean) => {
    for (const row of (await list(path)).filter(match)) await request.delete(`${API}${path}/${row.id}`, auth);
  };
  const group = (await list("/membership/groups")).find((g) => g.name === APPROVAL_GROUP);
  if (group) {
    const titles = ["Zacchaeus Event A", "Zacchaeus Event A Edited", "Zacchaeus Event C", "Zacchaeus Event D", "Zacchaeus ICS Event One", "Zacchaeus ICS Event Two"];
    for (const ev of (await list(`/content/events/group/${group.id}`)).filter((e) => titles.includes(e.title))) await request.delete(`${API}/content/events/${ev.id}`, auth);
  }
  await purge("/content/curatedCalendars", (c) => c.name === CALENDAR);
  await purge("/content/calendarBlockouts", (b) => b.reason === "Zacchaeus Maintenance");
  await purge("/content/eventTemplates", (t) => t.name === TEMPLATE);
  await purge("/content/resources", (r) => r.name === PROJECTOR);
  await purge("/content/rooms", (r) => r.name === HALL || r.name === RESTRICTED_ROOM);
}

test.describe.serial("Rooms, resources & approvals", () => {
  let page: Page;

  test.beforeAll(async ({ browser, playwright }) => {
    const request = await playwright.request.newContext();
    await purgeLeftovers(request);
    await request.dispose();
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
    await page.locator('[data-testid="room-description-input"] input').fill(HALL_DESC);
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
    await page.locator('[data-testid="resource-description-input"] input').fill(PROJECTOR_DESC);
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

    // Each room and resource shows its description under the name so the requester knows what it is for.
    await page.locator('[data-testid="new-event-rooms-select"] [role="combobox"]').first().click();
    const hallOption = page.getByRole("option", { name: new RegExp(HALL) }).first();
    await expect(hallOption).toContainText("Seats 80");
    await expect(hallOption).toContainText(HALL_DESC);
    await page.keyboard.press("Escape");
    await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 5000 });
    await page.locator('[data-testid="new-event-resources-select"] [role="combobox"]').first().click();
    await expect(page.getByRole("option", { name: new RegExp(PROJECTOR) }).first()).toContainText(PROJECTOR_DESC);
    await page.keyboard.press("Escape");
    await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 5000 });

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
    await expect(page.locator('[data-testid="approve-booking-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="approve-booking-publish"] input')).not.toBeChecked();
    await page.locator('[data-testid="approve-booking-confirm"]').click();
    await expect(page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: "Zacchaeus Event C" })).toHaveCount(0, { timeout: 15000 });
  });

  test("approving a private booking with publish puts it on the chosen curated calendar", async () => {
    await navigateToAvailability(page);
    await page.locator('[data-testid="availability-book-button"]').click();
    await selectOption(page, "new-event-group-select", APPROVAL_GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill("Zacchaeus Event D");
    const start = new Date(eventStart);
    start.setDate(start.getDate() + 2);
    const end = new Date(eventEnd);
    end.setDate(end.getDate() + 2);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(start));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(end));
    await selectOption(page, "new-event-visibility-select", "Private");
    await selectOption(page, "new-event-rooms-select", RESTRICTED_ROOM, true);
    await page.locator('[data-testid="new-event-save-button"]').click();
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });

    await navigateToApprovals(page);
    const pendingRow = page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: "Zacchaeus Event D" });
    await expect(pendingRow).toBeVisible({ timeout: 15000 });
    await pendingRow.locator('[data-testid^="approve-booking-"]').click();
    await expect(page.locator('[data-testid="approve-booking-dialog"]')).toBeVisible();
    await page.locator('[data-testid="approve-booking-publish"] input').check();
    await selectOption(page, "approve-booking-calendar", CALENDAR);
    await page.locator('[data-testid="approve-booking-confirm"]').click();
    await expect(page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: "Zacchaeus Event D" })).toHaveCount(0, { timeout: 15000 });

    await navigateToCalendars(page);
    await page.locator("table tbody tr").filter({ hasText: CALENDAR }).first().locator("a").first().click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });
    await expect(await findAvailabilityBlock(page, "Zacchaeus Event D")).toBeVisible();
  });

  test("clicking an availability block opens the edit modal pre-populated", async () => {
    await navigateToAvailability(page);
    const block = await findAvailabilityBlock(page, "Zacchaeus Event A");
    await block.click();
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue("Zacchaeus Event A", { timeout: 15000 });
    await expect(page.locator('[data-testid="event-delete-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-event-rooms-select"]')).toContainText(HALL);
    await page.locator('[data-testid="new-event-cancel-button"]').click();
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 10000 });
  });

  test("edits the event title from the availability calendar", async () => {
    const block = await findAvailabilityBlock(page, "Zacchaeus Event A");
    await block.click();
    const title = page.locator('[data-testid="new-event-title-input"] input');
    await expect(title).toHaveValue("Zacchaeus Event A", { timeout: 15000 });
    await title.fill("Zacchaeus Event A Edited");
    await page.locator('[data-testid="new-event-save-button"]').click();
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });
    await expect(await findAvailabilityBlock(page, "Zacchaeus Event A Edited")).toBeVisible();
  });

  test("deletes the event from the availability calendar", async () => {
    const block = await findAvailabilityBlock(page, "Zacchaeus Event A Edited");
    await block.click();
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue("Zacchaeus Event A Edited", { timeout: 15000 });
    await page.locator('[data-testid="event-delete-button"]').click();
    await confirmDelete(page);
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });
    await page.locator(".rbc-calendar").waitFor({ state: "visible", timeout: 15000 });
    await expect(page.locator(".rbc-event").filter({ hasText: "Zacchaeus Event A" })).toHaveCount(0, { timeout: 15000 });
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

// #1488: decided requests stay on the Approvals page under History, linked to the requester.
test.describe.serial("Approvals history", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const stamp = Date.now();
  const groupName = `Zacchaeus Approvers ${stamp}`;
  const roomName = `Zacchaeus History Room ${stamp}`;
  const eventTitle = `Zacchaeus History Event ${stamp}`;
  let ctx: APIRequestContext;
  let jwt: string;
  let groupId: string;
  let roomId: string;
  let eventId: string;
  let bookingId: string;
  let page: Page;

  const auth = () => ({ headers: { Authorization: "Bearer " + jwt } });

  test.beforeAll(async ({ browser, playwright }) => {
    ctx = await playwright.request.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const body = await loginRes.json();
    jwt = ((body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches[0]).jwt;
    // A room routed to a group the admin is not in, so the booking lands as pending.
    groupId = (await (await ctx.post(`${API}/membership/groups`, { ...auth(), data: [{ name: groupName, categoryName: "Approvals Test", tags: "standard" }] })).json())[0].id;
    roomId = (await (await ctx.post(`${API}/content/rooms`, { ...auth(), data: [{ name: roomName, approvalGroupId: groupId }] })).json())[0].id;
    const start = new Date(eventStart);
    start.setDate(start.getDate() + 3);
    const end = new Date(eventEnd);
    end.setDate(end.getDate() + 3);
    eventId = (await (await ctx.post(`${API}/content/events`, { ...auth(), data: [{ groupId, title: eventTitle, start: start.toISOString(), end: end.toISOString(), allDay: false, visibility: "public" }] })).json())[0].id;
    const bookingRes = await ctx.post(`${API}/content/eventBookings`, { ...auth(), data: [{ eventId, roomId }] });
    const booking = (await bookingRes.json())[0];
    expect(booking.status, "seeded booking is pending").toBe("pending");
    bookingId = booking.id;
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    try {
      await ctx.delete(`${API}/content/events/${eventId}`, auth());
      await ctx.delete(`${API}/content/rooms/${roomId}`, auth());
      await ctx.delete(`${API}/membership/groups/${groupId}`, auth());
    } catch { /* best effort */ }
    await ctx?.dispose();
    await page?.context().close();
  });

  test("pending requests show who asked, linked to their record", async () => {
    await navigateToApprovals(page);
    const pendingRow = page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: eventTitle });
    await expect(pendingRow).toBeVisible({ timeout: 15000 });
    await expect(pendingRow.locator('a[href^="/people/"]')).toHaveCount(1);
    await pendingRow.locator('[data-testid^="approve-booking-"]').click();
    await page.locator('[data-testid="approve-booking-confirm"]').click();
    await expect(page.locator('[data-testid="pending-bookings-table"] tbody tr').filter({ hasText: eventTitle })).toHaveCount(0, { timeout: 15000 });
  });

  test("History lists the approved booking with requester, decision and decider", async () => {
    await page.locator('[data-testid="approvals-history-pill"]').click();
    await expect(page.locator('[data-testid="pending-bookings-table"]')).toHaveCount(0);
    const historyRow = page.locator('[data-testid="history-bookings-table"] tbody tr').filter({ hasText: eventTitle });
    await expect(historyRow).toBeVisible({ timeout: 15000 });
    await expect(historyRow).toContainText(roomName);
    await expect(historyRow).toContainText("Approved");
    await expect(historyRow.locator('a[href^="/people/"]')).toHaveCount(1);
    await expect(historyRow.locator("td").nth(4)).not.toHaveText("—");
    await expect(page.locator('[data-testid="history-events-table"]').or(page.locator('[data-testid="no-resolved-events"]'))).toBeVisible();
  });

  // #1510: a decision can be changed after the fact, like a serving plan answer.
  test("a booking decision can be reversed from History", async () => {
    const historyRow = () => page.locator('[data-testid="history-bookings-table"] tbody tr').filter({ hasText: eventTitle });
    await historyRow().locator(`[data-testid="reject-booking-${bookingId}"]`).click();
    await confirmDelete(page);
    await expect(historyRow()).toContainText("Rejected", { timeout: 15000 });
    await expect(historyRow().locator(`[data-testid="reject-booking-${bookingId}"]`)).toHaveCount(0);
    await historyRow().locator(`[data-testid="approve-booking-${bookingId}"]`).click();
    await page.locator('[data-testid="approve-booking-confirm"]').click();
    await expect(historyRow()).toContainText("Approved", { timeout: 15000 });
    await expect(historyRow().locator(`[data-testid="reject-booking-${bookingId}"]`)).toBeVisible();
  });

  test("Pending switches back to the open requests", async () => {
    await page.locator('[data-testid="approvals-pending-pill"]').click();
    await expect(page.locator('[data-testid="history-bookings-table"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="pending-bookings-table"]').or(page.locator('[data-testid="no-pending-bookings"]'))).toBeVisible({ timeout: 15000 });
  });
});

// #1508: a room can go back to "No approval needed", and room-less event requests can be edited and deleted from Approvals.
test.describe.serial("Room approval reset and event request actions", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const stamp = Date.now();
  const groupName = `Zacchaeus Reset Approvers ${stamp}`;
  const roomName = `Zacchaeus Reset Room ${stamp}`;
  const eventTitle = `Zacchaeus Pending Request ${stamp}`;
  const decidedTitle = `Zacchaeus Decided Request ${stamp}`;
  let ctx: APIRequestContext;
  let jwt: string;
  let groupId: string;
  let roomId: string;
  let eventId: string;
  let decidedId: string;
  let page: Page;

  const auth = () => ({ headers: { Authorization: "Bearer " + jwt } });

  const requestEvent = async (title: string, daysOut: number) => {
    const start = new Date();
    start.setDate(start.getDate() + daysOut);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19);
    return (await (await ctx.post(`${API}/content/events/request`, { ...auth(), data: { title, start: start.toISOString(), end: end.toISOString(), allDay: false } })).json()).event.id as string;
  };

  test.beforeAll(async ({ browser, playwright }) => {
    ctx = await playwright.request.newContext();
    const body = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    jwt = ((body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches[0]).jwt;
    groupId = (await (await ctx.post(`${API}/membership/groups`, { ...auth(), data: [{ name: groupName, categoryName: "Approvals Test", tags: "standard" }] })).json())[0].id;
    roomId = (await (await ctx.post(`${API}/content/rooms`, { ...auth(), data: [{ name: roomName, approvalGroupId: groupId }] })).json())[0].id;
    eventId = await requestEvent(eventTitle, 10);
    decidedId = await requestEvent(decidedTitle, 11);
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    try {
      await ctx.delete(`${API}/content/events/${eventId}`, auth());
      await ctx.delete(`${API}/content/events/${decidedId}`, auth());
      await ctx.delete(`${API}/content/rooms/${roomId}`, auth());
      await ctx.delete(`${API}/membership/groups/${groupId}`, auth());
    } catch { /* best effort */ }
    await ctx?.dispose();
    await page?.context().close();
  });

  test("editing a room back to No approval needed clears its approval group", async () => {
    await navigateToRoomsResources(page);
    const row = page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName });
    await expect(row).toContainText(groupName, { timeout: 15000 });
    await page.locator(`[data-testid="edit-room-${roomId}"]`).click();
    await page.locator('[data-testid="room-approval-group-select"] [role="combobox"]').click();
    await page.getByRole("option", { name: "No approval needed" }).click();
    await page.locator('[data-testid="save-room-button"]').click();
    await expect(page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName })).not.toContainText(groupName, { timeout: 15000 });
    await page.reload();
    await expect(page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName })).not.toContainText(groupName);
  });

  test("a pending event request with no room can be edited and deleted", async () => {
    await navigateToApprovals(page);
    const row = page.locator('[data-testid="pending-events-table"] tbody tr').filter({ hasText: eventTitle });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator(`[data-testid="edit-event-${eventId}"]`).click();
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue(eventTitle, { timeout: 15000 });
    await page.locator('[data-testid="new-event-cancel-button"]').click();
    await row.locator(`[data-testid="delete-event-${eventId}"]`).click();
    await confirmDelete(page);
    await expect(page.locator('[data-testid="pending-events-table"] tbody tr').filter({ hasText: eventTitle })).toHaveCount(0, { timeout: 15000 });
  });

  test("a decided event request keeps Edit and Delete in History", async () => {
    const row = page.locator('[data-testid="pending-events-table"] tbody tr').filter({ hasText: decidedTitle });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator(`[data-testid="approve-event-${decidedId}"]`).click();
    await expect(page.locator('[data-testid="pending-events-table"] tbody tr').filter({ hasText: decidedTitle })).toHaveCount(0, { timeout: 15000 });
    await page.locator('[data-testid="approvals-history-pill"]').click();
    const historyRow = page.locator('[data-testid="history-events-table"] tbody tr').filter({ hasText: decidedTitle });
    await expect(historyRow).toBeVisible({ timeout: 15000 });
    await expect(historyRow.locator(`[data-testid="edit-event-${decidedId}"]`)).toBeVisible();
    await expect(historyRow.locator(`[data-testid="delete-event-${decidedId}"]`)).toBeVisible();
  });

  // #1510: rejecting a previously approved request takes it back off the public calendar.
  test("a decided event request can be rejected and re-approved from History", async () => {
    const historyRow = () => page.locator('[data-testid="history-events-table"] tbody tr').filter({ hasText: decidedTitle });
    const visibility = async () => (await (await ctx.get(`${API}/content/events/${decidedId}`, auth())).json()).visibility;
    expect(await visibility()).toBe("public");
    await historyRow().locator(`[data-testid="reject-event-${decidedId}"]`).click();
    await confirmDelete(page);
    await expect(historyRow()).toContainText("Rejected", { timeout: 15000 });
    expect(await visibility()).toBe("private");
    await historyRow().locator(`[data-testid="approve-event-${decidedId}"]`).click();
    await expect(historyRow()).toContainText("Approved", { timeout: 15000 });
    await expect(historyRow().locator(`[data-testid="reject-event-${decidedId}"]`)).toBeVisible();
    expect(await visibility()).toBe("public");
  });
});

// Booking blocks used white text on a pale green in dark mode, which was hard to read.
test.describe("Availability booking colors", () => {
  const luminance = (rgb: string) => {
    const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number).map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  for (const mode of ["light", "dark"]) {
    test(`booking text is readable in ${mode} mode`, async ({ page }) => {
      await page.addInitScript((m) => { try { localStorage.setItem("b1admin-theme-mode", m); } catch { /* storage blocked */ } }, mode);
      await page.goto("/calendars/availability");
      const block = page.locator(".rbc-event").first();
      await expect(block).toBeVisible({ timeout: 15000 });
      const { color, background } = await block.evaluate((el) => { const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor }; });
      expect(contrast(color, background)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
