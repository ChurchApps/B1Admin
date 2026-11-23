import type { APIRequestContext, Page } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The admin event editor's All day switch: Start/End become dates and the event saves 00:00-23:59 with allDay on.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const CALENDAR_ID = "CAL00000004";
const GROUP_ID = "GRP00000001";
const GROUP_NAME = "High School Youth";

test.describe.configure({ mode: "serial" });

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const created: string[] = [];

// The 20th of this month, so the curated calendar's month view shows it without paging.
const eventDay = new Date();
eventDay.setDate(20);
eventDay.setHours(0, 0, 0, 0);
const pad = (n: number) => n.toString().padStart(2, "0");
const dateInput = `${eventDay.getFullYear()}-${pad(eventDay.getMonth() + 1)}-${pad(eventDay.getDate())}`;

test.beforeAll(async () => {
  ctx = await request.newContext();
  const loginBody = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const uc = (loginBody.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0];
  auth = { headers: { Authorization: "Bearer " + uc.jwt } };
});

test.afterAll(async () => {
  for (const id of created) await ctx.delete(`${API_BASE}/content/events/${id}`, auth).catch(() => { });
  await ctx.dispose();
});

async function selectGroup(page: Page, name: string) {
  await page.locator('[data-testid="new-event-group-select"] [role="combobox"]').first().click();
  await page.getByRole("option", { name }).first().click();
}

test("a new all-day event saves from 00:00 to 23:59 with allDay on", async ({ page }) => {
  const title = "All Day New " + Date.now();
  await page.goto(`/calendars/${CALENDAR_ID}`);
  await page.locator('[data-testid="new-event-button"]').click();
  await selectGroup(page, GROUP_NAME);
  await page.locator('[data-testid="new-event-title-input"] input').fill(title);

  await page.locator('[data-testid="new-event-all-day-toggle"] input').check();
  const startInput = page.locator('[data-testid="new-event-start-input"] input');
  const endInput = page.locator('[data-testid="new-event-end-input"] input');
  await expect(startInput).toHaveAttribute("type", "date");
  await expect(endInput).toHaveAttribute("type", "date");
  await startInput.fill(dateInput);
  await endInput.fill(dateInput);

  const saved = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname.endsWith("/content/events"));
  await page.locator('[data-testid="new-event-save-button"]').click();
  const response = await saved;
  const sent = response.request().postDataJSON()[0];
  created.push((await response.json())[0].id);
  await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });

  expect(sent.allDay).toBe(true);
  const start = new Date(sent.start);
  const end = new Date(sent.end);
  expect(start.toDateString()).toBe(eventDay.toDateString());
  expect([start.getHours(), start.getMinutes()]).toEqual([0, 0]);
  expect(end.toDateString()).toBe(eventDay.toDateString());
  expect([end.getHours(), end.getMinutes()]).toEqual([23, 59]);
});

test("editing an all-day event loads the switch on with date-only Start and End", async ({ page }) => {
  const title = "All Day Edit " + Date.now();
  const end = new Date(eventDay);
  end.setHours(23, 59, 0, 0);
  const res = await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title, start: eventDay, end, allDay: true, visibility: "public" }] });
  expect(res.ok()).toBeTruthy();
  const id = (await res.json())[0].id as string;
  created.push(id);
  const link = await ctx.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: CALENDAR_ID, groupId: GROUP_ID, eventIds: [id] }] });
  expect(link.ok()).toBeTruthy();

  await page.goto(`/calendars/${CALENDAR_ID}`);
  const event = page.locator(".rbc-event").filter({ hasText: title }).first();
  await expect(event).toBeVisible({ timeout: 15000 });
  await event.click();
  await page.locator('[data-testid="calendar-event-edit-button"]').click();
  await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue(title, { timeout: 15000 });

  await expect(page.locator('[data-testid="new-event-all-day-toggle"] input')).toBeChecked();
  await expect(page.locator('[data-testid="new-event-start-input"] input')).toHaveValue(dateInput);
  await expect(page.locator('[data-testid="new-event-end-input"] input')).toHaveValue(dateInput);

  // Saving unchanged keeps it all day.
  const saved = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname.endsWith("/content/events"));
  await page.locator('[data-testid="new-event-save-button"]').click();
  expect((await saved).postDataJSON()[0].allDay).toBe(true);
});
