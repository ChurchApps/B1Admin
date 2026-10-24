import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// #1343: on a curated calendar, the button on an event that comes from a whole group said "Delete"
// and asked "delete this event?", but it removes the whole group (every one of its events) from the calendar.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CALENDAR_NAME = "Zacchaeus 1343 Calendar";
const EVENT_TITLE = "Zacchaeus 1343 Group Event";
const GROUP_ID = "GRP00000004";

const adminAuth = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
  return { headers: { Authorization: "Bearer " + jwt } };
};

let calendarId = "";
let eventId = "";

test.beforeAll(async () => {
  const ctx = await request.newContext();
  const auth = await adminAuth(ctx);
  const cals = await (await ctx.post(`${API_BASE}/content/curatedCalendars`, { ...auth, data: [{ name: CALENDAR_NAME }] })).json();
  calendarId = cals[0].id;
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setHours(13, 0, 0, 0);
  const events = await (await ctx.post(`${API_BASE}/content/events`, {
    ...auth,
    data: [{ groupId: GROUP_ID, title: EVENT_TITLE, start, end, allDay: false, visibility: "public" }]
  })).json();
  eventId = events[0].id;
  await ctx.post(`${API_BASE}/content/curatedEvents`, { ...auth, data: [{ curatedCalendarId: calendarId, groupId: GROUP_ID }] });
  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await request.newContext();
  const auth = await adminAuth(ctx);
  if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth);
  if (calendarId) await ctx.delete(`${API_BASE}/content/curatedCalendars/${calendarId}`, auth);
  await ctx.dispose();
});

test("removing a group-sourced event says it takes the whole group off the calendar", async ({ page }) => {
  await page.goto(`/calendars/${calendarId}`);
  await page.getByText(EVENT_TITLE).first().click();

  const removeButton = page.getByTestId("calendar-event-delete-button");
  await expect(removeButton).toHaveText("Remove from Calendar", { timeout: 15000 });
  await removeButton.click();

  const confirmDialog = page.locator('div[role="dialog"]').last();
  await expect(confirmDialog).toContainText("removes all of that group's events from this calendar");
  await confirmDialog.getByRole("button", { name: "Cancel" }).click();
});
