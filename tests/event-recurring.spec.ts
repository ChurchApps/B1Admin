import type { APIRequestContext, Page, Request } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The curated calendar's Edit Event dialog offers just this date / this and following / all dates
// for a recurring event, for both Save and Delete.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const CALENDAR_ID = "CAL00000004";
const GROUP_ID = "GRP00000001";

test.describe.configure({ mode: "serial" });

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const created: string[] = [];

// Weekly series from the 1st of this month, so the month view shows its second date on the 8th.
const seriesStart = new Date();
seriesStart.setDate(1);
seriesStart.setHours(10, 0, 0, 0);
const seriesEnd = new Date(seriesStart);
seriesEnd.setHours(11, 0, 0, 0);
const secondDate = new Date(seriesStart);
secondDate.setDate(8);

test.beforeAll(async () => {
  ctx = await request.newContext();
  const loginBody = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const uc = (loginBody.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0];
  auth = { headers: { Authorization: "Bearer " + uc.jwt } };
});

// Clean up after every test: leftover series crowd the 1st into "+N more" and shift which date nth(1) opens.
test.afterEach(async () => {
  const res = await ctx.get(`${API_BASE}/content/events/group/${GROUP_ID}`, auth);
  const all: any[] = res.ok() ? await res.json() : [];
  const ids = new Set([...created.splice(0), ...all.filter((e) => e.title?.startsWith("Recurring Split ")).map((e) => e.id)]);
  for (const id of ids) await ctx.delete(`${API_BASE}/content/events/${id}`, auth);
});

test.afterAll(async () => {
  await ctx.dispose();
});

async function createSeries(title: string) {
  const res = await ctx.post(`${API_BASE}/content/events`, {
    ...auth,
    data: [{ groupId: GROUP_ID, title, start: seriesStart, end: seriesEnd, allDay: false, visibility: "public", recurrenceRule: "FREQ=WEEKLY;INTERVAL=1" }]
  });
  expect(res.ok()).toBeTruthy();
  const id = (await res.json())[0].id as string;
  created.push(id);
  const link = await ctx.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: CALENDAR_ID, groupId: GROUP_ID, eventIds: [id] }] });
  expect(link.ok()).toBeTruthy();
  return id;
}

// Opens the series' second date (the 8th) in the Edit Event dialog and records content writes.
async function openSecondDate(page: Page, title: string) {
  const writes: Request[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && /\/content\/(events|eventExceptions)(\/|$)/.test(new URL(r.url()).pathname)) writes.push(r);
  });
  await page.goto(`/calendars/${CALENDAR_ID}`);
  const occurrences = page.locator(".rbc-event").filter({ hasText: title });
  await expect(occurrences.nth(1)).toBeVisible({ timeout: 15000 });
  await occurrences.nth(1).click();
  await page.locator('[data-testid="calendar-event-edit-button"]').click();
  await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue(title, { timeout: 15000 });
  return writes;
}

async function choose(page: Page, option: "this" | "future" | "all") {
  await expect(page.locator('[data-testid="edit-recurring-dialog"]')).toBeVisible();
  await page.locator(`[data-testid="edit-recurring-${option}-radio"]`).click();
  await page.locator('[data-testid="edit-recurring-save-button"]').click();
  await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });
}

const bodyOf = (r: Request) => r.postDataJSON() as any[];
const posts = (writes: Request[], path: string) => writes.filter((r) => r.method() === "POST" && new URL(r.url()).pathname.endsWith(path));
const sameDay = (a: string | Date, b: Date) => new Date(a).toDateString() === b.toDateString();

test("Save > Just this date skips the date and adds a one-off copy on it", async ({ page }) => {
  const title = "Recurring Split This " + Date.now();
  const id = await createSeries(title);
  const writes = await openSecondDate(page, title);
  await page.locator('[data-testid="new-event-title-input"] input').fill(title + " moved");
  await page.locator('[data-testid="new-event-save-button"]').click();
  await choose(page, "this");

  const exceptions = posts(writes, "/eventExceptions");
  expect(exceptions).toHaveLength(1);
  expect(bodyOf(exceptions[0])[0].eventId).toBe(id);
  expect(sameDay(bodyOf(exceptions[0])[0].exceptionDate, secondDate)).toBe(true);
  const events = posts(writes, "/events");
  expect(events).toHaveLength(1);
  const copy = bodyOf(events[0])[0];
  expect(copy.id).toBeUndefined();
  expect(copy.recurrenceRule).toBeUndefined();
  expect(copy.title).toBe(title + " moved");
  expect(sameDay(copy.start, secondDate)).toBe(true);

  await expect(page.locator(".rbc-event").filter({ hasText: title + " moved" })).toHaveCount(1, { timeout: 15000 });
});

test("Save > This and all following dates ends the series and starts a new one", async ({ page }) => {
  const title = "Recurring Split Future " + Date.now();
  const id = await createSeries(title);
  const writes = await openSecondDate(page, title);
  await page.locator('[data-testid="new-event-title-input"] input').fill(title + " later");
  await page.locator('[data-testid="new-event-save-button"]').click();
  await choose(page, "future");

  expect(posts(writes, "/eventExceptions")).toHaveLength(0);
  const events = posts(writes, "/events").map((r) => bodyOf(r)[0]);
  expect(events).toHaveLength(2);
  expect(events[0].id).toBe(id);
  expect(events[0].recurrenceRule).toContain("UNTIL=");
  expect(events[1].id).toBeUndefined();
  expect(events[1].recurrenceRule).toContain("FREQ=WEEKLY");
  expect(sameDay(events[1].start, secondDate)).toBe(true);
});

test("Save > All dates updates the whole series", async ({ page }) => {
  const title = "Recurring Split All " + Date.now();
  const id = await createSeries(title);
  const writes = await openSecondDate(page, title);
  await page.locator('[data-testid="new-event-title-input"] input').fill(title + " renamed");
  await page.locator('[data-testid="new-event-save-button"]').click();
  await choose(page, "all");

  expect(posts(writes, "/eventExceptions")).toHaveLength(0);
  const events = posts(writes, "/events").map((r) => bodyOf(r)[0]);
  expect(events).toHaveLength(1);
  expect(events[0].id).toBe(id);
  expect(events[0].recurrenceRule).toContain("FREQ=WEEKLY");
  expect(events[0].recurrenceRule).not.toContain("UNTIL=");
});

test("Delete > Just this date only skips that date", async ({ page }) => {
  const title = "Recurring Split Delete " + Date.now();
  const id = await createSeries(title);
  const writes = await openSecondDate(page, title);
  await page.locator('[data-testid="event-delete-button"]').click();
  await choose(page, "this");

  const exceptions = posts(writes, "/eventExceptions");
  expect(exceptions).toHaveLength(1);
  expect(bodyOf(exceptions[0])[0].eventId).toBe(id);
  expect(sameDay(bodyOf(exceptions[0])[0].exceptionDate, secondDate)).toBe(true);
  expect(writes.filter((r) => r.method() === "DELETE")).toHaveLength(0);
  expect(posts(writes, "/events")).toHaveLength(0);
});

// Splitting one date off must leave the series reminder alone: no copy on the new event, no delete.
async function addSeriesReminder(id: string, enabled: boolean) {
  const res = await ctx.post(`${API_BASE}/messaging/reminders/event/${id}`, {
    ...auth,
    data: { offsets: "1440", sendLocalTime: "09:00", channels: "push,email", recipientMode: "group", enabled }
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).id as string;
}

async function splitThisDateWatchingReminders(page: Page, id: string, title: string, beforeSave?: () => Promise<void>) {
  const reminderWrites: Request[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && new URL(r.url()).pathname.includes("/reminders")) reminderWrites.push(r);
  });
  const listLoaded = page.waitForResponse((r) => r.request().method() === "GET" && new URL(r.url()).pathname.endsWith(`/messaging/reminders/event/${id}`));
  await openSecondDate(page, title);
  expect((await listLoaded).ok()).toBeTruthy();
  await page.locator('[data-testid="new-event-title-input"] input').fill(title + " moved");
  if (beforeSave) await beforeSave();
  await page.locator('[data-testid="new-event-save-button"]').click();
  await choose(page, "this");
  return reminderWrites;
}

async function seriesReminders(id: string) {
  const res = await ctx.get(`${API_BASE}/messaging/reminders/event/${id}`, auth);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as any[];
}

test("Save > Just this date does not copy an enabled series reminder", async ({ page }) => {
  const title = "Recurring Split Reminder On " + Date.now();
  const id = await createSeries(title);
  const defId = await addSeriesReminder(id, true);
  const reminderWrites = await splitThisDateWatchingReminders(page, id, title);

  expect(reminderWrites.filter((r) => r.method() === "POST" || r.method() === "DELETE")).toHaveLength(0);
  const defs = await seriesReminders(id);
  const def = defs.find((d) => d.id === defId);
  expect(def).toBeTruthy();
  expect(def.enabled).toBeTruthy();
});

// The Api returns enabled as 0, which the editor reads as on, so the old code POSTed a copy here.
test("Save > Just this date does not touch a disabled series reminder", async ({ page }) => {
  const title = "Recurring Split Reminder Off " + Date.now();
  const id = await createSeries(title);
  const defId = await addSeriesReminder(id, false);
  const reminderWrites = await splitThisDateWatchingReminders(page, id, title);

  expect(reminderWrites.filter((r) => r.method() === "POST" || r.method() === "DELETE")).toHaveLength(0);
  const defs = await seriesReminders(id);
  expect(defs.find((d) => d.id === defId)).toBeTruthy();
});

test("Save > Just this date does not delete the series reminder when its switch is turned off", async ({ page }) => {
  const title = "Recurring Split Reminder Switch " + Date.now();
  const id = await createSeries(title);
  const defId = await addSeriesReminder(id, true);
  const reminderWrites = await splitThisDateWatchingReminders(page, id, title, async () => {
    const toggle = page.locator('[data-testid="reminder-enabled-toggle"] input');
    if (!(await toggle.isVisible())) await page.getByText("Reminders", { exact: true }).first().click();
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
  });

  expect(reminderWrites.filter((r) => r.method() === "DELETE")).toHaveLength(0);
  const defs = await seriesReminders(id);
  expect(defs.find((d) => d.id === defId)).toBeTruthy();
});
