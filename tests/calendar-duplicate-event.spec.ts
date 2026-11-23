import { type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Duplicate in the Calendars event dialog opens the event editor filled in from the event, without
// its id or repeat. Saving creates a separate event with its own room and resource bookings.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000004"; // Adult Bible Class
const ROOM_ID = "RM000000002"; // Fellowship Hall
const RESOURCE_ID = "RS000000002"; // Round Tables (20)

async function apiLogin(api: APIRequestContext) {
  const res = await api.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

test.describe("Duplicating a calendar event", () => {
  test("Duplicate pre-fills a new event and saving creates a separate one", async ({ page }) => {
    const title = "Zacchaeus Duplicate Source Event";
    const auth = await apiLogin(page.request);
    const calRes = await page.request.post(`${API_BASE}/content/curatedCalendars`, { ...auth, data: [{ name: "Zacchaeus Duplicate Calendar" }] });
    expect(calRes.ok()).toBeTruthy();
    const calendarId: string = (await calRes.json())[0].id;
    let eventId = "";
    let copyId = "";
    try {
      const start = new Date();
      start.setHours(12, 0, 0, 0);
      const end = new Date(start);
      end.setHours(13, 0, 0, 0);
      const evRes = await page.request.post(`${API_BASE}/content/events`, {
        ...auth,
        data: [{ groupId: GROUP_ID, title, description: "Bring a friend", start, end, allDay: false, visibility: "private", tags: "potluck", recurrenceRule: "FREQ=WEEKLY;INTERVAL=1;COUNT=2" }]
      });
      expect(evRes.ok()).toBeTruthy();
      eventId = (await evRes.json())[0].id;
      const bookRes = await page.request.post(`${API_BASE}/content/eventBookings`, {
        ...auth,
        data: [
          { eventId, roomId: ROOM_ID, setupMinutes: 15, teardownMinutes: 10 },
          { eventId, resourceId: RESOURCE_ID, quantity: 4, setupMinutes: 15, teardownMinutes: 10 }
        ]
      });
      expect(bookRes.ok()).toBeTruthy();
      const sourceBookingIds: string[] = (await bookRes.json()).map((b: { id: string }) => b.id);
      const curRes = await page.request.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: calendarId, groupId: GROUP_ID, eventIds: [eventId] }] });
      expect(curRes.ok()).toBeTruthy();

      await page.goto(`/calendars/${calendarId}`);
      await page.locator('[data-testid="calendar-add-event-button"]').waitFor({ state: "visible", timeout: 15000 });
      await page.getByText(title, { exact: true }).first().click();
      await page.getByTestId("calendar-event-duplicate-button").click();

      const titleInput = page.locator('[data-testid="new-event-title-input"] input');
      await expect(titleInput).toHaveValue(`${title} (Copy)`, { timeout: 15000 });
      await expect(page.locator('[data-testid="new-event-description-input"] textarea').first()).toHaveValue("Bring a friend");
      await expect(page.locator('[data-testid="new-event-tags-input"] input')).toHaveValue("potluck");
      await expect(page.locator('[data-testid="new-event-recurring-checkbox"] input')).not.toBeChecked();
      await expect(page.locator('[data-testid="new-event-rooms-select"]')).toContainText("Fellowship Hall");
      await expect(page.locator('[data-testid="new-event-resources-select"]')).toContainText("Round Tables");
      await expect(page.getByTestId(`new-event-resource-quantity-${RESOURCE_ID}`)).toHaveValue("4");
      await expect(page.locator('[data-testid="new-event-setup-minutes"] input')).toHaveValue("15");
      await expect(page.locator('[data-testid="new-event-teardown-minutes"] input')).toHaveValue("10");
      // A new event, so no Delete button.
      await expect(page.getByTestId("event-delete-button")).toHaveCount(0);

      const saved = page.waitForResponse((res) => res.url().endsWith("/content/events") && res.request().method() === "POST");
      await page.getByTestId("new-event-save-button").click();
      copyId = (await (await saved).json())[0].id;
      expect(copyId).toBeTruthy();
      expect(copyId).not.toBe(eventId);

      const copy = await (await page.request.get(`${API_BASE}/content/events/${copyId}`, auth)).json();
      expect(copy.title).toBe(`${title} (Copy)`);
      expect(copy.groupId).toBe(GROUP_ID);
      expect(copy.visibility).toBe("private");
      expect(copy.recurrenceRule || null).toBeNull();

      const copyBookings: { id: string; roomId?: string; resourceId?: string; quantity?: number; setupMinutes?: number }[] =
        await (await page.request.get(`${API_BASE}/content/eventBookings/event/${copyId}`, auth)).json();
      expect(copyBookings.map((b) => b.roomId).filter(Boolean)).toEqual([ROOM_ID]);
      expect(copyBookings.find((b) => b.resourceId === RESOURCE_ID)?.quantity).toBe(4);
      expect(copyBookings.every((b) => b.setupMinutes === 15)).toBeTruthy();
      expect(copyBookings.some((b) => sourceBookingIds.includes(b.id))).toBeFalsy();

      // The source event keeps its own bookings and repeat.
      const source = await (await page.request.get(`${API_BASE}/content/events/${eventId}`, auth)).json();
      expect(source.recurrenceRule).toContain("FREQ=WEEKLY");
      const sourceBookings: { id: string }[] = await (await page.request.get(`${API_BASE}/content/eventBookings/event/${eventId}`, auth)).json();
      expect(sourceBookings.map((b) => b.id).sort()).toEqual([...sourceBookingIds].sort());
    } finally {
      await page.request.delete(`${API_BASE}/content/curatedEvents/calendar/${calendarId}/group/${GROUP_ID}`, auth);
      if (copyId) await page.request.delete(`${API_BASE}/content/events/${copyId}`, auth);
      if (eventId) await page.request.delete(`${API_BASE}/content/events/${eventId}`, auth);
      await page.request.delete(`${API_BASE}/content/curatedCalendars/${calendarId}`, auth);
    }
  });
});
