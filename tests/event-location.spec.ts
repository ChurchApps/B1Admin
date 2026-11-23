import { type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// An event can carry one optional free-text location (e.g. an off-site venue), separate from booked
// rooms. Staff type it in the event editor and see it in the Calendars event dialog.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000004"; // Adult Bible Class

async function apiLogin(api: APIRequestContext) {
  const res = await api.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

type Auth = Awaited<ReturnType<typeof apiLogin>>;

async function withCalendarEvent(page: Page, title: string, extra: Record<string, unknown>, run: (calendarId: string, eventId: string, auth: Auth) => Promise<void>) {
  const auth = await apiLogin(page.request);
  const calRes = await page.request.post(`${API_BASE}/content/curatedCalendars`, { ...auth, data: [{ name: "Zacchaeus Location Calendar" }] });
  expect(calRes.ok()).toBeTruthy();
  const calendarId: string = (await calRes.json())[0].id;
  let eventId = "";
  try {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    const end = new Date(start);
    end.setHours(13, 0, 0, 0);
    const evRes = await page.request.post(`${API_BASE}/content/events`, {
      ...auth,
      data: [{ groupId: GROUP_ID, title, start, end, allDay: false, visibility: "public", ...extra }]
    });
    expect(evRes.ok()).toBeTruthy();
    eventId = (await evRes.json())[0].id;
    const curRes = await page.request.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: calendarId, groupId: GROUP_ID, eventIds: [eventId] }] });
    expect(curRes.ok()).toBeTruthy();
    await run(calendarId, eventId, auth);
  } finally {
    await page.request.delete(`${API_BASE}/content/curatedEvents/calendar/${calendarId}/group/${GROUP_ID}`, auth);
    if (eventId) await page.request.delete(`${API_BASE}/content/events/${eventId}`, auth);
    await page.request.delete(`${API_BASE}/content/curatedCalendars/${calendarId}`, auth);
  }
}

async function openEventDialog(page: Page, calendarId: string, title: string) {
  await page.goto(`/calendars/${calendarId}`);
  await page.locator('[data-testid="calendar-add-event-button"]').waitFor({ state: "visible", timeout: 15000 });
  await page.getByText(title, { exact: true }).first().click();
  await expect(page.getByTestId("calendar-event-edit-button")).toBeVisible({ timeout: 15000 });
}

async function editLocation(page: Page, value: string) {
  await page.getByTestId("calendar-event-edit-button").click();
  const input = page.locator('[data-testid="new-event-location-input"] input');
  await expect(input).toBeVisible({ timeout: 15000 });
  await input.fill(value);
  const saved = page.waitForResponse((r) => r.url().endsWith("/content/events") && r.request().method() === "POST");
  await page.getByTestId("new-event-save-button").click();
  expect((await saved).ok()).toBeTruthy();
  await expect(page.getByTestId("new-event-save-button")).toBeHidden({ timeout: 15000 });
}

async function savedLocation(page: Page, eventId: string, auth: Auth) {
  const res = await page.request.get(`${API_BASE}/content/events/${eventId}`, auth);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).location ?? null;
}

test.describe("Event location", () => {
  test("shows an event's location in the Calendars event dialog", async ({ page }) => {
    const title = "Zacchaeus Location Shown Event";
    await withCalendarEvent(page, title, { location: "City Park, shelter 3" }, async (calendarId) => {
      await openEventDialog(page, calendarId, title);
      await expect(page.getByTestId("calendar-event-location")).toHaveText("City Park, shelter 3");
    });
  });

  test("an event without a location shows no location line", async ({ page }) => {
    const title = "Zacchaeus Location Empty Event";
    await withCalendarEvent(page, title, {}, async (calendarId) => {
      await openEventDialog(page, calendarId, title);
      await expect(page.getByTestId("calendar-event-location")).toHaveCount(0);
    });
  });

  test("staff add a location in the editor and it is saved and shown", async ({ page }) => {
    const title = "Zacchaeus Location Edit Event";
    await withCalendarEvent(page, title, {}, async (calendarId, eventId, auth) => {
      await openEventDialog(page, calendarId, title);
      await editLocation(page, "Riverside Pavilion");
      expect(await savedLocation(page, eventId, auth)).toBe("Riverside Pavilion");

      await openEventDialog(page, calendarId, title);
      await expect(page.getByTestId("calendar-event-location")).toHaveText("Riverside Pavilion");
      await page.getByTestId("calendar-event-edit-button").click();
      await expect(page.locator('[data-testid="new-event-location-input"] input')).toHaveValue("Riverside Pavilion", { timeout: 15000 });
    });
  });

  test("clearing the location saves it as empty", async ({ page }) => {
    const title = "Zacchaeus Location Clear Event";
    await withCalendarEvent(page, title, { location: "Old Barn" }, async (calendarId, eventId, auth) => {
      await openEventDialog(page, calendarId, title);
      await editLocation(page, "");
      expect(await savedLocation(page, eventId, auth)).toBeNull();
    });
  });
});
