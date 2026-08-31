import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1051: "Expand to Actions" on a lessons.church plan errored every time and dropped the
// user back on the Assignments tab. The provider's truncateForLabel cuts content at 100 chars and
// *then* appends "...", so real labels reach 103 chars, overflowing planItems.label varchar(100)
// under MySQL strict mode. The provider is mocked at the API proxy, as in issue-996-collapse,
// since no content provider is linked in the local stack.
const API = "http://localhost:8084";

// 103 chars — exactly what LessonsChurchConverters.truncateForLabel emits for a long "note"
// action (100 characters of stripped content plus the ellipsis).
const LONG_LABEL = "This Engage uses the Sweet Treats Ice Cream Cone balancing game to help kids practice honoring God t" + "...";

const INSTRUCTIONS = {
  name: "Overflow Repro Lesson",
  items: [
    {
      id: "OVFHEAD1",
      itemType: "header",
      relatedId: "OVFHEAD1",
      label: "Overflow Repro Header",
      children: [
        {
          id: "OVFSEC1",
          itemType: "section",
          relatedId: "OVFSEC1",
          label: "Overflow Repro Section",
          seconds: 300,
          children: [
            { id: "OVFACT1", itemType: "action", relatedId: "OVFACT1", label: "Overflow Repro Action One", seconds: 120 },
            { id: "OVFACT2", itemType: "action", relatedId: "OVFACT2", label: LONG_LABEL, actionType: "note", seconds: 180 }
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

test.describe("issue-1051 expand a lessons.church section whose action labels hit the column limit", () => {
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
          name: "Overflow Repro Plan",
          serviceDate: "2030-06-01",
          ministryId: "GRP0000000a",
          planTypeId: "PLT00000001",
          serviceOrder: true,
          contentType: "venue",
          contentId: "OVFVENUE1"
        }
      ]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const headerRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, sort: 1, itemType: "header", label: "Overflow Repro Header" }]
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
          relatedId: "OVFSEC1",
          label: "Overflow Repro Section",
          providerId: "lessonschurch",
          providerPath: "OVFVENUE1",
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

  test("expanding writes every action instead of failing on the long label", async ({ page }) => {
    await page.route("**/providerProxy/getInstructions", (route) => route.fulfill({ json: INSTRUCTIONS }));
    // No provider is linked locally; keep the dialog's direct provider call off the network.
    await page.route("**/lessons.church/**", (route) => route.abort());

    await page.goto(`/serving/plans/${planId}`);
    await page.getByRole("tab", { name: "Service Order" }).click();

    const sectionRow = page.locator(".planItem").filter({ hasText: "Overflow Repro Section" });
    await expect(sectionRow).toHaveCount(1, { timeout: 15000 });
    await sectionRow.click();

    await page.getByRole("button", { name: "Expand to Actions" }).click();

    // The bug: POST /doing/planItems 500s on the 103-char label, so nothing is written, the
    // global error banner appears and the page remounts back onto the Assignments tab.
    await expect(page.locator(".planItem").filter({ hasText: "Overflow Repro Action One" })).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator(".planItem").filter({ hasText: LONG_LABEL })).toHaveCount(1);
    await expect(page.locator(".planItem").filter({ hasText: "Overflow Repro Section" })).toHaveCount(0);
  });
});
