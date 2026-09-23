import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Opening a service time used to shift it by the UTC offset, so every save moved the time again.
test.describe.serial("Service time edit keeps the stored time", () => {
  test.describe.configure({ retries: 0 });

  const API = process.env.API_BASE || "http://localhost:8084";
  const start = new Date(2030, 5, 2, 10, 30);
  const end = new Date(2030, 5, 2, 11, 45);
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let planId: string;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001");
    expect(uc?.jwt).toBeTruthy();
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ name: "Time Edit Repro Plan", serviceDate: "2030-06-02", ministryId: "GRP0000000a", planTypeId: "PLT00000001", serviceOrder: true }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const timeRes = await ctx.post(`${API}/doing/times`, {
      ...auth,
      data: [{ planId, displayName: "Time Edit Service", startTime: start.toISOString(), endTime: end.toISOString(), teams: "", serviceTimeType: "service" }]
    });
    expect(timeRes.ok()).toBeTruthy();

    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, auth);
    await ctx.dispose();
  });

  test("editor shows the saved time and saving unchanged keeps it", async () => {
    await page.goto(`/serving/plans/${planId}`);
    const timeLink = page.locator("td button").getByText("Time Edit Service");
    await expect(timeLink).toBeVisible({ timeout: 15000 });
    await timeLink.click();

    await expect(page.locator("input#startTime")).toHaveValue(/10:30/, { timeout: 10000 });
    await expect(page.locator("input#endTime")).toHaveValue(/11:45/);

    const saved = page.waitForResponse((r) => r.url().includes("/doing/times") && r.request().method() === "POST", { timeout: 15000 });
    await page.getByRole("button", { name: "Save" }).click();
    await saved;

    const timesRes = await ctx.get(`${API}/doing/times/plan/${planId}`, auth);
    const times = await timesRes.json();
    expect(new Date(times[0].startTime).getTime()).toBe(start.getTime());
    expect(new Date(times[0].endTime).getTime()).toBe(end.getTime());
  });
});
