import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1127: when the per-service exclusions lookup (/planItemTimes/plan/:id) fails,
// the print page must still print the service order instead of a blank sheet.
const API = process.env.API_BASE || "http://localhost:8084";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Issue #1127 - Print Plan survives a failed exclusions lookup", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ name: "Print Exclusions Failure Repro", serviceDate: "2030-05-05" }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const itemsRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, sort: 1, itemType: "item", label: "Opening Hymn", description: "Congregation stands", seconds: 240 }]
    });
    expect(itemsRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("prints the service order when /planItemTimes fails", async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
    await page.route("**/doing/planItemTimes/plan/**", (route) => route.fulfill({ status: 500, json: { errors: ["Unknown column 'positionId'"] } }));
    await page.goto(`/serving/plans/print/${planId}`);
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Opening Hymn")).toBeVisible({ timeout: 15000 });
  });
});
