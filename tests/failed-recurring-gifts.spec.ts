import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Failed recurring gifts dashboard. The failed donation is seeded through the Api (the gateway
// webhook that normally creates it can't be fired locally) and verified through B1Admin.
const API = "http://localhost:8084";
const DONOR_ID = "PER00000080"; // Donald Clark
const DONOR_NAME = "Donald Clark";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

const auth = (jwt: string) => ({ headers: { Authorization: "Bearer " + jwt } });

test.describe.configure({ mode: "serial" });

test.describe("Failed recurring gifts", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let donationId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);

    const batches = await (await ctx.get(`${API}/giving/donationbatches`, auth(jwt))).json();
    expect(batches.length).toBeGreaterThan(0);

    const res = await ctx.post(`${API}/giving/donations`, {
      ...auth(jwt),
      data: [
        {
          batchId: batches[0].id,
          personId: DONOR_ID,
          donationDate: new Date().toISOString(),
          amount: 142.5,
          currency: "usd",
          method: "Credit Card",
          methodDetails: "4242",
          status: "failed",
          transactionId: "in_playwright_" + Date.now()
        }
      ]
    });
    expect(res.status()).toBe(200);
    donationId = (await res.json())[0].id;
  });

  test.afterAll(async () => {
    if (donationId) await ctx.delete(`${API}/giving/donations/${donationId}`, auth(jwt));
    await ctx.dispose();
  });

  test("lists the failed gift and offers a retry", async ({ page }) => {
    await page.goto("/donations/failed");
    await expect(page.locator("#page-header-title")).toContainText("Failed Recurring Gifts", { timeout: 15000 });

    const row = page.locator(`[data-testid="failed-donation-${donationId}"]`);
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText(DONOR_NAME);
    await expect(row).toContainText("142.50");

    // Grace runs a Stripe gateway, which is the provider that implements retry.
    await expect(row.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("is reachable from the donations menu", async ({ page }) => {
    await page.goto("/donations");
    await page.locator('[id="secondaryMenu"]').getByText("Failed Gifts").click();
    await expect(page).toHaveURL(/\/donations\/failed/);
  });
});
