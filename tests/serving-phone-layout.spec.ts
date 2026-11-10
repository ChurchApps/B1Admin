import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Serving pages at phone width must not scroll sideways: rows of pills scroll inside their own
// box, and the order of service lets its labels wrap instead of pushing the durations off screen.
const API = process.env.API_BASE || "http://localhost:8084";

const pageScrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test.describe("Serving at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  const ministryIds: string[] = [];

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const body = await res.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    // Enough ministry tabs to overflow a phone row.
    const created = await ctx.post(`${API}/membership/groups`, {
      ...auth,
      data: ["Phone Layout Alpha Ministry", "Phone Layout Bravo Ministry", "Phone Layout Charlie Ministry"].map((name) => ({ name, categoryName: "Ministry", tags: "ministry" }))
    });
    expect(created.ok()).toBeTruthy();
    ministryIds.push(...(await created.json()).map((g: any) => g.id));
  });

  test.afterAll(async () => {
    for (const id of ministryIds) await ctx.delete(`${API}/membership/groups/${id}`, auth);
    await ctx.dispose();
  });

  test("the ministry tabs on Serving scroll inside their row", async ({ page }) => {
    await page.goto("/serving/plans");
    await page.getByTestId("ministries-all-pill").click();
    await expect(page.getByRole("tab", { name: "Phone Layout Charlie Ministry" })).toBeAttached({ timeout: 15000 });
    expect(await pageScrollWidth(page)).toBeLessThanOrEqual(390);
  });

  test("the task tabs on My Work scroll inside their row", async ({ page }) => {
    await page.goto("/serving/tasks");
    await expect(page.getByTestId("tasklist-tab-created")).toBeAttached({ timeout: 15000 });
    expect(await pageScrollWidth(page)).toBeLessThanOrEqual(390);
  });

  test("the order of service fits the screen", async ({ page }) => {
    await page.goto("/serving/plans/PLA00000001/order");
    await expect(page.getByText("Countdown Video").first()).toBeVisible({ timeout: 15000 });
    expect(await pageScrollWidth(page)).toBeLessThanOrEqual(390);
  });
});
