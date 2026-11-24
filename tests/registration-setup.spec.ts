import type { APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Registration settings: attendee type age ranges and "Copy setup from another event".
// Builds its own disposable events through the API so it never touches seeded registrations.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000001";

test.describe.configure({ mode: "serial" });

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const created: string[] = [];

const start = new Date();
start.setDate(start.getDate() + 40);
start.setHours(9, 0, 0, 0);
const end = new Date(start);
end.setHours(12, 0, 0, 0);

async function createEvent(title: string, extra: Record<string, unknown> = {}) {
  const res = await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title, start, end, allDay: false, visibility: "public", registrationEnabled: true, ...extra }] });
  expect(res.ok()).toBeTruthy();
  const id = (await res.json())[0].id as string;
  created.push(id);
  return id;
}

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

test("an attendee type saves and reloads its min and max age", async ({ page }) => {
  const eventId = await createEvent("Setup Ages " + Date.now());
  await page.goto(`/registrations/${eventId}?view=settings`);
  await page.getByRole("button", { name: "Attendee Types", exact: true }).click();
  await page.locator('[data-testid="add-registration-type"]').click();
  await page.locator('[data-testid="type-name"] input').first().fill("Kids");
  await page.locator('[data-testid="type-min-age"] input').first().fill("5");
  await page.locator('[data-testid="type-max-age"] input').first().fill("11");

  const saved = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname.endsWith("/registrations/types"));
  await page.locator('[data-testid="save-registration-types"]').click();
  const sent = (await saved).postDataJSON()[0];
  expect(sent.minAgeYears).toBe(5);
  expect(sent.maxAgeYears).toBe(11);

  await page.reload();
  await page.getByRole("button", { name: "Attendee Types", exact: true }).click();
  await expect(page.locator('[data-testid="type-min-age"] input').first()).toHaveValue("5", { timeout: 10000 });
  await expect(page.locator('[data-testid="type-max-age"] input').first()).toHaveValue("11");
});

test("Copy setup brings another event's settings, types, selections, and codes as new rows", async ({ page }) => {
  const sourceTitle = "Setup Source " + Date.now();
  const sourceId = await createEvent(sourceTitle, { capacity: 30, waitlistEnabled: true, tags: "camp, youth" });
  const typesRes = await ctx.post(`${API_BASE}/content/registrations/types`, { ...auth, data: [{ eventId: sourceId, name: "Camper", price: 50, capacity: 20, minAgeYears: 8, maxAgeYears: 12, sort: 1, active: true }] });
  const sourceTypeId = (await typesRes.json())[0].id as string;
  await ctx.post(`${API_BASE}/content/registrations/selections`, { ...auth, data: [{ eventId: sourceId, name: "Camp Shirt", price: 12, sort: 1, active: true }] });
  await ctx.post(`${API_BASE}/content/registrations/coupons`, { ...auth, data: [{ eventId: sourceId, code: "SIBLING", discountType: "amount", value: 10, active: true }] });
  const targetId = await createEvent("Setup Target " + Date.now());

  await page.goto(`/registrations/${targetId}?view=settings`);
  await page.locator('[data-testid="copy-registration-setup-button"]').click();
  await page.locator('[data-testid="copy-registration-setup-source"] [role="combobox"]').click();
  await page.getByRole("option", { name: new RegExp(sourceTitle) }).click();
  await page.locator('[data-testid="copy-registration-setup-confirm"]').click();
  await expect(page.locator('[data-testid="copy-registration-setup-done"]')).toBeVisible({ timeout: 15000 });

  await expect(page.locator('input[name="capacity"]')).toHaveValue("30");
  await expect(page.locator('[data-testid="waitlist-enabled-switch"] input')).toBeChecked();
  await expect(page.locator('input[name="tags"]')).toHaveValue("camp, youth");

  const types = await (await ctx.get(`${API_BASE}/content/registrations/types/event/${targetId}?churchId=${CHURCH_ID}`, auth)).json();
  expect(types).toHaveLength(1);
  expect(types[0]).toMatchObject({ name: "Camper", eventId: targetId, minAgeYears: 8, maxAgeYears: 12 });
  expect(types[0].id).not.toBe(sourceTypeId);
  const selections = await (await ctx.get(`${API_BASE}/content/registrations/selections/event/${targetId}?churchId=${CHURCH_ID}`, auth)).json();
  expect(selections.map((s: { name: string }) => s.name)).toEqual(["Camp Shirt"]);
  const coupons = await (await ctx.get(`${API_BASE}/content/registrations/coupons/event/${targetId}`, auth)).json();
  expect(coupons.map((c: { code: string }) => c.code)).toEqual(["SIBLING"]);
  const sourceTypes = await (await ctx.get(`${API_BASE}/content/registrations/types/event/${sourceId}?churchId=${CHURCH_ID}`, auth)).json();
  expect(sourceTypes).toHaveLength(1);

  // The lists reload in place, and copying again adds nothing that already exists.
  await page.getByRole("button", { name: "Attendee Types", exact: true }).click();
  await expect(page.locator('[data-testid="type-name"] input').first()).toHaveValue("Camper", { timeout: 10000 });
  await page.locator('[data-testid="copy-registration-setup-button"]').click();
  await page.locator('[data-testid="copy-registration-setup-source"] [role="combobox"]').click();
  await page.getByRole("option", { name: new RegExp(sourceTitle) }).click();
  await page.locator('[data-testid="copy-registration-setup-confirm"]').click();
  await expect(page.locator('[data-testid="copy-registration-setup-dialog"]')).toHaveCount(0, { timeout: 15000 });
  const typesAfter = await (await ctx.get(`${API_BASE}/content/registrations/types/event/${targetId}?churchId=${CHURCH_ID}`, auth)).json();
  expect(typesAfter).toHaveLength(1);
});
