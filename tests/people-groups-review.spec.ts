import { request, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const GRACE_CHURCH_ID = "CHU00000001";

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const suffix = Date.now().toString().slice(-7);
const cleanup: string[] = [];

async function api(method: "get" | "post" | "delete", path: string, data?: unknown) {
  const res = await ctx[method](`${API_BASE}${path}`, { ...auth, ...(data !== undefined ? { data } : {}) });
  expect(res.ok(), `${method.toUpperCase()} ${path} -> ${res.status()}`).toBeTruthy();
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

test.describe.configure({ mode: "serial" });
test.use({ timezoneId: "America/Chicago" });

test.beforeAll(async () => {
  ctx = await request.newContext();
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const grace = body.userChurches.find((uc: { church: { id: string } }) => uc.church.id === GRACE_CHURCH_ID);
  auth = { headers: { Authorization: "Bearer " + grace.jwt } };
});

test.afterAll(async () => {
  for (const path of cleanup.reverse()) {
    await ctx.delete(`${API_BASE}${path}`, auth).catch(() => undefined);
  }
  await ctx.dispose();
});

test("group sessions: All years stays selected and UTC-midnight dates show the stored day", async ({ page }) => {
  const [group] = await api("post", "/membership/groups", [{ name: `Review Sessions ${suffix}`, categoryName: "Test", tags: "standard", trackAttendance: true }]);
  cleanup.push(`/membership/groups/${group.id}`);
  await api("post", "/attendance/sessions", [
    { groupId: group.id, sessionDate: "2025-01-01T00:00:00.000Z" },
    { groupId: group.id, sessionDate: "2026-06-07T00:00:00.000Z" }
  ]);

  await page.goto(`/groups/${group.id}`);
  await page.getByTestId("group-all-sessions").click();
  const yearButtons = page.locator('[data-testid^="year-pill-"]');
  await expect(yearButtons).toHaveCount(3, { timeout: 15000 });
  await expect(yearButtons.getByText("2025", { exact: true })).toBeVisible();

  const allYears = page.getByTestId("year-pill-all");
  await allYears.click();
  await expect(allYears).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(500);
  await expect(allYears).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("06/07/2026", { exact: true })).toBeVisible();
  await expect(page.getByText("01/01/2025", { exact: true })).toBeVisible();
});

test("print directory leaves out deceased people", async ({ page }) => {
  const [member] = await api("post", "/membership/people", [{ name: { first: "Livia", last: `Dirmember${suffix}` }, membershipStatus: "Member", contactInfo: {} }]);
  const [deceased] = await api("post", "/membership/people", [{ name: { first: "Mort", last: `Dirdeceased${suffix}` }, membershipStatus: "Deceased", contactInfo: {} }]);
  cleanup.push(`/membership/people/${member.id}`, `/membership/people/${deceased.id}`);

  await page.goto("/people/print-directory");
  await expect(page.getByText(`Dirmember${suffix}`).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(`Dirdeceased${suffix}`)).toHaveCount(0);
});
