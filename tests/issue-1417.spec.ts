import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1417: event registrations — Add Attendee loses the person or fails on paid types,
// counts include the waitlist, a false unsaved-changes warning, and a blank "None" dropdown.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";

const start = new Date();
start.setDate(start.getDate() + 40);
start.setHours(9, 0, 0, 0);
const end = new Date(start);
end.setHours(12, 0, 0, 0);

let jwt = "";
let groupId = "";
const eventIds: string[] = [];
const auth = () => ({ headers: { Authorization: "Bearer " + jwt } });

async function createEvent(title: string, extra: Record<string, unknown>, types: Record<string, unknown>[] = []) {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API_BASE}/content/events`, { ...auth(), data: [{ groupId, title, start, end, allDay: false, visibility: "public", registrationEnabled: true, ...extra }] });
  expect(res.ok()).toBeTruthy();
  const id = (await res.json())[0].id as string;
  eventIds.push(id);
  let savedTypes: any[] = [];
  if (types.length) savedTypes = await (await ctx.post(`${API_BASE}/content/registrations/types`, { ...auth(), data: types.map((t) => ({ eventId: id, active: true, ...t })) })).json();
  await ctx.dispose();
  return { id, types: savedTypes };
}

test.beforeAll(async () => {
  const ctx = await request.newContext();
  const login = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  jwt = ((login.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || login.userChurches[0]).jwt;
  const groups = await (await ctx.get(`${API_BASE}/membership/groups`, auth())).json();
  groupId = groups[0].id;
  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await request.newContext();
  for (const id of eventIds) {
    const regs = await (await ctx.get(`${API_BASE}/content/registrations/event/${id}`, auth())).json().catch(() => []);
    for (const r of regs || []) await ctx.delete(`${API_BASE}/content/registrations/${r.id}`, auth()).catch(() => { });
    await ctx.delete(`${API_BASE}/content/events/${id}`, auth()).catch(() => { });
  }
  await ctx.dispose();
});

async function addAttendee(page: any, name: string, typeName?: string) {
  await page.getByRole("button", { name: "Add Attendee" }).click();
  const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Add Attendee" });
  if (typeName) {
    await dialog.locator('[data-testid="add-attendee-type-select"] [role="combobox"]').click();
    await page.getByRole("option", { name: typeName }).click();
  }
  await dialog.locator('input[name="personAddText"]').fill(name);
  await dialog.locator('[data-testid="search-button"]').click();
  await dialog.locator('[data-testid^="add-person-button-"]').first().click();
  await expect(dialog).toHaveCount(0, { timeout: 15000 });
}

test("Add Attendee on a free event keeps the person", async ({ page }) => {
  const { id } = await createEvent("Issue 1417 Free Event", {});
  await page.goto(`/registrations/${id}`);
  await addAttendee(page, "Donald Clark");
  const row = page.locator('[data-testid="registration-row"]').first();
  await expect(row).toContainText("Donald Clark", { timeout: 15000 });
  await expect(row.locator("td").nth(1)).toHaveText("1");
});

test("Add Attendee on a paid type records the person with a balance due", async ({ page }) => {
  const { id } = await createEvent("Issue 1417 Paid Event", {}, [{ name: "Camper", price: 45, sort: 1 }]);
  await page.goto(`/registrations/${id}`);
  await addAttendee(page, "Donald Clark", "Camper");
  const row = page.locator('[data-testid="registration-row"]').first();
  await expect(row).toContainText("Donald Clark", { timeout: 15000 });
  await expect(row).toContainText("$ 0.00 / $ 45.00");
});

test("registered count leaves out the waitlist", async ({ page }) => {
  const { id, types } = await createEvent("Issue 1417 Waitlist Event", { capacity: 1, waitlistEnabled: true }, [{ name: "General", price: null, sort: 1 }]);
  const ctx = await request.newContext();
  for (const last of ["Confirmed", "Waitlisted"]) {
    const res = await ctx.post(`${API_BASE}/content/registrations/register`, { data: { churchId: CHURCH_ID, eventId: id, guestInfo: { firstName: "Issue1417", lastName: last, email: `issue1417.${last.toLowerCase()}@example.com` }, members: [{ firstName: "Issue1417", lastName: last, registrationTypeId: types[0].id }] } });
    expect(res.ok()).toBeTruthy();
  }
  await ctx.dispose();
  await page.goto(`/registrations/${id}`);
  const capacity = page.locator('[data-testid="registration-capacity"]');
  await expect(capacity).toContainText("1 / 1", { timeout: 15000 });
  await expect(capacity).toContainText("1 waitlisted");
  await expect(page.locator('[data-testid="type-counts"]')).toContainText("General: 1");
});

test("Registration Questions shows None when no form is chosen", async ({ page }) => {
  const { id } = await createEvent("Issue 1417 Questions Event", {});
  await page.goto(`/registrations/${id}?view=settings`);
  await expect(page.getByRole("combobox", { name: "Registration Questions" })).toHaveText("None", { timeout: 15000 });
});

test("basic settings change does not show the type/selection/code warning", async ({ page }) => {
  const { id } = await createEvent("Issue 1417 Settings Event", {});
  await page.goto(`/registrations/${id}?view=settings`);
  await page.getByLabel("Capacity").fill("25");
  await expect(page.getByLabel("Capacity")).toHaveValue("25");
  await expect(page.locator('[data-testid="registration-unsaved-changes-alert"]')).toHaveCount(0);
});
