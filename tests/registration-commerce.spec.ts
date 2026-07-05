import fs from "fs";
import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// Phase 2 "Paid registrations" — B1Admin staff surface.
//   - RegistrationSettingsEdit now hosts Attendee Types / Selections / Discount Codes accordions
//     plus a waitlist toggle (events.waitlistEnabled).
//   - RegistrationDetailsPage roster gains a Type column, per-type header counts, a Paid/Total
//     column with a balance chip, waitlist position + Promote action, a details dialog, and CSV
//     columns for type/selections/amounts/answers.
//
// This spec creates its own disposable calendar + events so it never mutates the seeded VBS event
// (EVT00000015) that the concurrent B1App agent exercises against the same demo DB. It does NOT run
// reset-demo. Event A (built through the UI) drives the settings round-trip + waitlist toggle;
// Event B (built via the API with a tight capacity) drives the roster/paid/waitlist/CSV assertions.

const API_BASE = "http://localhost:8084";
const CALENDAR = "Zacchaeus Commerce Calendar";
const EVENT_A = "Zacchaeus Commerce Settings Event";
const EVENT_B = "Zacchaeus Commerce Roster Event";
const GROUP = "Middle School Youth";
const CHURCH_ID = "CHU00000001";

const pad = (n: number) => n.toString().padStart(2, "0");
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const eventStart = new Date();
eventStart.setDate(eventStart.getDate() + 35);
eventStart.setHours(9, 0, 0, 0);
const eventEnd = new Date(eventStart);
eventEnd.setHours(12, 0, 0, 0);

async function gotoCalendars(page: Page) {
  await page.goto("/calendars");
  await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]'))
    .first().waitFor({ state: "visible", timeout: 15000 });
}

async function selectOption(page: Page, selectTestId: string, optionName: string | RegExp) {
  const combo = page.locator(`[data-testid="${selectTestId}"] [role="combobox"]`).first();
  await combo.click();
  const option = page.getByRole("option", { name: optionName }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
}

test.describe.serial("Registrations Commerce — settings panels, paid roster, waitlist promote, CSV", () => {
  let page: Page;
  let eventAId: string;
  let eventBId: string;
  let groupId: string;
  let staffJwt: string;
  let generalTypeId: string;
  let camperTypeId: string;
  const regIds: string[] = [];

  const authCtx = () => request.newContext();
  const auth = () => ({ headers: { Authorization: "Bearer " + staffJwt } });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);

    // Disposable calendar + Event A through the real UI.
    await gotoCalendars(page);
    await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]')).first().click();
    await page.locator('[data-testid="calendar-name-input"] input').fill(CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    const row = page.locator("table tbody tr").filter({ hasText: CALENDAR }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator("a").first().click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });

    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-group-select", GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill(EVENT_A);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(eventStart));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(eventEnd));
    const eventPost = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="new-event-save-button"]').click();
    const created = await (await eventPost).json();
    eventAId = (Array.isArray(created) ? created[0]?.id : created?.id) as string;
    groupId = (Array.isArray(created) ? created[0]?.groupId : created?.groupId) as string;
    expect(eventAId, "event A id").toBeTruthy();
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });

    // Staff JWT for API setup.
    const ctx = await authCtx();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const uc = (loginBody.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0];
    staffJwt = uc?.jwt as string;
    expect(staffJwt, "staff jwt").toBeTruthy();

    // Enable registration on Event A (fields under test are edited through the UI in the specs).
    const enableRes = await ctx.post(`${API_BASE}/content/events`, { ...auth(), data: [{ id: eventAId, groupId, title: EVENT_A, start: eventStart, end: eventEnd, allDay: false, visibility: "public", registrationEnabled: true }] });
    expect(enableRes.ok()).toBeTruthy();

    // Event B — capacity 1 + waitlist, built entirely via the API.
    const evbRes = await ctx.post(`${API_BASE}/content/events`, { ...auth(), data: [{ groupId, title: EVENT_B, start: eventStart, end: eventEnd, allDay: false, visibility: "public", registrationEnabled: true, capacity: 1, waitlistEnabled: true }] });
    expect(evbRes.ok()).toBeTruthy();
    eventBId = (await evbRes.json())[0]?.id;
    expect(eventBId, "event B id").toBeTruthy();

    // Two attendee types on Event B: a free "General" (fills the single slot) and a priced "Camper".
    const typesRes = await ctx.post(`${API_BASE}/content/registrations/types`, {
      ...auth(),
      data: [
        { eventId: eventBId, name: "General", price: null, capacity: null, sort: 1, active: true },
        { eventId: eventBId, name: "Camper", price: 45, capacity: null, sort: 2, active: true }
      ]
    });
    expect(typesRes.ok()).toBeTruthy();
    const savedTypes = await typesRes.json();
    generalTypeId = savedTypes.find((t: any) => t.name === "General")?.id;
    camperTypeId = savedTypes.find((t: any) => t.name === "Camper")?.id;
    expect(generalTypeId && camperTypeId, "type ids").toBeTruthy();

    const reg1 = await ctx.post(`${API_BASE}/content/registrations/register`, { data: { churchId: CHURCH_ID, eventId: eventBId, guestInfo: { firstName: "Zacchaeus", lastName: "Confirmed", email: "zacchaeus.commerce.confirmed@example.com" }, members: [{ firstName: "Zacchaeus", lastName: "Confirmed", registrationTypeId: generalTypeId }] } });
    expect(reg1.ok()).toBeTruthy();
    const reg1Body = await reg1.json();
    regIds.push(reg1Body?.id);
    expect(reg1Body.status, "reg1 confirmed").toBe("confirmed");

    const reg2 = await ctx.post(`${API_BASE}/content/registrations/register`, { data: { churchId: CHURCH_ID, eventId: eventBId, guestInfo: { firstName: "Zacchaeus", lastName: "Waitlisted", email: "zacchaeus.commerce.waitlisted@example.com" }, members: [{ firstName: "Zacchaeus", lastName: "Waitlisted", registrationTypeId: camperTypeId }] } });
    expect(reg2.ok()).toBeTruthy();
    const reg2Body = await reg2.json();
    regIds.push(reg2Body?.id);
    expect(reg2Body.status, "reg2 waitlisted").toBe("waitlisted");

    await ctx.dispose();
  });

  test.afterAll(async () => {
    try {
      const ctx = await authCtx();
      for (const id of regIds) if (id) await ctx.delete(`${API_BASE}/content/registrations/${id}`, auth()).catch(() => { });
      for (const id of [eventAId, eventBId]) if (id) await ctx.delete(`${API_BASE}/content/events/${id}`, auth()).catch(() => { });
      await ctx.dispose();
    } catch { /* ignore */ }
    try {
      await gotoCalendars(page);
      const editBtn = page.locator("table tbody tr").filter({ hasText: CALENDAR }).locator('[data-testid^="edit-calendar-"]').first();
      if (await editBtn.count().then((c) => c > 0).catch(() => false)) {
        await editBtn.click();
        await page.locator('[data-testid="calendar-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
        await page.locator('[data-testid="delete-calendar-button"]').click();
        await confirmDelete(page);
      }
    } catch { /* ignore */ }
    await page?.context().close();
  });

  test("Types / Selections / Discount Codes panels persist across a reload (round-trip)", async () => {
    await page.goto(`/registrations/${eventAId}`);
    await expect(page.getByText(EVENT_A, { exact: false }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Attendee Types", exact: true }).click();
    await page.locator('[data-testid="add-registration-type"]').click();
    await page.locator('[data-testid="add-registration-type"]').click();
    await page.locator('[data-testid="type-name"] input').nth(0).fill("Adult");
    await page.locator('[data-testid="type-price"] input').nth(0).fill("10");
    await page.locator('[data-testid="type-capacity"] input').nth(0).fill("5");
    await page.locator('[data-testid="type-name"] input').nth(1).fill("Child");
    await page.locator('[data-testid="type-price"] input').nth(1).fill("5");
    await page.locator('[data-testid="type-capacity"] input').nth(1).fill("10");
    const typesPost = page.waitForResponse((r) => r.url().includes("/registrations/types") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="save-registration-types"]').click();
    await typesPost;

    await page.getByRole("button", { name: "Selections", exact: true }).click();
    await page.locator('[data-testid="add-registration-selection"]').click();
    await page.locator('[data-testid="selection-name"] input').first().fill("Commemorative T-Shirt");
    await page.locator('[data-testid="selection-price"] input').first().fill("12");
    const selPost = page.waitForResponse((r) => r.url().includes("/registrations/selections") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="save-registration-selections"]').click();
    await selPost;

    await page.getByRole("button", { name: "Discount Codes", exact: true }).click();
    await page.locator('[data-testid="add-registration-coupon"]').click();
    await page.locator('[data-testid="coupon-code"] input').first().fill("EARLYBIRD");
    await page.locator('[data-testid="coupon-value"] input').first().fill("10");
    const couponPost = page.waitForResponse((r) => r.url().includes("/registrations/coupons") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="save-registration-coupons"]').click();
    await couponPost;
    await page.reload();
    await expect(page.getByText(EVENT_A, { exact: false }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Attendee Types", exact: true }).click();
    await expect(page.locator('[data-testid="type-name"] input').nth(0)).toHaveValue("Adult", { timeout: 10000 });
    await expect(page.locator('[data-testid="type-name"] input').nth(1)).toHaveValue("Child");
    await expect(page.locator('[data-testid="type-price"] input').nth(0)).toHaveValue("10");

    await page.getByRole("button", { name: "Selections", exact: true }).click();
    await expect(page.locator('[data-testid="selection-name"] input').first()).toHaveValue("Commemorative T-Shirt", { timeout: 10000 });

    await page.getByRole("button", { name: "Discount Codes", exact: true }).click();
    await expect(page.locator('[data-testid="coupon-code"] input').first()).toHaveValue("EARLYBIRD", { timeout: 10000 });
  });

  test("Waitlist toggle round-trips, including the explicit-false un-toggle path", async () => {
    await page.goto(`/registrations/${eventAId}`);
    const toggle = page.locator('[data-testid="waitlist-enabled-switch"] input');
    await expect(toggle).toBeVisible({ timeout: 15000 });

    await toggle.check();
    let save = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.getByRole("button", { name: "Save Settings" }).click();
    await save;
    let ctx = await authCtx();
    let ev = await (await ctx.get(`${API_BASE}/content/events/${eventAId}`, auth())).json();
    expect(!!ev.waitlistEnabled, "waitlist enabled after toggle-on").toBeTruthy();
    await ctx.dispose();

    // Turn OFF (explicit false — Kysely drops undefined), save, verify cleared.
    await page.reload();
    await expect(toggle).toBeVisible({ timeout: 15000 });
    await toggle.uncheck();
    save = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.getByRole("button", { name: "Save Settings" }).click();
    await save;
    ctx = await authCtx();
    ev = await (await ctx.get(`${API_BASE}/content/events/${eventAId}`, auth())).json();
    expect(!!ev.waitlistEnabled, "waitlist disabled after toggle-off").toBeFalsy();
    await ctx.dispose();
  });

  test("Roster shows the Type column, per-type counts, and a Paid/Total balance", async () => {
    await page.goto(`/registrations/${eventBId}`);
    const rosterCard = page.locator(".MuiCard-root").filter({ has: page.getByRole("button", { name: "Export CSV" }) });
    await expect(rosterCard).toBeVisible({ timeout: 15000 });

    await expect(rosterCard.getByRole("cell", { name: "General" })).toBeVisible({ timeout: 10000 });
    await expect(rosterCard.getByRole("cell", { name: "Camper" })).toBeVisible();

    const counts = page.locator('[data-testid="type-counts"]');
    await expect(counts).toContainText("General: 1");
    await expect(counts).toContainText("Camper: 1");

    await expect(rosterCard.getByText("$ 0.00 / $ 45.00")).toBeVisible();

    // Waitlisted row exposes the Promote action.
    const waitRow = page.locator('[data-testid="registration-row"]').filter({ hasText: "Zacchaeus Waitlisted" });
    await expect(waitRow.locator('button[aria-label="Promote"]')).toBeVisible({ timeout: 10000 });
  });

  test("Registration details dialog lists members with type and any payments", async () => {
    const waitRow = page.locator('[data-testid="registration-row"]').filter({ hasText: "Zacchaeus Waitlisted" });
    await waitRow.locator('button[aria-label="Registration Details"]').click();
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Registration Details" });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Zacchaeus Waitlisted")).toBeVisible();
    await expect(dialog.getByText("Camper")).toBeVisible();
    await expect(dialog.getByText("$ 0.00 / $ 45.00")).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 5000 });
  });

  test("CSV export includes the new commerce and answer columns", async () => {
    await page.goto(`/registrations/${eventBId}`);
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible({ timeout: 15000 });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.getByRole("button", { name: "Export CSV" }).click()
    ]);
    const filePath = await download.path();
    const content = fs.readFileSync(filePath, "utf-8");
    for (const header of ["Attendee Types", "Selections", "Paid", "Total", "Balance"]) {
      expect(content, `CSV header "${header}"`).toContain(header);
    }
    expect(content, "CSV includes the Camper type").toContain("Camper");
  });
});
