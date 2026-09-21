import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #980: removing or rewording part of a lesson section took a chain of hidden steps.
// Clicking a section now opens an editor; saving keeps the section as one row in the plan.
// The provider is mocked at the API proxy, since no content provider is linked in the local stack.
const API = process.env.API_BASE || "http://localhost:8084";

const clip = (n: number) => ({ id: `EDF${n}`, itemType: "file", label: `Editor Clip ${n}`, downloadUrl: `https://example.com/editor-clip${n}.mp4`, mediaType: "video", seconds: 30 });

const INSTRUCTIONS = {
  name: "Editor Repro Lesson",
  items: [
    {
      id: "EDHEAD1",
      itemType: "header",
      relatedId: "EDHEAD1",
      label: "Editor Repro Header",
      children: [
        {
          id: "EDSEC1",
          itemType: "section",
          relatedId: "EDSEC1",
          label: "Editor Script Section",
          seconds: 90,
          children: [
            { id: "EDACT1", itemType: "action", relatedId: "EDACT1", actionType: "note", label: "Editor note line", content: "Editor note line", seconds: 0 },
            { id: "EDACT2", itemType: "action", relatedId: "EDACT2", actionType: "say", label: "Editor say...", content: "Editor say line original wording", seconds: 30 },
            { id: "EDACT3", itemType: "action", relatedId: "EDACT3", actionType: "play", label: "Editor Video", seconds: 60, children: [clip(9)] }
          ]
        },
        {
          // Shape every provider other than lessons.church emits: play actions only, no text, no relatedId.
          id: "EDSEC2",
          itemType: "section",
          label: "Editor Media Section",
          children: [1, 2, 3].map((n) => ({ id: `EDF${n}-action`, itemType: "action", actionType: "play", label: `Editor Clip ${n}`, seconds: 30, children: [clip(n)] }))
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

test.describe("issue-980 section editor", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  const auth = () => ({ headers: { Authorization: "Bearer " + jwt } });
  const childRows = async (): Promise<any[]> => {
    const items = await (await ctx.get(`${API}/doing/planItems/plan/${planId}`, auth())).json();
    return items[0].children;
  };

  test.beforeEach(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth(),
      data: [{ name: "Editor Repro Plan", serviceDate: "2030-05-08", ministryId: "GRP0000000a", planTypeId: "PLT00000001", serviceOrder: true, contentType: "venue", contentId: "EDVENUE1" }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const headerRes = await ctx.post(`${API}/doing/planItems`, { ...auth(), data: [{ planId, sort: 1, itemType: "header", label: "Editor Repro Header" }] });
    const headerId = (await headerRes.json())[0].id;
    const section = (label: string, sort: number, extra: object) => ({ planId, parentId: headerId, sort, itemType: "providerSection", label, providerId: "lessonschurch", providerPath: "EDVENUE1", ...extra });
    const sectionRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth(),
      data: [
        section("Editor Script Section", 1, { relatedId: "EDSEC1", providerContentPath: "0.0" }),
        { planId, parentId: headerId, sort: 2, itemType: "item", label: "Editor Offering" },
        section("Editor Media Section", 3, { providerContentPath: "0.1" })
      ]
    });
    expect(sectionRes.ok()).toBeTruthy();
  });

  test.afterEach(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, auth());
    await ctx.dispose();
  });

  const openPlan = async (page: Page) => {
    await page.route("**/providerProxy/getInstructions", (route) => route.fulfill({ json: INSTRUCTIONS }));
    await page.route("**/lessons.church/**", (route) => route.abort());
    await page.goto(`/serving/plans/${planId}`);
    await page.getByRole("tab", { name: "Service Order" }).click();
    await expect(page.locator(".planItem").filter({ hasText: "Editor Script Section" })).toHaveCount(1, { timeout: 15000 });
  };

  test("take a line out, reword another, and the section stays one row", async ({ page }) => {
    await openPlan(page);
    const sectionRow = page.locator(".planItem").filter({ hasText: "Editor Script Section" });
    await sectionRow.click();

    const dialog = page.getByRole("dialog");
    const lines = dialog.locator('[data-testid="section-line"]');
    await expect(lines).toHaveCount(3, { timeout: 15000 });
    await expect(lines.nth(1)).toContainText("Editor say line original wording");
    await expect(dialog.locator('[data-testid="section-save"]')).toBeDisabled();

    await lines.nth(0).locator('[data-testid="section-line-remove"]').click();
    await lines.nth(1).locator('[data-testid="section-line-text"]').click();
    await lines.nth(1).locator("textarea").first().fill("Our own wording");
    await dialog.getByRole("heading", { name: "Editor Script Section" }).click();
    await dialog.locator('[data-testid="section-save"]').click();

    await expect(sectionRow).toHaveCount(1, { timeout: 15000 });
    await expect(sectionRow.locator('[data-testid="customized-chip"]')).toHaveText("2 of 3 items");
    await expect(page.locator(".planItem").filter({ hasText: "Editor Video" })).toHaveCount(0);

    const rows = await childRows();
    expect(rows.map((r) => `${r.itemType}:${r.label}:${r.description || ""}`)).toEqual([
      "providerPresentation:Editor say...:Our own wording",
      "providerPresentation:Editor Video:",
      "item:Editor Offering:",
      "providerSection:Editor Media Section:"
    ]);

    // Reopening shows the original with the changes on top, and lets a line come back in place.
    await sectionRow.click();
    await expect(lines).toHaveCount(3, { timeout: 15000 });
    await expect(lines.nth(1)).toContainText("Our own wording");
    await lines.nth(0).locator('[data-testid="section-line-restore"]').click();
    await dialog.locator('[data-testid="section-save"]').click();
    await expect(sectionRow.locator('[data-testid="customized-chip"]')).toHaveText("3 of 3 items", { timeout: 15000 });
    expect((await childRows()).slice(0, 3).map((r) => r.label)).toEqual(["Editor note line", "Editor say...", "Editor Video"]);

    await sectionRow.click();
    await dialog.locator('[data-testid="section-restore-original"]').click();
    await page.locator('[data-testid="confirm-collapse-dialog"]').getByRole("button", { name: "Restore original section" }).click();
    await expect(page.locator('[data-testid="customized-chip"]')).toHaveCount(0, { timeout: 15000 });
    expect((await childRows()).map((r) => r.itemType)).toEqual(["providerSection", "item", "providerSection"]);
  });

  test("the chevron shows a section as separate rows and folds it back", async ({ page }) => {
    await openPlan(page);
    const sectionRow = page.locator(".planItem").filter({ hasText: "Editor Script Section" });
    await sectionRow.locator('[data-testid="fold-toggle-button"]').click();

    const sayRow = page.locator(".planItem").filter({ hasText: "Editor say line original wording" });
    await expect(sayRow).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator(".planItem").filter({ hasText: "Editor Video" })).toHaveCount(1);
    await expect(sectionRow).toHaveCount(0);

    await page.locator('[data-testid="fold-toggle-button"]').first().click();
    await expect(sectionRow).toHaveCount(1);
    await expect(sayRow).toHaveCount(0);
  });

  test("works for a provider with no text and no stable ids", async ({ page }) => {
    await openPlan(page);
    const sectionRow = page.locator(".planItem").filter({ hasText: "Editor Media Section" });
    await sectionRow.click();

    const dialog = page.getByRole("dialog");
    const lines = dialog.locator('[data-testid="section-line"]');
    await expect(lines).toHaveCount(3, { timeout: 15000 });
    await lines.nth(1).locator('[data-testid="section-line-remove"]').click();
    await dialog.locator('[data-testid="section-save"]').click();
    await expect(sectionRow.locator('[data-testid="customized-chip"]')).toHaveText("2 of 3 items", { timeout: 15000 });

    await sectionRow.click();
    await expect(dialog.locator('[data-testid="section-line-restore"]')).toHaveCount(1, { timeout: 15000 });
    await lines.nth(1).locator('[data-testid="section-line-restore"]').click();
    await dialog.locator('[data-testid="section-save"]').click();
    await expect(sectionRow.locator('[data-testid="customized-chip"]')).toHaveText("3 of 3 items", { timeout: 15000 });
    expect((await childRows()).slice(2).map((r) => r.label)).toEqual(["Editor Clip 1", "Editor Clip 2", "Editor Clip 3"]);
  });
});
