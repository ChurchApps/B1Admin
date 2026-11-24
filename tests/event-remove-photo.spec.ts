import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Remove Photo in the event dialog clears the event's photo when it is saved.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const CALENDAR_ID = "CAL00000004";
const GROUP_ID = "GRP00000001";

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const created: string[] = [];

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

test("Remove Photo clears the event photo on save", async ({ page }) => {
  const title = "Remove Photo " + Date.now();
  const start = new Date();
  start.setDate(20);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);
  const res = await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title, start, end, allDay: false, visibility: "public", photoUrl: "https://content.churchapps.org/stockPhotos/4/bible.png" }] });
  expect(res.ok()).toBeTruthy();
  const id = (await res.json())[0].id as string;
  created.push(id);
  await ctx.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: CALENDAR_ID, groupId: GROUP_ID, eventIds: [id] }] });

  await page.goto(`/calendars/${CALENDAR_ID}`);
  const event = page.locator(".rbc-event").filter({ hasText: title }).first();
  await expect(event).toBeVisible({ timeout: 15000 });
  await event.click();
  await page.locator('[data-testid="calendar-event-edit-button"]').click();
  await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue(title, { timeout: 15000 });

  const remove = page.locator('[data-testid="new-event-remove-photo-button"]');
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(remove).toHaveCount(0);
  await expect(page.locator('[data-testid="new-event-photo"] img')).toHaveCount(0);

  const saved = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname.endsWith("/content/events"));
  await page.locator('[data-testid="new-event-save-button"]').click();
  expect((await saved).postDataJSON()[0].photoUrl).toBeNull();
  await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });

  const reloaded = await (await ctx.get(`${API_BASE}/content/events/${id}`, auth)).json();
  expect(reloaded.photoUrl ?? null).toBeNull();
});
