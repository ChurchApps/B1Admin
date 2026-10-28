import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1405: blockout dates are DATE columns sent as UTC midnight, and the Validation card read
// them as instants, so in a US browser a blockout showed a day early and a one-day blockout on the
// service date was never flagged. A plan with nobody assigned also claimed "All volunteers notified."
// Production runs the Api in UTC, so DATE columns arrive as "YYYY-MM-DDT00:00:00.000Z"; a local Api
// in a US timezone sends local midnight instead, so the spec serves the production shape.
const API = process.env.API_BASE || "http://localhost:8084";
const DONALD_CLARK = "PER00000080";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("issue-1405 plan validation blockouts and notified line", () => {
  test.use({ timezoneId: "America/Chicago" });

  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let staffedPlanId: string;
  let emptyPlanId: string;
  let blockoutId: string;

  const createPlan = async (name: string) => {
    const res = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ name, serviceDate: "2030-12-08", ministryId: "GRP0000000a", planTypeId: "PLT00000001", prepared: false }]
    });
    expect(res.ok()).toBeTruthy();
    const planId = (await res.json())[0].id as string;
    const timeRes = await ctx.post(`${API}/doing/times`, {
      ...auth,
      data: [{ planId, displayName: "Issue1405 Service", startTime: "2030-12-08T15:00:00.000Z", endTime: "2030-12-08T16:30:00.000Z", teams: "Issue1405Team" }]
    });
    expect(timeRes.ok()).toBeTruthy();
    const posRes = await ctx.post(`${API}/doing/positions`, {
      ...auth,
      data: [{ planId, categoryName: "Issue1405Team", name: "Issue1405 Usher", count: 1 }]
    });
    expect(posRes.ok()).toBeTruthy();
    return { planId, positionId: (await posRes.json())[0].id as string };
  };

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };

    const staffed = await createPlan("Issue1405 Staffed Plan");
    staffedPlanId = staffed.planId;
    const assignRes = await ctx.post(`${API}/doing/assignments`, {
      ...auth,
      data: [{ positionId: staffed.positionId, personId: DONALD_CLARK, status: "Accepted", notified: "2030-11-01T12:00:00.000Z" }]
    });
    expect(assignRes.ok()).toBeTruthy();
    const blockRes = await ctx.post(`${API}/doing/blockoutDates`, {
      ...auth,
      data: [{ personId: DONALD_CLARK, startDate: "2030-12-08", endDate: "2030-12-08" }]
    });
    expect(blockRes.ok()).toBeTruthy();
    blockoutId = (await blockRes.json())[0].id;

    emptyPlanId = (await createPlan("Issue1405 Empty Plan")).planId;
  });

  test.afterAll(async () => {
    if (blockoutId) await ctx.delete(`${API}/doing/blockoutDates/${blockoutId}`, auth);
    for (const id of [staffedPlanId, emptyPlanId]) if (id) await ctx.delete(`${API}/doing/plans/${id}`, auth);
    await ctx.dispose();
  });

  test("a one-day blockout on the service date is flagged with the date the volunteer entered", async ({ page }) => {
    await page.route("**/doing/blockoutDates/upcoming", async (route) => {
      const res = await route.fetch();
      const body = ((await res.json()) as any[]).map((b) => (b.id === blockoutId ? { ...b, startDate: "2030-12-08T00:00:00.000Z", endDate: "2030-12-08T00:00:00.000Z" } : b));
      await route.fulfill({ response: res, json: body });
    });
    await page.goto(`/serving/plans/${staffedPlanId}`);
    await expect(page.getByText("Issue1405 Usher").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Blockout date conflict of Dec 8, 2030 to Dec 8, 2030/)).toBeVisible({ timeout: 10000 });
  });

  test("a plan with nobody assigned does not say all volunteers were notified", async ({ page }) => {
    await page.goto(`/serving/plans/${emptyPlanId}`);
    await expect(page.getByText(/1 more person needed/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("All volunteers notified.")).toHaveCount(0);
  });
});
