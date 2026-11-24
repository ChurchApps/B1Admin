import { request, type APIRequestContext } from "@playwright/test";
import { attendanceTest as test, expect } from "./helpers/test-fixtures";

// Two children are checked in to Elementary (3-5) at the 10:30 service today through the Api, the way the kiosk does,
// and one is picked up. From the room on the Attendance page, "Today" lists both with check-in time, and the picked-up
// child also shows check-out time and who picked them up.
const API = process.env.API_BASE || "http://localhost:8084";
const ROOM = { id: "GRP00000010", name: "Elementary (3-5)" };
const SERVICE_TIME_ID = "SST00000002";
const PICKED_UP = { id: "PER00000005", name: "Michael Smith" };
const STILL_HERE = { id: "PER00000009", name: "David Johnson" };
const PICKED_UP_BY = "Mary Smith";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function apiContext() {
  const ctx = await request.newContext();
  const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const jwt = login.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
  return { ctx, headers: { Authorization: "Bearer " + jwt } };
}

async function todaysSession(ctx: APIRequestContext, headers: Record<string, string>) {
  const today = localToday();
  const sessions: { id: string; serviceTimeId?: string; sessionDate: string }[] = await (await ctx.get(`${API}/attendance/sessions?groupId=${ROOM.id}`, { headers })).json();
  const existing = sessions.find((s) => s.serviceTimeId === SERVICE_TIME_ID && String(s.sessionDate).startsWith(today));
  if (existing) return { id: existing.id, created: false };
  const saved = await (await ctx.post(`${API}/attendance/sessions`, { headers, data: [{ groupId: ROOM.id, serviceTimeId: SERVICE_TIME_ID, sessionDate: today }] })).json();
  return { id: saved[0].id as string, created: true };
}

test.describe("Attendance room roster", () => {
  test.describe.configure({ mode: "serial" });
  let sessionId = "";
  let createdSession = false;

  test.beforeAll(async () => {
    const { ctx, headers } = await apiContext();
    const session = await todaysSession(ctx, headers);
    sessionId = session.id;
    createdSession = session.created;
    for (const child of [PICKED_UP, STILL_HERE]) {
      const res = await ctx.post(`${API}/attendance/visitsessions/log`, { headers, data: { checkinTime: new Date(), personId: child.id, visitSessions: [{ sessionId }] } });
      expect(res.ok()).toBe(true);
    }
    const visitSessions: { visitId: string; visit?: { personId?: string } }[] = await (await ctx.get(`${API}/attendance/visitsessions?sessionId=${sessionId}`, { headers })).json();
    const pickedUpVisit = visitSessions.find((vs) => vs.visit?.personId === PICKED_UP.id);
    expect(pickedUpVisit).toBeTruthy();
    const out = await ctx.post(`${API}/attendance/visits/checkout`, { headers, data: { visitIds: [pickedUpVisit!.visitId], checkedOutBy: PICKED_UP_BY } });
    expect(out.ok()).toBe(true);
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const { ctx, headers } = await apiContext();
    for (const child of [PICKED_UP, STILL_HERE]) await ctx.delete(`${API}/attendance/visitsessions?sessionId=${sessionId}&personId=${child.id}`, { headers });
    if (createdSession) await ctx.delete(`${API}/attendance/sessions/${sessionId}`, { headers });
    await ctx.dispose();
  });

  test("a room's Today list shows who is checked in, when, and who picked them up", async ({ page }) => {
    const room = page.getByTestId("attendance-rooms").getByRole("listitem").filter({ hasText: ROOM.name });
    await expect(room).toBeVisible({ timeout: 15000 });
    await room.getByTestId("attendance-room-today").click();

    const dialog = page.getByTestId("room-roster-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: `${ROOM.name} today` })).toBeVisible();
    await expect(dialog.getByTestId("room-roster-table")).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("columnheader", { name: "Checked In", exact: true })).toBeVisible();
    await expect(dialog.getByRole("columnheader", { name: "Checked Out" })).toBeVisible();
    await expect(dialog.getByRole("columnheader", { name: "Picked Up By" })).toBeVisible();

    const pickedUp = dialog.getByTestId("room-roster-row").filter({ hasText: PICKED_UP.name });
    await expect(pickedUp.getByTestId("room-roster-checkinTime")).toHaveText(/\d{1,2}:\d{2}/);
    await expect(pickedUp.getByTestId("room-roster-checkoutTime")).toHaveText(/\d{1,2}:\d{2}/);
    await expect(pickedUp.getByTestId("room-roster-checkedOutBy")).toHaveText(PICKED_UP_BY);

    // Still in the room: checked in, no check-out yet.
    const stillHere = dialog.getByTestId("room-roster-row").filter({ hasText: STILL_HERE.name });
    await expect(stillHere.getByTestId("room-roster-checkinTime")).toHaveText(/\d{1,2}:\d{2}/);
    await expect(stillHere.getByTestId("room-roster-checkoutTime")).toHaveText("—");
    await expect(stillHere.getByTestId("room-roster-checkedOutBy")).toHaveText("—");
    await expect(dialog.getByTestId("room-roster-summary")).toContainText("not picked up yet");

    await dialog.getByTestId("room-roster-close").click();
    await expect(dialog).toBeHidden();
  });
});
