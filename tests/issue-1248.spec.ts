import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue 1248: a gift to a non-tax-deductible fund (e.g. a test fund used for a test batch)
// never showed on the person's Donations card. GET /donations?personId= drops gifts whose
// fund is not tax-deductible, a filter meant only for giving statements.
const API = process.env.API_BASE || "http://localhost:8084";
const DONOR_ID = "PER00000080"; // Donald Clark
const FUND_NAME = "Issue 1248 Test Fund";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

const auth = (jwt: string) => ({ headers: { Authorization: "Bearer " + jwt } });

test.describe("Issue 1248 - non-deductible gifts missing from the person record", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let fundId: string;
  let donationId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);

    const fundRes = await ctx.post(`${API}/giving/funds`, { ...auth(jwt), data: [{ name: FUND_NAME, taxDeductible: false }] });
    expect(fundRes.status()).toBe(200);
    fundId = (await fundRes.json())[0].id;

    const batches = await (await ctx.get(`${API}/giving/donationbatches`, auth(jwt))).json();
    expect(batches.length).toBeGreaterThan(0);

    const donationRes = await ctx.post(`${API}/giving/donations`, {
      ...auth(jwt),
      data: [{ batchId: batches[0].id, personId: DONOR_ID, donationDate: new Date().toISOString(), amount: 2, currency: "usd", method: "Check", methodDetails: "1248" }]
    });
    expect(donationRes.status()).toBe(200);
    donationId = (await donationRes.json())[0].id;

    const fdRes = await ctx.post(`${API}/giving/funddonations`, { ...auth(jwt), data: [{ donationId, fundId, amount: 2 }] });
    expect(fdRes.status()).toBe(200);
  });

  test.afterAll(async () => {
    if (donationId) await ctx.delete(`${API}/giving/donations/${donationId}`, auth(jwt));
    if (fundId) await ctx.delete(`${API}/giving/funds/${fundId}`, auth(jwt));
    await ctx.dispose();
  });

  test("the person's Donations card lists the gift to a non-deductible fund", async ({ page }) => {
    await page.goto(`/people/${DONOR_ID}`);
    const card = page.locator('[data-testid="person-giving-section"]');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.getByText(FUND_NAME)).toBeVisible({ timeout: 15000 });
  });
});
