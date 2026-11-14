import { request } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";
import { siblingNav } from "./helpers/navigation";

// Keying gifts into a past-dated batch: new gifts start on the batch date, and a date
// changed for one gift carries to the next one, including into the full editor.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const BATCH_NAME = "Entry Date Batch";
const BATCH_DATE = "2025-03-09";
const CHANGED_DATE = "2025-03-02";

const adminAuth = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
  return { headers: { Authorization: "Bearer " + jwt } };
};

let batchId = "";

test.describe.serial("Batch donation entry date", () => {
  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API_BASE}/giving/donationbatches`, { ...(await adminAuth(ctx)), data: [{ name: BATCH_NAME, batchDate: BATCH_DATE }] });
    batchId = (await res.json())[0].id;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    if (!batchId) return;
    const ctx = await request.newContext();
    await ctx.delete(`${API_BASE}/giving/donationbatches/${batchId}`, await adminAuth(ctx));
    await ctx.dispose();
  });

  // Keying one batch after another: the fund list is already cached when the next batch opens.
  const openBatch = async (page: import("@playwright/test").Page) => {
    await (await siblingNav(page)).getByText("Batches").click();
    await page.getByRole("link", { name: "May 25, 2025 Batch", exact: true }).click();
    await expect(page.getByTestId("bulk-donation-anonymous")).toBeVisible({ timeout: 10000 });
    await page.locator("#page-header-breadcrumbs").getByRole("button", { name: "Batches" }).click();
    await expect(page).toHaveURL(/\/donations\/batches$/);
    await page.getByRole("link", { name: BATCH_NAME, exact: true }).click();
    await expect(page).toHaveURL(/\/donations\/batches\//);
    const anon = page.getByTestId("bulk-donation-anonymous");
    await expect(anon).toBeVisible({ timeout: 10000 });
    await anon.click();
  };

  test("quick entry starts on the batch date when opened from the Batches list", async ({ page }) => {
    await openBatch(page);
    await expect(page.locator('[data-testid="bulk-donation-date"] input')).toHaveValue(BATCH_DATE, { timeout: 10000 });
  });

  test("a changed entry date carries to the next gift and the full editor", async ({ page }) => {
    await openBatch(page);
    const date = page.locator('[data-testid="bulk-donation-date"] input');
    await date.fill(CHANGED_DATE);
    await page.locator('[data-testid="bulk-donation-amount"] input').fill("10.00");
    await page.getByTestId("add-donation-submit").click();
    await expect(page.locator("table td").getByText("Mar 2, 2025")).toHaveCount(1, { timeout: 10000 });

    await page.getByTestId("bulk-donation-anonymous").click();
    await expect(date).toHaveValue(CHANGED_DATE);

    await page.getByTestId("bulk-donation-full-editor").click();
    await expect(page.locator('[data-testid="donation-date-input"] input')).toHaveValue(CHANGED_DATE, { timeout: 10000 });
  });
});
