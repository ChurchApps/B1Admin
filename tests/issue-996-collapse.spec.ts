import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #996 (fix 2): "Expand to Actions" permanently rewrote the plan with no way back.
// The plan is seeded through DoingApi and the provider is mocked at the API proxy, since
// no content provider is linked in the local stack.
const API = "http://localhost:8084";

const INSTRUCTIONS = {
  name: "Collapse Repro Lesson",
  items: [
    {
      id: "COLHEAD1",
      itemType: "header",
      relatedId: "COLHEAD1",
      label: "Collapse Repro Header",
      children: [
        {
          id: "COLSEC1",
          itemType: "section",
          relatedId: "COLSEC1",
          label: "Collapse Repro Section",
          content: "Section notes",
          seconds: 300,
          children: [
            { id: "COLACT1", itemType: "action", relatedId: "COLACT1", label: "Collapse Repro Action One", seconds: 120 },
            { id: "COLACT2", itemType: "action", relatedId: "COLACT2", label: "Collapse Repro Action Two", seconds: 180 }
          ]
        }
      ]
    }
  ]
};

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("issue-996 collapse expanded actions back to a section", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [
        {
          name: "Collapse Repro Plan",
          serviceDate: "2030-05-01",
          ministryId: "GRP0000000a",
          planTypeId: "PLT00000001",
          serviceOrder: true,
          contentType: "venue",
          contentId: "COLVENUE1"
        }
      ]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const headerRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, sort: 1, itemType: "header", label: "Collapse Repro Header" }]
    });
    expect(headerRes.ok()).toBeTruthy();
    const headerId = (await headerRes.json())[0].id;

    const sectionRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [
        {
          planId,
          parentId: headerId,
          sort: 1,
          itemType: "providerSection",
          relatedId: "COLSEC1",
          label: "Collapse Repro Section",
          providerId: "lessonschurch",
          providerPath: "COLVENUE1",
          providerContentPath: "0.0"
        }
      ]
    });
    expect(sectionRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("an expanded run offers a visible collapse control that restores the section", async ({ page }) => {
    await page.route("**/providerProxy/getInstructions", (route) => route.fulfill({ json: INSTRUCTIONS }));
    // No provider is linked locally; keep the dialog's direct provider call off the network.
    await page.route("**/lessons.church/**", (route) => route.abort());

    await page.goto(`/serving/plans/${planId}`);
    await page.getByRole("tab", { name: "Service Order" }).click();

    const sectionRow = page.locator(".planItem").filter({ hasText: "Collapse Repro Section" });
    await expect(sectionRow).toHaveCount(1, { timeout: 15000 });
    await sectionRow.click();

    await page.getByRole("button", { name: "Expand to Actions" }).click();

    const actionOne = page.locator(".planItem").filter({ hasText: "Collapse Repro Action One" });
    const actionTwo = page.locator(".planItem").filter({ hasText: "Collapse Repro Action Two" });
    await expect(actionOne).toHaveCount(1, { timeout: 15000 });
    await expect(actionTwo).toHaveCount(1);
    await expect(page.locator(".planItem").filter({ hasText: "Collapse Repro Section" })).toHaveCount(0);

    // The bug: expansion was one-way, with no control anywhere to undo it.
    const collapseButton = actionOne.locator('[data-testid="collapse-to-section-button"]');
    await expect(collapseButton).toBeVisible({ timeout: 10000 });
    await collapseButton.click();

    await page.locator('[data-testid="confirm-collapse-dialog"]').getByRole("button", { name: "Collapse to Section" }).click();

    await expect(page.locator(".planItem").filter({ hasText: "Collapse Repro Section" })).toHaveCount(1, { timeout: 15000 });
    await expect(actionOne).toHaveCount(0);
    await expect(actionTwo).toHaveCount(0);
  });
});
