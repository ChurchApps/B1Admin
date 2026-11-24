import fs from "fs";
import type { APIRequestContext, Page } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete, personAddButton, SEED_PEOPLE } from "./helpers/fixtures";

// Staff roster actions on a registration event: filter chips (status, attendee type, balance due)
// with a filtered CSV export, Restore on a cancelled row, Edit in the details dialog, and the
// delete guard for registrations that have payments. Builds its own event through the API.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP = "Middle School Youth";
const EVENT = "Zebedee Roster Actions Event";

interface Named { id: string; name?: string }
interface FoundPerson { id: string; name?: { display?: string } }
interface ChurchLogin { jwt: string; church?: { id?: string } }

const eventStart = new Date();
eventStart.setDate(eventStart.getDate() + 40);
eventStart.setHours(9, 0, 0, 0);
const eventEnd = new Date(eventStart);
eventEnd.setHours(12, 0, 0, 0);

const [donaldFirst, donaldLast] = SEED_PEOPLE.DONALD.split(" ");
const [dorothyFirst, dorothyLast] = SEED_PEOPLE.DOROTHY.split(" ");
const [jenniferFirst, jenniferLast] = SEED_PEOPLE.JENNIFER.split(" ");

test.describe.serial("Registrations roster — filters, restore, edit, delete guard", () => {
  let page: Page;
  let staffJwt: string;
  let groupId: string;
  let eventId: string;
  let adultTypeId: string;
  let youthTypeId: string;
  let shirtId: string;
  const regIds: Record<string, string> = {};

  const auth = () => ({ headers: { Authorization: "Bearer " + staffJwt } });
  const saveEvent = (ctx: APIRequestContext, capacity: number) => ctx.post(`${API_BASE}/content/events`, {
    ...auth(),
    data: [{ ...(eventId ? { id: eventId } : {}), groupId, title: EVENT, start: eventStart, end: eventEnd, allDay: false, visibility: "public", registrationEnabled: true, capacity }]
  });
  const personId = async (ctx: APIRequestContext, name: string) => {
    const found = await (await ctx.get(`${API_BASE}/membership/people/search?term=${encodeURIComponent(name)}`, auth())).json();
    return (found as FoundPerson[] || []).find((p) => p.name?.display === name)?.id || (found as FoundPerson[])?.[0]?.id;
  };
  const staffAdd = async (ctx: APIRequestContext, name: string, first: string, last: string, typeId: string) => {
    const pid = await personId(ctx, name);
    expect(pid, `${name} person id`).toBeTruthy();
    const res = await ctx.post(`${API_BASE}/content/registrations/register`, { ...auth(), data: { churchId: CHURCH_ID, eventId, personId: pid, members: [{ personId: pid, firstName: first, lastName: last, registrationTypeId: typeId }] } });
    expect(res.ok(), `register ${name}`).toBeTruthy();
    return (await res.json()).id as string;
  };
  const row = (name: string) => page.locator('[data-testid="registration-row"]').filter({ hasText: name });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);

    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    staffJwt = ((loginBody.userChurches as ChurchLogin[] || []).find((c) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0])?.jwt;
    expect(staffJwt, "staff jwt").toBeTruthy();

    const groups = await (await ctx.get(`${API_BASE}/membership/groups`, auth())).json();
    groupId = (groups as Named[] || []).find((g) => g.name === GROUP)?.id as string;
    expect(groupId, "group id").toBeTruthy();

    const evRes = await saveEvent(ctx, 2);
    expect(evRes.ok()).toBeTruthy();
    eventId = (await evRes.json())[0]?.id;
    expect(eventId, "event id").toBeTruthy();

    const typesRes = await ctx.post(`${API_BASE}/content/registrations/types`, {
      ...auth(),
      data: [
        { eventId, name: "Adult", price: 25, capacity: null, sort: 1, active: true },
        { eventId, name: "Youth", price: null, capacity: null, sort: 2, active: true }
      ]
    });
    expect(typesRes.ok()).toBeTruthy();
    const savedTypes = await typesRes.json();
    adultTypeId = (savedTypes as Named[]).find((t) => t.name === "Adult")?.id as string;
    youthTypeId = (savedTypes as Named[]).find((t) => t.name === "Youth")?.id as string;

    const selRes = await ctx.post(`${API_BASE}/content/registrations/selections`, { ...auth(), data: [{ eventId, name: "Camp Shirt", price: 10, capacity: null, maxQuantity: 5, sort: 1, active: true }] });
    expect(selRes.ok()).toBeTruthy();
    shirtId = (await selRes.json())[0]?.id;

    // Jennifer signs up first and cancels; Donald (paid, balance due) and Dorothy (free) then fill capacity 2.
    regIds.jennifer = await staffAdd(ctx, SEED_PEOPLE.JENNIFER, jenniferFirst, jenniferLast, youthTypeId);
    expect((await ctx.post(`${API_BASE}/content/registrations/${regIds.jennifer}/cancel`, { ...auth(), data: {} })).ok()).toBeTruthy();
    regIds.donald = await staffAdd(ctx, SEED_PEOPLE.DONALD, donaldFirst, donaldLast, adultTypeId);
    regIds.dorothy = await staffAdd(ctx, SEED_PEOPLE.DOROTHY, dorothyFirst, dorothyLast, youthTypeId);
    await ctx.dispose();
  });

  test.afterAll(async () => {
    try {
      const ctx = await request.newContext();
      for (const id of Object.values(regIds)) await ctx.delete(`${API_BASE}/content/registrations/${id}`, auth()).catch(() => { });
      if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth()).catch(() => { });
      await ctx.dispose();
    } catch { /* ignore */ }
    await page?.context().close();
  });

  test("Filter chips narrow the roster and Export CSV exports only the rows showing", async () => {
    await page.goto(`/registrations/${eventId}`);
    await expect(page.locator('[data-testid="registration-row"]')).toHaveCount(3, { timeout: 15000 });

    await page.locator('[data-testid="roster-filter-status-cancelled"]').click();
    await expect(page.locator('[data-testid="registration-row"]')).toHaveCount(1);
    await expect(row(SEED_PEOPLE.JENNIFER)).toBeVisible();
    await page.locator('[data-testid="roster-filter-status-cancelled"]').click();

    await page.locator(`[data-testid="roster-filter-type-${youthTypeId}"]`).click();
    await expect(page.locator('[data-testid="registration-row"]')).toHaveCount(2);
    await expect(row(SEED_PEOPLE.DONALD)).toHaveCount(0);
    await page.locator(`[data-testid="roster-filter-type-${youthTypeId}"]`).click();

    await page.locator('[data-testid="roster-filter-balance-due"]').click();
    await expect(page.locator('[data-testid="registration-row"]')).toHaveCount(1);
    await expect(row(SEED_PEOPLE.DONALD)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.getByRole("button", { name: "Export CSV" }).click()
    ]);
    const content = fs.readFileSync(await download.path(), "utf-8");
    expect(content).toContain(SEED_PEOPLE.DONALD);
    expect(content).not.toContain(SEED_PEOPLE.DOROTHY);
    expect(content).not.toContain(SEED_PEOPLE.JENNIFER);
  });

  test("Restore on a cancelled row is refused while the event is full", async () => {
    await page.goto(`/registrations/${eventId}`);
    const jennifer = row(SEED_PEOPLE.JENNIFER);
    await expect(jennifer.locator('button[aria-label="Restore"]')).toBeVisible({ timeout: 15000 });
    const restorePost = page.waitForResponse((r) => r.url().includes(`/registrations/${regIds.jennifer}/restore`), { timeout: 15000 });
    await jennifer.locator('button[aria-label="Restore"]').click();
    expect((await restorePost).status()).toBe(409);
    await expect(page.locator('[data-testid="roster-action-error"]')).toContainText("at capacity", { timeout: 10000 });
    await expect(jennifer.getByText("cancelled", { exact: true })).toBeVisible();
  });

  test("Restore puts a cancelled registration back once there is room", async () => {
    const ctx = await request.newContext();
    expect((await saveEvent(ctx, 3)).ok()).toBeTruthy();
    await ctx.dispose();

    await page.goto(`/registrations/${eventId}`);
    const jennifer = row(SEED_PEOPLE.JENNIFER);
    await expect(jennifer.locator('button[aria-label="Restore"]')).toBeVisible({ timeout: 15000 });
    const restorePost = page.waitForResponse((r) => r.url().includes(`/registrations/${regIds.jennifer}/restore`) && r.ok(), { timeout: 15000 });
    await jennifer.locator('button[aria-label="Restore"]').click();
    await restorePost;
    await expect(jennifer.getByText("confirmed", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(jennifer.locator('button[aria-label="Restore"]')).toHaveCount(0);
  });

  test("Edit in the details dialog changes a type, a selection quantity, and adds a person", async () => {
    await page.goto(`/registrations/${eventId}`);
    const donald = row(SEED_PEOPLE.DONALD);
    await donald.locator('button[aria-label="Registration Details"]').click();
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Registration Details" });
    await expect(dialog.getByText("$0.00 / $25.00")).toBeVisible({ timeout: 10000 });

    await dialog.locator('[data-testid="registration-edit-button"]').click();
    await dialog.locator('[data-testid="edit-member-type-0"] [role="combobox"]').click();
    await page.getByRole("option", { name: "Youth" }).click();
    await dialog.locator(`[data-testid="edit-selection-qty-${shirtId}"] input`).fill("2");

    await dialog.locator('[data-testid="edit-add-person"]').click();
    await dialog.locator('input[name="personAddText"]').fill(SEED_PEOPLE.ROBERT);
    await dialog.locator('[data-testid="search-button"]').click();
    await personAddButton(dialog, SEED_PEOPLE.ROBERT).click();
    await expect(dialog.locator('[data-testid="edit-member-row"]')).toHaveCount(2);
    await dialog.locator('[data-testid="edit-member-type-1"] [role="combobox"]').click();
    await page.getByRole("option", { name: "Youth" }).click();

    const put = page.waitForResponse((r) => r.url().includes(`/registrations/${regIds.donald}`) && r.request().method() === "PUT", { timeout: 15000 });
    await dialog.locator('[data-testid="registration-edit-save"]').click();
    const putRes = await put;
    expect(putRes.ok(), "edit response ok").toBeTruthy();
    const sent = putRes.request().postDataJSON();
    expect((sent.members as { registrationTypeId?: string }[]).map((m) => m.registrationTypeId)).toEqual([youthTypeId, youthTypeId]);
    expect(sent.selections).toEqual([{ selectionId: shirtId, quantity: 2 }]);

    // Two free Youth attendees plus two $10 shirts.
    await expect(dialog.getByText("$0.00 / $20.00")).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(SEED_PEOPLE.ROBERT)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(donald).toContainText(SEED_PEOPLE.ROBERT, { timeout: 10000 });
  });

  test("Delete tells staff to cancel a registration that has payments", async () => {
    // The demo stack can't take a real payment, so the Api's refusal is stubbed; the Api side is covered by jest.
    await page.route(`**/registrations/${regIds.dorothy}`, (route) => (route.request().method() === "DELETE"
      ? route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "This registration has payments. Cancel it instead of deleting it.", code: "registration-has-payments" }) })
      : route.continue()));
    await page.goto(`/registrations/${eventId}`);
    const dorothy = row(SEED_PEOPLE.DOROTHY);
    await dorothy.locator('button[aria-label="Delete"]').click();
    await confirmDelete(page);
    await expect(page.locator('[data-testid="roster-action-error"]')).toContainText("Cancel it instead", { timeout: 10000 });
    await expect(dorothy).toBeVisible();
    await page.unroute(`**/registrations/${regIds.dorothy}`);
  });
});
