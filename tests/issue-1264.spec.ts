import { request, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1264: the full donation editor had no In-Kind method, so an in-kind gift opened there lost its method.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const BATCH_NAME = "Zacchaeus In-Kind Batch";

async function apiAuth(ctx: APIRequestContext) {
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

let batchId: string;
let donationId: string;

test.beforeAll(async () => {
  const ctx = await request.newContext();
  const auth = await apiAuth(ctx);
  const batchRes = await ctx.post(`${API_BASE}/giving/donationbatches`, { ...auth, data: [{ name: BATCH_NAME, batchDate: "2025-11-03" }] });
  batchId = (await batchRes.json())[0].id;
  const donationRes = await ctx.post(`${API_BASE}/giving/donations`, {
    ...auth,
    data: [{ batchId, donationDate: "2025-11-03", amount: 5000, method: "In-Kind", methodDetails: "2014 Honda Civic", status: "complete" }]
  });
  donationId = (await donationRes.json())[0].id;
  await ctx.dispose();
});

test.afterAll(async () => {
  if (!batchId) return;
  const ctx = await request.newContext();
  const auth = await apiAuth(ctx);
  await ctx.delete(`${API_BASE}/giving/donationbatches/${batchId}`, auth);
  await ctx.dispose();
});

test("full donation editor keeps an in-kind gift's method and labels its detail as Item", async ({ page }) => {
  await page.goto(`/donations/batches/${batchId}`);
  await page.getByTestId("donation-row-" + donationId).getByRole("button", { name: "Edit" }).click();

  const box = page.locator("#donationBox");
  await expect(box.getByTestId("payment-method-select")).toContainText("In-Kind", { timeout: 10000 });
  await expect(box.getByLabel("Item")).toHaveValue("2014 Honda Civic");
});
