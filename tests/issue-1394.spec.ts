import { request, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1394: session lists and roll sheets show the service time, unscheduled groups
// appear in Group Attendance, and the Add Service Time box draws one dropdown arrow.
// Nursery (GRP00000007) meets at 9:00 AM and 10:30 AM; Greeters Ministry (GRP00000025) has no service time.
const API = process.env.API_BASE || "http://localhost:8084";
const NURSERY = "GRP00000007";
const GREETERS = "GRP00000025";

async function apiLogin(api: APIRequestContext) {
  const res = await api.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

test.describe("Issue 1394 attendance service times", () => {
  const sessionIds: string[] = [];
  let lateSessionId = "";

  test.beforeAll(async () => {
    const api = await request.newContext();
    const auth = await apiLogin(api);
    // Clear sessions an earlier run left on this date so each run starts from one session per service time.
    for (const groupId of [NURSERY, GREETERS]) {
      const existing = await (await api.get(`${API}/attendance/sessions?groupId=${groupId}`, auth)).json();
      for (const s of existing || []) if (String(s.sessionDate).startsWith("2026-10-11")) await api.delete(`${API}/attendance/sessions/${s.id}`, auth);
    }
    const res = await api.post(`${API}/attendance/sessions`, {
      ...auth,
      data: [
        { groupId: NURSERY, serviceTimeId: "SST00000001", sessionDate: "2026-10-11T09:00:00" },
        { groupId: NURSERY, serviceTimeId: "SST00000002", sessionDate: "2026-10-11T10:30:00" },
        { groupId: GREETERS, sessionDate: "2026-10-11T09:30:00" }
      ]
    });
    const sessions = await res.json();
    sessions.forEach((s: any) => sessionIds.push(s.id));
    lateSessionId = sessions[1].id;
    await api.post(`${API}/attendance/visitsessions/log`, { ...auth, data: { personId: "PER00000029", visitSessions: [{ sessionId: sessions[2].id }] } });
    await api.dispose();
  });

  test.afterAll(async () => {
    const api = await request.newContext();
    const auth = await apiLogin(api);
    for (const id of sessionIds) await api.delete(`${API}/attendance/sessions/${id}`, auth);
    await api.dispose();
  });

  test("Sessions list names the service time of each same-day session", async ({ page }) => {
    await page.goto(`/groups/${NURSERY}?view=sessions`);
    const rows = page.getByRole("listitem").filter({ hasText: "10/11/2026" });
    await expect(rows).toHaveCount(2, { timeout: 15000 });
    await expect(rows.filter({ hasText: "9:00 AM Service" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "10:30 AM Service" })).toHaveCount(1);
  });

  test("roll sheet printed from a session shows that session's service time", async ({ page }) => {
    await page.goto(`/groups/${NURSERY}?view=sessions&sessionId=${lateSessionId}`);
    await page.evaluate(() => {
      window.open = ((url: string) => { (window as any).__rosterUrl = url; return null; }) as any;
    });
    await page.getByTestId("session-print-roster-button").click();
    const url: string = await page.evaluate(() => (window as any).__rosterUrl);
    await page.goto(url.replace("&autoprint=1", ""));
    await expect(page.locator("h1.roster-title")).toHaveText("Nursery (0-2)", { timeout: 15000 });
    await expect(page.locator(".roster-meta")).toContainText("10:30 AM Service");
  });

  test("Group Attendance includes a group with no service time", async ({ page }) => {
    await page.goto("/attendance");
    await page.getByTestId("attendance-verb-years").click();
    // The tab loads the report and auto-runs its default week; fill the dates only after that so they stick.
    const autoRun = page.waitForResponse((r) => r.url().includes("/reports/groupAttendance/run"));
    await page.locator('button[role="tab"]').getByText("Group Attendance", { exact: true }).click();
    await autoRun;
    await page.locator('[name="startDate"]').fill("2026-10-11");
    await page.locator('[name="endDate"]').fill("2026-10-11");
    await expect(page.locator('[name="startDate"]')).toHaveValue("2026-10-11");
    await expect(page.locator('[name="endDate"]')).toHaveValue("2026-10-11");
    await page.locator("button").getByText("Run Report").click();
    const reportsBox = page.locator('[id="reportsBox"]');
    await expect(reportsBox.locator("td").getByText("Greeters Ministry", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(reportsBox.locator("td").getByText("Olivia Davis", { exact: true })).toBeVisible();
  });

  test("Add Service Time select shows one dropdown arrow", async ({ page }) => {
    await page.goto(`/groups/${NURSERY}`);
    await page.getByTestId("edit-group-button").first().click();
    const chooser = page.locator("#groupDetailsBox").locator(".MuiFormControl-root").filter({ has: page.locator('[data-cy="choose-service-time"]') });
    await expect(chooser).toBeVisible({ timeout: 10000 });
    await expect(chooser.locator(".MuiSelect-icon")).toHaveCount(1);
    await expect(chooser.getByText("arrow_drop_down", { exact: true })).toHaveCount(0);
  });
});
