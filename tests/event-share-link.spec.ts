import { type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// An event's public page (B1 site /events/{id}) is the link admins hand to guests. The event dialog in
// Calendars and the event's Registrations page both show it with a QR code. Private events with
// registration off have no public page, so they get no Share button.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000004"; // Adult Bible Class

async function apiLogin(api: APIRequestContext) {
  const res = await api.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

async function withCalendarEvent(page: Page, title: string, extra: Record<string, unknown>, run: (calendarId: string, eventId: string) => Promise<void>) {
  const auth = await apiLogin(page.request);
  const calRes = await page.request.post(`${API_BASE}/content/curatedCalendars`, { ...auth, data: [{ name: "Zacchaeus Share Calendar" }] });
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
      data: [{ groupId: GROUP_ID, title, start, end, allDay: false, ...extra }]
    });
    expect(evRes.ok()).toBeTruthy();
    eventId = (await evRes.json())[0].id;
    const curRes = await page.request.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: calendarId, groupId: GROUP_ID, eventIds: [eventId] }] });
    expect(curRes.ok()).toBeTruthy();
    await run(calendarId, eventId);
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

test.describe("Sharing an event's public link", () => {
  test("the Calendars event dialog shares the event page link and QR code", async ({ page }) => {
    const title = "Zacchaeus Share Public Event";
    await withCalendarEvent(page, title, { visibility: "public" }, async (calendarId, eventId) => {
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await openEventDialog(page, calendarId, title);
      await page.getByTestId("calendar-event-share-button").click();
      const dialog = page.getByTestId("share-link-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(title);
      await expect(page.getByTestId("share-link-canvas")).toBeVisible();
      const url = page.getByTestId("share-link-url");
      await expect(url).toHaveText(new RegExp(`^https?://grace\\..+/events/${eventId}$`));
      await expect(url).toHaveAttribute("href", new RegExp(`/events/${eventId}$`));
      await page.getByTestId("share-link-copy").click();
      await expect(page.getByTestId("share-link-copied")).toBeVisible();
      await page.screenshot({ path: ".pr-screenshots/after.png", animations: "disabled" });
      await page.getByTestId("share-link-close").click();
      await expect(dialog).toBeHidden();
    });
  });

  test("a private event with registration on can still be shared", async ({ page }) => {
    const title = "Zacchaeus Share Private Registration Event";
    await withCalendarEvent(page, title, { visibility: "private", registrationEnabled: true }, async (calendarId) => {
      await openEventDialog(page, calendarId, title);
      await expect(page.getByTestId("calendar-event-share-button")).toBeVisible({ timeout: 15000 });
    });
  });

  test("a private event with registration off has no Share button", async ({ page }) => {
    const title = "Zacchaeus Share Private Event";
    await withCalendarEvent(page, title, { visibility: "private" }, async (calendarId) => {
      await openEventDialog(page, calendarId, title);
      await expect(page.getByTestId("calendar-event-registrations-button")).toBeVisible();
      await expect(page.getByTestId("calendar-event-share-button")).toHaveCount(0);
    });
  });

  test("the Registrations page shares the event page link", async ({ page }) => {
    const title = "Zacchaeus Share Registration Page Event";
    await withCalendarEvent(page, title, { visibility: "public", registrationEnabled: true }, async (_calendarId, eventId) => {
      await page.goto(`/registrations/${eventId}`);
      await page.getByTestId("registration-share-button").click();
      await expect(page.getByTestId("share-link-dialog")).toContainText(title);
      await expect(page.getByTestId("share-link-url")).toHaveText(new RegExp(`/events/${eventId}$`));
    });
  });
});
