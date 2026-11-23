import fs from "fs";
import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Export on the Availability page downloads the bookings in view: the visible date range and the
// room/resource filter. Bookings are mocked relative to today so the month in view is predictable.
test.use({ timezoneId: "UTC" });

const now = new Date();
const thisMonth = (day: number, hour: number, minute = 0) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, minute));
const nextMonth = (day: number, hour: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day, hour));

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
// The B1 date format (DateHelper.prettyDateTime, en-US), read in UTC like the browser above.
const pretty = (d: Date) => {
  const h = d.getUTCHours() % 12 || 12;
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${h}:${d.getUTCMinutes().toString().padStart(2, "0")} ${d.getUTCHours() < 12 ? "AM" : "PM"}`;
};

const roomBooking = {
  id: "EBX1",
  eventId: "EVX1",
  roomId: "RMX1",
  status: "approved",
  setupMinutes: 30,
  teardownMinutes: 15,
  requestedBy: "PERX1",
  eventTitle: "Export Test Rehearsal",
  roomName: "Export Test Hall",
  eventStart: thisMonth(15, 14).toISOString(),
  eventEnd: thisMonth(15, 16).toISOString()
};
const resourceBooking = {
  id: "EBX2",
  eventId: "EVX2",
  resourceId: "RSX1",
  quantity: 3,
  status: "pending",
  setupMinutes: 0,
  teardownMinutes: 0,
  requestedBy: "PERX2",
  eventTitle: "Export Test Picnic",
  resourceName: "Export Test Tables",
  eventStart: thisMonth(16, 18).toISOString(),
  eventEnd: thisMonth(16, 20).toISOString()
};
const nextMonthBooking = {
  id: "EBX3",
  eventId: "EVX3",
  roomId: "RMX1",
  status: "approved",
  setupMinutes: 0,
  teardownMinutes: 0,
  requestedBy: "PERX1",
  eventTitle: "Export Test Next Month",
  roomName: "Export Test Hall",
  eventStart: nextMonth(15, 14).toISOString(),
  eventEnd: nextMonth(15, 15).toISOString()
};

async function mockBookings(page: Page) {
  await page.route(/\/content\/eventBookings\/calendar/, (route) => {
    const filtered = new URL(route.request().url()).searchParams.has("roomId");
    route.fulfill({ json: filtered ? [roomBooking, nextMonthBooking] : [roomBooking, resourceBooking, nextMonthBooking] });
  });
  await page.route(/\/membership\/people\/ids/, (route) => route.fulfill({ json: [{ id: "PERX1", name: { display: "Pat Requester" } }, { id: "PERX2", name: { display: "Sam Requester" } }] }));
}

async function exportCsv(page: Page) {
  const download = page.waitForEvent("download", { timeout: 15000 });
  await page.getByTestId("availability-export").getByRole("button", { name: /Export/ }).click();
  const file = await (await download).path();
  // react-csv quotes every field, so each record is one line.
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
}

test.describe("Availability export", () => {
  test("downloads the bookings in the visible month with every column", async ({ page }) => {
    await mockBookings(page);
    await page.goto("/calendars/availability");
    await expect(page.locator(".rbc-event", { hasText: "Export Test Rehearsal" })).toBeVisible({ timeout: 15000 });

    const [header, ...rows] = await exportCsv(page);
    expect(header).toBe("\"Event\",\"Room / Resource\",\"Quantity\",\"Start\",\"End\",\"Setup (min)\",\"Teardown (min)\",\"Status\",\"Requested by\"");
    expect(rows).toEqual([
      `"Export Test Rehearsal","Export Test Hall","","${pretty(thisMonth(15, 14))}","${pretty(thisMonth(15, 16))}","30","15","Approved","Pat Requester"`,
      `"Export Test Picnic","Export Test Tables","3","${pretty(thisMonth(16, 18))}","${pretty(thisMonth(16, 20))}","0","0","Pending","Sam Requester"`
    ]);
  });

  test("follows the calendar to the next month", async ({ page }) => {
    await mockBookings(page);
    await page.goto("/calendars/availability");
    await expect(page.locator(".rbc-event", { hasText: "Export Test Rehearsal" })).toBeVisible({ timeout: 15000 });
    await page.locator(".rbc-toolbar").getByRole("button", { name: "Next" }).click();
    await expect(page.locator(".rbc-event", { hasText: "Export Test Next Month" })).toBeVisible();

    const [, ...rows] = await exportCsv(page);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("\"Export Test Next Month\"");
  });

  test("applies the room/resource filter", async ({ page }) => {
    await mockBookings(page);
    await page.goto("/calendars/availability");
    await expect(page.locator(".rbc-event", { hasText: "Export Test Picnic" })).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="availability-filter"] [role="combobox"]').click();
    await page.getByRole("option", { name: "Sanctuary" }).click();
    await expect(page.locator(".rbc-event", { hasText: "Export Test Picnic" })).toHaveCount(0, { timeout: 15000 });

    const [, ...rows] = await exportCsv(page);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("\"Export Test Rehearsal\"");
  });
});
