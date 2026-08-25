import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issues #996 / #1009: "Expand to Actions" nests the actions under the section (a folder) instead of
// replacing it, so collapsing is a view toggle and per-action edits survive. The plan is seeded
// through DoingApi and the provider is mocked at the API proxy, since no content provider is linked
// in the local stack.
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
            { id: "COLACT1", itemType: "action", actionType: "say", relatedId: "COLACT1", label: "Collapse Repro Action One", content: "Original line", seconds: 120 },
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

test.describe("issue-996 / #1009 expanded sections are collapsible folders", () => {
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
          seconds: 300,
          providerId: "lessonschurch",
          providerPath: "COLVENUE1",
          providerContentPath: "0.0"
        },
        { planId, parentId: headerId, sort: 2, itemType: "item", label: "Collapse Repro After", seconds: 60 }
      ]
    });
    expect(sectionRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("expand keeps the section as a folder; collapse hides actions without losing edits", async ({ page }) => {
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
    await expect(sectionRow).toHaveCount(1);

    // Folder time is the sum of its children (300), not double-counted: the next item starts at 5:00.
    const afterRow = page.locator(".planItem").filter({ hasText: "Collapse Repro After" });
    await expect(afterRow.locator(".timeRailLabel")).toHaveText("5:00");

    // Already a folder: the dialog no longer offers to expand again.
    await sectionRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Expand to Actions" })).toHaveCount(0);
    await page.getByRole("button", { name: "Close" }).click();

    // Edit an action inline, then collapse and re-expand the folder.
    await actionOne.getByTestId("planItem-inline-text").click();
    await actionOne.getByTestId("planItem-inline-text").locator("textarea").first().fill("Edited line");
    await actionOne.getByTestId("planItem-inline-text").locator("textarea").first().press("Enter");
    await expect(actionOne).toContainText("Edited line", { timeout: 10000 });

    const toggle = sectionRow.getByTestId("folder-toggle-button");
    await toggle.click();
    await expect(actionOne).toHaveCount(0);
    await expect(actionTwo).toHaveCount(0);
    await expect(sectionRow).toHaveCount(1);

    await toggle.click();
    await expect(actionOne).toHaveCount(1);
    await expect(actionOne).toContainText("Edited line");

    // Survives a reload: nothing was deleted or recreated.
    await page.reload();
    await page.getByRole("tab", { name: "Service Order" }).click();
    await expect(page.locator(".planItem").filter({ hasText: "Collapse Repro Action One" })).toContainText("Edited line", { timeout: 15000 });
  });
});
