import { type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { confirmDelete } from "./helpers/fixtures";

// Registration emails: staff send a balance reminder from the roster, and an event's optional
// confirmation message is set in its registration settings. Each test builds its own event through
// the API and deletes it after, so the seeded registration events are never touched.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000004"; // Adult Bible Class
const DONALD_ID = "PER00000080"; // Donald Clark, has an email

async function apiLogin(api: APIRequestContext) {
  const res = await api.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

type Auth = Awaited<ReturnType<typeof apiLogin>>;

async function withRegistrationEvent(page: Page, title: string, run: (eventId: string, auth: Auth) => Promise<void>) {
  const auth = await apiLogin(page.request);
  const start = new Date();
  start.setDate(start.getDate() + 30);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);
  const evRes = await page.request.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title, start, end, allDay: false, visibility: "public", registrationEnabled: true }] });
  expect(evRes.ok()).toBeTruthy();
  const eventId: string = (await evRes.json())[0].id;
  try {
    await run(eventId, auth);
  } finally {
    const list = async (url: string): Promise<{ id: string }[]> => page.request.get(url, auth).then((r) => r.json()).catch(() => []);
    for (const r of await list(`${API_BASE}/content/registrations/event/${eventId}`)) await page.request.delete(`${API_BASE}/content/registrations/${r.id}`, auth);
    for (const t of await list(`${API_BASE}/content/registrations/types/event/${eventId}?churchId=${CHURCH_ID}`)) await page.request.delete(`${API_BASE}/content/registrations/types/${t.id}`, auth);
    await page.request.delete(`${API_BASE}/content/events/${eventId}`, auth);
  }
}

test.describe("Registration emails", () => {
  test("staff email a balance reminder to registrants who owe and see how many were sent", async ({ page }) => {
    await withRegistrationEvent(page, "Zacchaeus Balance Reminder Event", async (eventId, auth) => {
      const typeRes = await page.request.post(`${API_BASE}/content/registrations/types`, { ...auth, data: [{ eventId, name: "Camper", price: 45, sort: 1, active: true }] });
      expect(typeRes.ok()).toBeTruthy();
      const typeId: string = (await typeRes.json())[0].id;
      // Staff Add Attendee on a paid type: saved pending with the full balance due, never charged.
      const regRes = await page.request.post(`${API_BASE}/content/registrations/register`, {
        ...auth,
        data: { churchId: CHURCH_ID, eventId, personId: DONALD_ID, members: [{ personId: DONALD_ID, firstName: "Donald", lastName: "Clark", registrationTypeId: typeId }] }
      });
      expect(regRes.ok()).toBeTruthy();
      expect((await regRes.json()).status).toBe("pending");

      await page.goto(`/registrations/${eventId}`);
      const button = page.getByTestId("send-balance-reminder");
      await expect(button).toBeVisible({ timeout: 15000 });
      await button.click();
      await expect(page.locator('div[role="dialog"]').last()).toContainText("1 registrants who owe money", { timeout: 10000 });
      const sent = page.waitForResponse((r) => r.url().includes(`/registrations/event/${eventId}/balance-reminders`) && r.request().method() === "POST", { timeout: 15000 });
      await confirmDelete(page);
      expect((await sent).ok()).toBeTruthy();
      await expect(page.getByTestId("balance-reminder-result")).toContainText("emailed to 1 registrants", { timeout: 10000 });
    });
  });

  test("the reminder button is hidden when nobody owes a balance", async ({ page }) => {
    await withRegistrationEvent(page, "Zacchaeus No Balance Event", async (eventId, auth) => {
      const regRes = await page.request.post(`${API_BASE}/content/registrations/register`, {
        ...auth,
        data: { churchId: CHURCH_ID, eventId, personId: DONALD_ID, members: [{ personId: DONALD_ID, firstName: "Donald", lastName: "Clark" }] }
      });
      expect(regRes.ok()).toBeTruthy();
      await page.goto(`/registrations/${eventId}`);
      await expect(page.locator('[data-testid="registration-row"]').first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("send-balance-reminder")).toHaveCount(0);
    });
  });

  test("the confirmation message saves from registration settings and can be cleared", async ({ page }) => {
    await withRegistrationEvent(page, "Zacchaeus Confirmation Message Event", async (eventId, auth) => {
      const message = "Park in the north lot.\nBring a water bottle.";
      await page.goto(`/registrations/${eventId}?view=settings`);
      const field = page.locator('[data-testid="registration-confirmation-message"] textarea').first();
      await expect(field).toBeVisible({ timeout: 15000 });
      await field.fill(message);
      let save = page.waitForResponse((r) => r.url().endsWith("/content/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
      await page.getByRole("button", { name: "Save Settings" }).click();
      await save;
      let ev = await (await page.request.get(`${API_BASE}/content/events/${eventId}`, auth)).json();
      expect(ev.confirmationMessage).toBe(message);

      // The public event page never carries the message; it is for registrants only.
      const pub = await (await page.request.get(`${API_BASE}/content/events/public/${CHURCH_ID}/${eventId}`)).json();
      expect(pub.confirmationMessage).toBeUndefined();

      await page.goto(`/registrations/${eventId}?view=settings`);
      await expect(field).toHaveValue(message, { timeout: 15000 });
      await field.fill("");
      save = page.waitForResponse((r) => r.url().endsWith("/content/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
      await page.getByRole("button", { name: "Save Settings" }).click();
      await save;
      ev = await (await page.request.get(`${API_BASE}/content/events/${eventId}`, auth)).json();
      expect(ev.confirmationMessage ?? null).toBeNull();
    });
  });
});
