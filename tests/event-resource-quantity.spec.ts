import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Editing an event that books several of a pooled resource shows the booked quantity, not 1.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const CALENDAR_ID = "CAL00000004";
const GROUP_ID = "GRP00000001";

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
let eventId = "";
let resourceId = "";

test.beforeAll(async () => {
  ctx = await request.newContext();
  const loginBody = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const uc = (loginBody.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0];
  auth = { headers: { Authorization: "Bearer " + uc.jwt } };
});

test.afterAll(async () => {
  if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth).catch(() => { });
  if (resourceId) await ctx.delete(`${API_BASE}/content/resources/${resourceId}`, auth).catch(() => { });
  await ctx.dispose();
});

test("editing an event loads the booked quantity of a pooled resource", async ({ page }) => {
  const stamp = Date.now();
  const title = "Quantity Edit " + stamp;
  resourceId = (await (await ctx.post(`${API_BASE}/content/resources`, { ...auth, data: [{ name: "Quantity Chairs " + stamp, quantity: 10 }] })).json())[0].id;

  // The 22nd of this month, so the curated calendar's month view shows it without paging.
  const start = new Date();
  start.setDate(22);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start);
  end.setHours(20, 0, 0, 0);
  eventId = (await (await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title, start, end, allDay: false, visibility: "public" }] })).json())[0].id;
  expect((await ctx.post(`${API_BASE}/content/eventBookings`, { ...auth, data: [{ eventId, resourceId, quantity: 4 }] })).ok()).toBeTruthy();
  expect((await ctx.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: CALENDAR_ID, groupId: GROUP_ID, eventIds: [eventId] }] })).ok()).toBeTruthy();

  await page.goto(`/calendars/${CALENDAR_ID}`);
  const event = page.locator(".rbc-event").filter({ hasText: title }).first();
  await expect(event).toBeVisible({ timeout: 15000 });
  await event.click();
  await page.locator('[data-testid="calendar-event-edit-button"]').click();
  await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue(title, { timeout: 15000 });

  const qty = page.getByTestId("new-event-resource-quantity-" + resourceId);
  await expect(qty).toHaveValue("4", { timeout: 15000 });
  await expect(qty).toHaveAttribute("max", "10");
});
