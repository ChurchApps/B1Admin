import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #988: order-of-service items can reference one of the plan's positions so the
// assigned volunteer's name shows beside the item on screen and in the printout.
const API = "http://localhost:8084";
const PERSON_ID = "PER00000001";
const PERSON_NAME = "John Smith";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Serving - plan item positions", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ name: "Issue988 Position Repro", serviceDate: "2030-06-01", serviceOrder: true, showVolunteerNames: true }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const posRes = await ctx.post(`${API}/doing/positions`, {
      ...auth,
      data: [{ planId, categoryName: "Issue988 Team", name: "Issue988 Speaker", count: 1 }]
    });
    expect(posRes.ok()).toBeTruthy();
    const positionId = (await posRes.json())[0].id;

    const assignRes = await ctx.post(`${API}/doing/assignments`, {
      ...auth,
      data: [{ positionId, personId: PERSON_ID, status: "Accepted" }]
    });
    expect(assignRes.ok()).toBeTruthy();

    const headerRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, sort: 1, itemType: "header", label: "Issue988 Section" }]
    });
    expect(headerRes.ok()).toBeTruthy();
    const headerId = (await headerRes.json())[0].id;

    const itemRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, parentId: headerId, sort: 1, itemType: "item", label: "Issue988 Sermon", seconds: 600 }]
    });
    expect(itemRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("assigning a position shows the volunteer beside the item and in print", async ({ page }) => {
    await page.goto(`/serving/plans/${planId}`);
    await page.getByRole("tab", { name: "Service Order" }).click({ timeout: 20000 });
    await expect(page.getByText("Issue988 Sermon")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Edit Item" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("plan-item-position-select").click();
    await page.getByRole("option", { name: "Issue988 Team - Issue988 Speaker" }).click();
    await dialog.getByRole("button", { name: "Save" }).click();

    const row = page.locator(".planItem").filter({ hasText: "Issue988 Sermon" }).first();
    await expect(row.locator(".planItemPosition")).toHaveText(PERSON_NAME, { timeout: 15000 });

    await page.goto(`/serving/plans/print/${planId}`);
    await expect(page.getByText("Issue988 Sermon")).toBeVisible({ timeout: 20000 });
    await expect(page.locator("td").filter({ hasText: "Issue988 Sermon" }).first()).toContainText(PERSON_NAME);
  });
});
