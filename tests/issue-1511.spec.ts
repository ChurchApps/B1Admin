import { type APIRequestContext, request } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";

// Issue #1511: a long donation note shows in full on the batch page instead of being cut off with an ellipsis.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const BATCH_NAME = "Habakkuk Long Notes Batch";
const LONG_NOTE = "Envelope #42 for the building fund pledge campaign, given in memory of Donald Clark by the whole family at the fall dinner";

async function apiAuth(ctx: APIRequestContext) {
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

test.describe("Batch donations list — long notes", () => {
  test.describe.configure({ retries: 0 });
  let batchId: string;

  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const batchRes = await ctx.post(`${API_BASE}/giving/donationbatches`, { ...(await apiAuth(ctx)), data: [{ name: BATCH_NAME, batchDate: "2025-11-01" }] });
    batchId = (await batchRes.json())[0].id;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    if (!batchId) return;
    const ctx = await request.newContext();
    await ctx.delete(`${API_BASE}/giving/donationbatches/${batchId}`, await apiAuth(ctx));
    await ctx.dispose();
  });

  test("the whole note is visible in the batch list, not clipped", async ({ page }) => {
    await page.goto(`/donations/batches/${batchId}`);
    const anon = page.locator("button").getByText("Anonymous");
    await expect(anon).toBeVisible({ timeout: 10000 });
    await anon.click();
    await page.locator('[data-testid="bulk-donation-notes"] input').fill(LONG_NOTE);
    await page.locator('[data-testid="bulk-donation-amount"] input').fill("15.00");
    await page.locator('[data-testid="add-donation-submit"]').click();

    const note = page.locator("table td").getByText(LONG_NOTE);
    await expect(note).toBeVisible({ timeout: 10000 });
    const clipped = await note.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(clipped).toBe(false);
  });
});
