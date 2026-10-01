import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateToAttendance } from "./helpers/navigation";

// #1153 — Group Attendance repeated each group heading with members scattered
// under it when one service time had several groups.

const API = process.env.API_BASE || "http://localhost:8084";
const WEEK = "2026-09-27";

let api: APIRequestContext;
let auth: { headers: { Authorization: string } };

test.beforeAll(async () => {
  api = await pwRequest.newContext();
  const res = await api.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  auth = { headers: { Authorization: "Bearer " + uc.jwt } };

  // Two classes in the 9:00 AM service time, attendance taken alternately.
  const sRes = await api.post(`${API}/attendance/sessions`, {
    ...auth,
    data: [
      { groupId: "GRP00000004", serviceTimeId: "SST00000001", sessionDate: `${WEEK}T09:00:00` },
      { groupId: "GRP00000005", serviceTimeId: "SST00000001", sessionDate: `${WEEK}T09:00:00` }
    ]
  });
  const sessions = await sRes.json();
  for (let i = 1; i <= 12; i++) {
    const personId = "PER" + i.toString().padStart(8, "0");
    await api.post(`${API}/attendance/visitsessions/log`, { ...auth, data: { personId, visitSessions: [{ sessionId: sessions[i % 2].id }] } });
  }
});

test.afterAll(async () => {
  await api?.dispose();
});

test("Group Attendance lists each group once with members in name order", async ({ page }) => {
  await login(page);
  await navigateToAttendance(page);
  await page.locator('button[role="tab"]').getByText("Group Attendance").click();
  await page.locator('[id="mui-component-select-campusId"]').click();
  await page.locator("li").getByText("Main Campus").click();
  await page.locator('[id="mui-component-select-serviceId"]').click();
  await page.locator("li").getByText("Sunday Morning Service").click();
  await page.locator('[name="week"]').fill(WEEK);
  await page.locator("button").getByText("Run Report").click();

  const report = page.locator('[id="reportsBox"] table');
  await expect(report.locator("td.heading2").first()).toBeVisible({ timeout: 10000 });
  await expect(report.locator("td.heading2", { hasText: "Adult Bible Class" })).toHaveCount(1);
  await expect(report.locator("td.heading2", { hasText: "Young Adults Class" })).toHaveCount(1);

  const rows = await report.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => ({ heading: !!tr.querySelector("td[class*='heading']"), text: tr.textContent?.trim() || "" })));
  const groups: string[][] = [];
  rows.forEach((r) => {
    if (r.heading) groups.push([]);
    else groups[groups.length - 1]?.push(r.text);
  });
  groups.forEach((names) => expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b))));
});
