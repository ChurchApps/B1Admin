import { request, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Per-event registration options: "Members can cancel their own registration" (on by default),
// "Allow pay later (cash or check)" (off by default), and an optional deposit on an attendee type.
// The event is built through the Api and removed afterwards, so the seeded events stay untouched.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const EVENT_TITLE = "Zebedee Payment Options Event";

interface Named { id?: string; name?: string; church?: { id?: string }; jwt?: string; depositAmount?: number }

test.describe.serial("Registrations — self-cancel, pay later and deposit settings", () => {
  let ctx: APIRequestContext;
  let staffJwt: string;
  let eventId: string;
  const auth = () => ({ headers: { Authorization: "Bearer " + staffJwt } });

  test.beforeAll(async () => {
    ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const uc = (loginBody.userChurches || []).find((c: Named) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0];
    staffJwt = uc?.jwt as string;

    const groups = await (await ctx.get(`${API_BASE}/membership/groups`, auth())).json();
    const groupId = ((groups as Named[]).find((g) => g.name === "Middle School Youth") || groups[0])?.id;
    const start = new Date();
    start.setDate(start.getDate() + 40);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12);
    const res = await ctx.post(`${API_BASE}/content/events`, { ...auth(), data: [{ groupId, title: EVENT_TITLE, start, end, allDay: false, visibility: "public", registrationEnabled: true }] });
    expect(res.ok()).toBeTruthy();
    eventId = (await res.json())[0]?.id;
    expect(eventId, "event id").toBeTruthy();
  });

  test.afterAll(async () => {
    if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth()).catch(() => { });
    await ctx?.dispose();
  });

  test("new events allow self-cancel and not pay later; both toggles persist", async ({ page }) => {
    await page.goto(`/registrations/${eventId}?view=settings`);
    const selfCancel = page.locator('[data-testid="allow-self-cancel-switch"] input');
    const payLater = page.locator('[data-testid="allow-pay-later-switch"] input');
    await expect(selfCancel).toBeChecked({ timeout: 15000 });
    await expect(payLater).not.toBeChecked();

    await selfCancel.click();
    await payLater.click();
    const saved = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.getByRole("button", { name: "Save Settings" }).click();
    await saved;

    const event = await (await ctx.get(`${API_BASE}/content/events/${eventId}`, auth())).json();
    expect(event.allowSelfCancel).toBe(false);
    expect(event.allowPayLater).toBe(true);

    await page.reload();
    await expect(page.locator('[data-testid="allow-self-cancel-switch"] input')).not.toBeChecked({ timeout: 15000 });
    await expect(page.locator('[data-testid="allow-pay-later-switch"] input')).toBeChecked();
  });

  test("an attendee type deposit is checked against the price and saved", async ({ page }) => {
    await page.goto(`/registrations/${eventId}?view=settings`);
    await page.getByRole("button", { name: "Attendee Types", exact: true }).click();
    await page.locator('[data-testid="add-registration-type"]').click();
    await page.locator('[data-testid="type-name"] input').first().fill("Camper");
    await page.locator('[data-testid="type-price"] input').first().fill("300");
    await page.locator('[data-testid="type-deposit"] input').first().fill("500");
    await expect(page.getByText("More than 0, up to the price")).toBeVisible();

    await page.locator('[data-testid="type-deposit"] input').first().fill("50");
    await expect(page.getByText("More than 0, up to the price")).toHaveCount(0);
    const saved = page.waitForResponse((r) => r.url().includes("/registrations/types") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="save-registration-types"]').click();
    await saved;

    const types = await (await ctx.get(`${API_BASE}/content/registrations/types/event/${eventId}?churchId=${CHURCH_ID}`)).json();
    expect((types as Named[]).find((t) => t.name === "Camper")?.depositAmount).toBe(50);

    const tooHigh = await ctx.post(`${API_BASE}/content/registrations/types`, { ...auth(), data: [{ eventId, name: "Leader", price: 100, depositAmount: 150, active: true }] });
    expect(tooHigh.status()).toBe(400);
  });
});
