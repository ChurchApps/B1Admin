import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { SEED_PEOPLE, personAddButton, recoverFromViteError } from "./helpers/fixtures";

// The "Serving Assignment Confirmation" workflow only gets cards from a published plan, so its
// board must not offer Add Card, and its serving-request actions must read as words, not keys.
// An Api 400 shows its one-line message, and workflow names stay readable on a phone.
const API = process.env.API_BASE || "http://localhost:8084";

async function openBoard(page: Page, workflowId: string) {
  await page.goto("/serving/tasks/workflows/" + workflowId);
  await recoverFromViteError(page, page.getByTestId("workflow-board"));
  await expect(page.getByTestId("workflow-board")).toBeVisible({ timeout: 15000 });
}

test.describe("Assignment confirmation workflow board", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let workflowId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const body = await res.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    const created = await ctx.post(`${API}/doing/workflows/fromTemplate`, { ...auth, data: { templateKey: "assignmentConfirmation" } });
    expect(created.ok()).toBeTruthy();
    workflowId = (await created.json()).id;
  });

  test.afterAll(async () => {
    if (workflowId) await ctx.delete(`${API}/doing/workflows/${workflowId}`, auth);
    await ctx.dispose();
  });

  test("offers no Add Card and labels the serving-request actions", async ({ page }) => {
    await openBoard(page, workflowId);
    const actions = page.locator('[data-testid^="step-actions-"]').first();
    await expect(actions).toContainText("Send serving request");
    await expect(actions).not.toContainText("tasks.workflowActions");
    await expect(page.locator('[data-testid^="add-card-"]')).toHaveCount(0);
  });

  test("an Api 400 shows its message instead of the raw reply", async ({ page }) => {
    await page.route("**/doing/tasks/addToWorkflow", (route) => route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Issue serving requests from a plan to use this workflow", status: 400, timestamp: "2026-11-13T17:34:12.315Z", path: "/doing/tasks/addToWorkflow" } })
    }));
    await openBoard(page, "WFL00000001");
    await page.getByTestId("add-card-WFS00000001").click();
    const dialog = page.getByRole("dialog").filter({ has: page.locator('input[name="personAddText"]') });
    await dialog.locator('input[name="personAddText"]').fill(SEED_PEOPLE.DONALD);
    await dialog.locator('input[name="personAddText"]').press("Enter");
    await personAddButton(dialog, SEED_PEOPLE.DONALD).click();
    await expect(page.locator(".MuiSnackbar-root").getByRole("alert")).toHaveText("Issue serving requests from a plan to use this workflow", { timeout: 5000 });
  });

  test.describe("at phone width", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the workflow list keeps names readable", async ({ page }) => {
      await page.goto("/serving/tasks/workflows");
      const row = page.getByTestId("workflow-row-" + workflowId);
      await expect(row.getByRole("link", { name: "Serving Assignment Confirmation" })).toBeVisible({ timeout: 15000 });
      const box = await row.getByRole("cell").first().boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(180);
    });
  });
});
