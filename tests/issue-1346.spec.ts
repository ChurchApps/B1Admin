import { type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1346: importing an .ics from a calendar's page saved the events to the chosen group
// but never added that group to the calendar, so the calendar stayed blank.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000004"; // Adult Bible Class

const pad = (n: number) => String(n).padStart(2, "0");

function buildIcs(title: string) {
  const d = new Date();
  d.setDate(15);
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Issue 1346//EN",
    "BEGIN:VEVENT",
    "UID:issue-1346@test",
    `DTSTART:${day}T150000Z`,
    `DTEND:${day}T160000Z`,
    `SUMMARY:${title}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

async function apiLogin(api: APIRequestContext) {
  const res = await api.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

test("imported .ics events show on the calendar they were imported from", async ({ page }) => {
  const title = "Zacchaeus Imported Picnic";
  const auth = await apiLogin(page.request);
  const calRes = await page.request.post(`${API_BASE}/content/curatedCalendars`, { ...auth, data: [{ name: "Zacchaeus Import Calendar" }] });
  expect(calRes.ok()).toBeTruthy();
  const calendarId: string = (await calRes.json())[0].id;
  const importedIds: string[] = [];
  try {
    await page.goto(`/calendars/${calendarId}`);
    await expect(page.locator("#page-header-title")).toHaveText("Zacchaeus Import Calendar", { timeout: 15000 });

    await page.getByTestId("import-ics-button").click();
    await page.getByTestId("import-ics-group-select").click();
    await page.getByRole("option", { name: "Adult Bible Class" }).click();
    await page.getByTestId("import-ics-text-input").locator("textarea").first().fill(buildIcs(title));
    const imported = page.waitForResponse((r) => r.url().includes("/events/ical") && r.request().method() === "POST");
    await page.getByTestId("import-ics-submit").click();
    importedIds.push(...((await (await imported).json()) as { id: string }[]).map((e) => e.id));
    await expect(page.getByTestId("import-ics-success")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("import-ics-close-button").click();

    await expect(page.getByTestId("calendar-identity").getByText("Adult Bible Class", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("calendar-record").getByText(title).first()).toBeVisible({ timeout: 15000 });
  } finally {
    // Deleting the calendar does not delete its curated rows, so remove the group first.
    await page.request.delete(`${API_BASE}/content/curatedEvents/calendar/${calendarId}/group/${GROUP_ID}`, auth);
    await page.request.delete(`${API_BASE}/content/curatedCalendars/${calendarId}`, auth);
    for (const id of importedIds) await page.request.delete(`${API_BASE}/content/events/${id}`, auth);
  }
});
