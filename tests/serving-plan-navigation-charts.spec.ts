import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Plan page: previous/next arrows step through plans of the same plan type by service date.
// Print page: the remembered "Include chord charts" checkbox appends each song's chart in the
// plan's key. Demo song "It Is Well With My Soul" Traditional arrangement (ARR00000014) is in Eb.
const API = process.env.API_BASE || "http://localhost:8084";
const PLAN_TYPE_ID = "PLT00000001";
const TRADITIONAL_ID = "ARR00000014";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Serving - plan navigation and chord chart print", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  const planIds: string[] = [];
  let keyId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };
    const planType = await (await ctx.get(`${API}/doing/planTypes/${PLAN_TYPE_ID}`, auth)).json();
    // Created out of date order so the arrows must sort by service date.
    for (const [name, serviceDate] of [["E2E Nav Third", "2032-01-18"], ["E2E Nav First", "2032-01-04"], ["E2E Nav Second", "2032-01-11"]]) {
      const res = await ctx.post(`${API}/doing/plans`, { ...auth, data: [{ name, serviceDate, planTypeId: PLAN_TYPE_ID, ministryId: planType.ministryId, serviceOrder: true }] });
      planIds.push((await res.json())[0].id);
    }
    // A key of the Eb arrangement set to F, so the printed chart moves up a whole step.
    const keyRes = await ctx.post(`${API}/content/arrangementKeys`, { ...auth, data: [{ arrangementId: TRADITIONAL_ID, keySignature: "F", shortDescription: "E2E Print F" }] });
    keyId = (await keyRes.json())[0].id;
    await ctx.post(`${API}/doing/planItems`, { ...auth, data: [{ planId: planIds[2], sort: 1, itemType: "arrangementKey", relatedId: keyId, label: "It Is Well With My Soul" }] });
  });

  test.afterAll(async () => {
    for (const id of planIds) await ctx.delete(`${API}/doing/plans/${id}`, auth);
    if (keyId) await ctx.delete(`${API}/content/arrangementKeys/${keyId}`, auth);
    await ctx.dispose();
  });

  test("previous and next arrows step through the plan type by service date", async ({ page }) => {
    const [third, first, second] = planIds;
    await page.goto(`/serving/plans/${second}`);
    await expect(page.locator("#page-header-title")).toHaveText("E2E Nav Second", { timeout: 20000 });
    await page.getByTestId("plan-next-button").click();
    await expect(page).toHaveURL(new RegExp(`/serving/plans/${third}$`));
    await expect(page.locator("#page-header-title")).toHaveText("E2E Nav Third");
    await page.getByTestId("plan-previous-button").click();
    await page.getByTestId("plan-previous-button").click();
    await expect(page).toHaveURL(new RegExp(`/serving/plans/${first}$`));
    await expect(page.locator("#page-header-title")).toHaveText("E2E Nav First");
  });

  test("Include chord charts prints the song's chart in the plan's key and is remembered", async ({ page }) => {
    const planWithSong = planIds[2];
    await page.goto(`/serving/plans/print/${planWithSong}`);
    await expect(page.getByTestId("print-plan-chord-chart")).toHaveCount(0);
    await page.getByTestId("print-plan-include-charts").check();
    const chart = page.getByTestId("print-plan-chord-chart");
    await expect(chart).toHaveCount(1, { timeout: 20000 });
    await expect(chart).toContainText("It Is Well With My Soul");
    await expect(chart).toContainText("F");

    await page.reload();
    await expect(page.getByTestId("print-plan-include-charts")).toBeChecked();
    await expect(page.getByTestId("print-plan-chord-chart")).toHaveCount(1, { timeout: 20000 });
  });
});
