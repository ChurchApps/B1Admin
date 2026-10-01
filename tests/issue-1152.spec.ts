import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateToAttendance } from "./helpers/navigation";

// #1152 — Attendance Trend showed a Wednesday 9/30/2026 visit under 9/26/2026.
// The Api returns the week's Sunday (9/27) as a UTC-midnight date; a US browser
// rendered it as the evening before.

const API = process.env.API_BASE || "http://localhost:8084";

test.use({ timezoneId: "America/Chicago", locale: "en-US" });

let api: APIRequestContext;
let auth: { headers: { Authorization: string } };

test.beforeAll(async () => {
  api = await pwRequest.newContext();
  const res = await api.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  auth = { headers: { Authorization: "Bearer " + uc.jwt } };

  // Wednesday Prayer Service session on Wed 9/30/2026 with one visit.
  const sRes = await api.post(`${API}/attendance/sessions`, { ...auth, data: [{ groupId: "GRP00000003", serviceTimeId: "SST00000004", sessionDate: "2026-09-30T19:00:00" }] });
  const session = (await sRes.json())[0];
  await api.post(`${API}/attendance/visitsessions/log`, { ...auth, data: { personId: "PER00000001", visitSessions: [{ sessionId: session.id }] } });
});

test.afterAll(async () => {
  await api?.dispose();
});

test("Attendance Trend labels a Wednesday visit with that week's Sunday", async ({ page }) => {
  await login(page);
  await navigateToAttendance(page);
  await page.locator('button[role="tab"]').getByText("Attendance Trend").click();
  await page.locator("button").getByText("Run Report").click();

  const table = page.locator('[id="reportsBox"] table');
  await expect(table.locator("td").getByText("Sep 27, 2026", { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(table.locator("td").getByText("Sep 26, 2026", { exact: true })).toHaveCount(0);
});
