import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The registrations list opens on upcoming events; the Past chip shows the ones that have ended.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000001";

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const created: string[] = [];
const stamp = Date.now();
const UPCOMING = "Upcoming Signup " + stamp;
const PAST = "Past Signup " + stamp;

async function createEvent(title: string, daysFromNow: number) {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);
  const res = await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title, start, end, allDay: false, visibility: "public", registrationEnabled: true }] });
  expect(res.ok()).toBeTruthy();
  created.push((await res.json())[0].id);
}

test.beforeAll(async () => {
  ctx = await request.newContext();
  const loginBody = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const uc = (loginBody.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0];
  auth = { headers: { Authorization: "Bearer " + uc.jwt } };
  await createEvent(UPCOMING, 14);
  await createEvent(PAST, -14);
});

test.afterAll(async () => {
  for (const id of created) await ctx.delete(`${API_BASE}/content/events/${id}`, auth).catch(() => { });
  await ctx.dispose();
});

test("lists upcoming events by default and past ones under the Past chip", async ({ page }) => {
  await page.goto("/registrations");
  await expect(page.locator('[data-testid="registrations-filter-upcoming"]')).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });
  await expect(page.getByRole("link", { name: UPCOMING })).toBeVisible();
  await expect(page.getByRole("link", { name: PAST })).toHaveCount(0);

  await page.locator('[data-testid="registrations-filter-past"]').click();
  await expect(page.getByRole("link", { name: PAST })).toBeVisible();
  await expect(page.getByRole("link", { name: UPCOMING })).toHaveCount(0);
});
