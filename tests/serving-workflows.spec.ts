import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToServing, navigateToPeople } from "./helpers/navigation";
import { openKnownPerson, SEED_PEOPLE, recoverFromViteError } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// ZACCHAEUS is the marker name for rows these tests create.

async function gotoWorkflows(page: Page) {
  // Navigate by URL rather than the secondary menu — robust even when the prior
  // test left us outside the Serving area (e.g. on the People page).
  await page.goto("/serving/tasks/workflows");
  await expect(page).toHaveURL(/\/serving\/tasks\/workflows/, { timeout: 10000 });
  await recoverFromViteError(page, page.locator('[data-testid="add-workflow-button"]'));
}

async function openSeedBoard(page: Page) {
  await gotoWorkflows(page);
  const row = page.locator('[data-testid="workflow-row-WFL00000001"]');
  await row.waitFor({ state: "visible", timeout: 10000 });
  await row.click();
  await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/WFL00000001/, { timeout: 10000 });
  await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
  await page.locator('[data-testid="workflow-board"]').waitFor({ state: "visible", timeout: 15000 });
}

// Open a specific workflow board directly by id (used by the routing tests).
async function openBoardById(page: Page, workflowId: string) {
  await page.goto("/serving/tasks/workflows/" + workflowId);
  await expect(page).toHaveURL(new RegExp("/serving/tasks/workflows/" + workflowId), { timeout: 10000 });
  await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
  await page.locator('[data-testid="workflow-board"]').waitFor({ state: "visible", timeout: 15000 });
}

test.describe.serial("Serving Management - Workflows", () => {
  test.describe.configure({ retries: 0 });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToServing(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("workflows list shows seeded workflows", async () => {
    await gotoWorkflows(page);
    await expect(page.locator('[data-testid="workflow-row-WFL00000001"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="workflow-row-WFL00000002"]')).toBeVisible({ timeout: 10000 });
  });

  test("board renders seeded steps and cards", async () => {
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000001"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-column-WFS00000002"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-column-WFS00000003"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-card-TSK00000101"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-card-TSK00000102"]')).toBeVisible();
  });

  test("overdue card shows overdue styling", async () => {
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="card-overdue-TSK00000102"]')).toBeVisible({ timeout: 10000 });
  });

  test("snoozed card shows snoozed styling", async () => {
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="card-snoozed-TSK00000103"]')).toBeVisible({ timeout: 10000 });
  });

  test("move a card to another step and persist", async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="workflow-card-TSK00000101"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-step-select"]').click();
    await page.getByRole("option", { name: "Call" }).click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000002"] [data-testid="workflow-card-TSK00000101"]')).toBeVisible({ timeout: 10000 });
  });

  test("snooze a card from the drawer", async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="workflow-card-TSK00000101"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-snooze-button"]').click();
    await page.locator('[data-testid="snooze-1"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="card-snoozed-TSK00000101"]')).toBeVisible({ timeout: 10000 });
  });

  test("complete a card removes it from the board", async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="workflow-card-TSK00000105"]').waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    await page.locator('[data-testid="workflow-card-TSK00000101"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-complete-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-card-TSK00000101"]')).toHaveCount(0, { timeout: 10000 });
  });

  test("create a new workflow", async () => {
    await gotoWorkflows(page);
    await page.locator('[data-testid="add-workflow-button"]').click();
    await page.locator('[data-testid="add-workflow-blank"]').click();
    const nameInput = page.locator('[data-testid="workflow-name-input"] input');
    await nameInput.waitFor({ state: "visible", timeout: 10000 });
    await nameInput.fill("Zacchaeus Workflow");
    await page.locator('[data-testid="workflow-save-button"]').click();
    await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/[\w-]+$/, { timeout: 15000 });
  });

  test("add a step to the new workflow", async () => {
    await gotoWorkflows(page);
    await page.getByText("Zacchaeus Workflow").first().click();
    await page.locator('[data-testid="add-first-step-button"], [data-testid="add-step-button"]').first().click();
    const stepName = page.locator('[data-testid="step-name-input"] input');
    await stepName.waitFor({ state: "visible", timeout: 10000 });
    await stepName.fill("Greet");
    await page.locator('[data-testid="step-save-button"]').click();
    await expect(page.locator('[data-testid="workflow-board"]').getByText("Greet").first()).toBeVisible({ timeout: 10000 });
  });

  test("My Work inbox shows the demo user assigned card", async () => {
    await page.goto("/serving/tasks");
    await recoverFromViteError(page, page.locator('[data-testid="my-cards-list"]'));
    await page.locator('[data-testid="my-cards-list"]').waitFor({ state: "visible", timeout: 15000 });
    await expect(page.locator('[data-testid="workflow-card-TSK00000104"]')).toBeVisible({ timeout: 10000 });
  });

  test("reports page renders for a workflow", async () => {
    await page.goto("/serving/tasks/workflows/WFL00000001/reports");
    await recoverFromViteError(page, page.locator('[data-testid="workflow-reports"]'));
    await page.locator('[data-testid="workflow-reports"]').waitFor({ state: "visible", timeout: 15000 });
    await expect(page.locator('[data-testid="report-overdue-count"]')).toBeVisible({ timeout: 10000 });
  });

  test("add a person to a workflow from the Person page", async () => {
    await openKnownPerson(page, SEED_PEOPLE.DOROTHY);
    await page.locator('[data-testid="add-to-workflow-button"]').click();
    await page.locator('[data-testid="add-to-workflow-select"]').click();
    await page.getByRole("option", { name: "New Visitor Follow-up" }).click();
    await page.locator('[data-testid="add-to-workflow-confirm"]').click();
    await expect(page.locator('[data-testid="add-to-workflow-success"]')).toBeVisible({ timeout: 10000 });
    // Close dialog to avoid blocking subsequent tests.
    await page.locator('[role="dialog"] button').getByText("Close").click();
  });

  test("bulk add people to a workflow from People", async () => {
    await navigateToPeople(page);
    for (const name of [SEED_PEOPLE.DONALD, SEED_PEOPLE.CAROL]) {
      const row = page.locator("table tbody tr").filter({ hasText: name }).first();
      await row.waitFor({ state: "visible", timeout: 10000 });
      await row.getByRole("checkbox").check();
    }
    await page.getByTestId("bulk-actions-button").click();
    await page.getByTestId("bulk-action-add-workflow").click();
    await page.locator('[data-testid="bulk-workflow-select"]').click();
    await page.getByRole("option", { name: "New Visitor Follow-up" }).click();
    await page.locator('[data-testid="bulk-workflow-apply"]').click();
    await expect(page.getByText(/Added 2 people to the workflow/i)).toBeVisible({ timeout: 10000 });
  });

  test("duplicate a workflow copies it with its steps", async () => {
    await gotoWorkflows(page);
    await page.locator('[data-testid="duplicate-workflow-WFL00000001"]').click();
    await expect(page.getByText("New Visitor Follow-up (copy)").first()).toBeVisible({ timeout: 10000 });
  });

  test("create a workflow from a starter template", async () => {
    await gotoWorkflows(page);
    await page.locator('[data-testid="add-workflow-button"]').click();
    await page.locator('[data-testid="add-workflow-template-newVisitor"]').click();
    await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/[\w-]+$/, { timeout: 15000 });
    await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
    await expect(page.locator('[data-testid="workflow-board"]').getByText("Send welcome email").first()).toBeVisible({ timeout: 10000 });
  });

  test("adding a group to a step creates a card per member", async () => {
    await openSeedBoard(page);
    const countLocator = page.locator('[data-testid="step-count-WFS00000001"]');
    const before = parseInt(((await countLocator.innerText()).trim() || "0"), 10);

    await page.locator('[data-testid="add-card-WFS00000001"]').click();
    await page.getByRole("dialog").getByRole("tab", { name: /Group/i }).click();
    const search = page.getByRole("dialog").getByRole("textbox").first();
    const groupButton = page.locator('[data-testid="select-group-button-GRP00000014"]');
    // Group list loads asynchronously, retry until visible.
    await expect(async () => {
      await search.fill("Young Families");
      await search.press("Enter");
      await expect(groupButton).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });
    await groupButton.click();
    // The picker closes before the members fetch + bulk POST fire; navigating away aborts them.
    // Wait for the board's own refetch to show the new cards before reloading.
    await expect(async () => {
      const now = parseInt(((await countLocator.innerText()).trim() || "0"), 10);
      expect(now).toBeGreaterThan(before);
    }).toPass({ timeout: 15000 });

    await openSeedBoard(page);
    const after = parseInt(((await page.locator('[data-testid="step-count-WFS00000001"]').innerText()).trim() || "0"), 10);
    expect(after).toBeGreaterThan(before);
  });

  test("pinned assignment keeps the owner across step changes", async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="workflow-card-TSK00000104"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-pin-button"]').click();
    // Pinned assignment overrides default assignee when moving steps.
    await page.locator('[data-testid="card-step-select"]').click();
    await page.getByRole("option", { name: "Call" }).click();

    await openSeedBoard(page);
    const moved = page.locator('[data-testid="workflow-column-WFS00000002"] [data-testid="workflow-card-TSK00000104"]');
    await expect(moved).toBeVisible({ timeout: 10000 });
    await expect(moved).toContainText("Demo User");
    await expect(page.locator('[data-testid="card-pinned-TSK00000104"]')).toBeVisible();
  });

  test("skip advances and send back retreats a card", async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="workflow-card-TSK00000102"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-skip-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000002"] [data-testid="workflow-card-TSK00000102"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="workflow-card-TSK00000102"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-sendback-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000001"] [data-testid="workflow-card-TSK00000102"]')).toBeVisible({ timeout: 10000 });
  });

  test("bulk complete removes selected cards from the board", async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="card-select-TSK00000102"]').getByRole("checkbox").check();
    await page.locator('[data-testid="card-select-TSK00000103"]').getByRole("checkbox").check();
    await page.locator('[data-testid="bulk-action-bar"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="bulk-complete-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-card-TSK00000102"]')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('[data-testid="workflow-card-TSK00000103"]')).toHaveCount(0, { timeout: 10000 });
  });

  test("permission tiers are enforced at the API (view / edit-assigned / admin)", async () => {
    const API_BASE = "http://localhost:8084";
    const ctx = await request.newContext();
    // Log in as the seeded "Workflow Volunteer" — DoingApi/Tasks/View only, person PER00000069.
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "volunteer@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const jwt = body.userChurches?.[0]?.jwt as string;
    expect(jwt).toBeTruthy();
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    // View tier: can load the board.
    const board = await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth);
    expect(board.status()).toBe(200);

    // Edit-assigned tier: can act on a card assigned to them (TSK00000105 -> PER00000069)...
    const own = await ctx.post(`${API_BASE}/doing/tasks/TSK00000105/pin`, { ...auth, data: { pinned: true } });
    expect(own.status()).toBe(200);
    // ...but NOT a card assigned to someone else (TSK00000104 -> Demo User).
    const other = await ctx.post(`${API_BASE}/doing/tasks/TSK00000104/pin`, { ...auth, data: { pinned: true } });
    expect(other.status()).toBe(401);

    // Admin tier: managing workflow definitions is denied without Doing/Admin.
    const dup = await ctx.post(`${API_BASE}/doing/workflows/WFL00000001/duplicate`, { ...auth, data: {} });
    expect(dup.status()).toBe(401);

    await ctx.dispose();
  });

  test("the board annotates each step with its conditional routes", async () => {
    await openBoardById(page, "WFL00000003");
    const reached = page.locator('[data-testid="route-annotation-WSR00000001"]');
    await expect(reached).toBeVisible({ timeout: 10000 });
    await expect(reached).toContainText("Reached");
    await expect(reached).toContainText("Scheduled");
    await expect(page.locator('[data-testid="route-annotation-WSR00000002"]')).toContainText("Not Interested");

    await openBoardById(page, "WFL00000002");
    await expect(page.locator('[data-testid="route-annotation-WSR00000003"]')).toBeVisible({ timeout: 10000 });
  });

  test("completing with an outcome routes the card to the target step", async () => {
    await openBoardById(page, "WFL00000003");
    await page.locator('[data-testid="workflow-card-TSK00000106"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-outcome-WSR00000001"]').click();
    await openBoardById(page, "WFL00000003");
    await expect(page.locator('[data-testid="workflow-column-WFS00000007"] [data-testid="workflow-card-TSK00000106"]')).toBeVisible({ timeout: 10000 });
  });

  test("an outcome with no target step closes the card", async () => {
    await openBoardById(page, "WFL00000003");
    await page.locator('[data-testid="workflow-card-TSK00000107"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="card-outcome-WSR00000002"]').click();
    await openBoardById(page, "WFL00000003");
    await expect(page.locator('[data-testid="workflow-card-TSK00000107"]')).toHaveCount(0, { timeout: 10000 });
  });

  test("configure a new outcome from the step editor", async () => {
    await openBoardById(page, "WFL00000003");
    await page.locator('[data-testid="edit-step-WFS00000007"]').click();
    await page.locator('[data-testid="add-outcome-button"]').click();
    await expect(page.locator('[data-testid^="outcome-route-"]').first()).toBeVisible({ timeout: 10000 });
    const label = page.locator('[data-testid^="outcome-label-"] input').first();
    await label.fill("Welcomed");
    await label.blur();
    await openBoardById(page, "WFL00000003");
    await page.locator('[data-testid="edit-step-WFS00000007"]').click();
    await expect(page.locator('[data-testid^="outcome-label-"] input').first()).toHaveValue("Welcomed", { timeout: 10000 });
  });

  test("a cross-workflow outcome hands the card off to another workflow (API)", async () => {
    const API_BASE = "http://localhost:8084";
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };

    const done = await ctx.post(`${API_BASE}/doing/tasks/TSK00000108/complete`, { ...auth, data: { routeId: "WSR00000004" } });
    expect(done.status()).toBe(200);
    expect((await done.json()).status).toBe("Closed");

    const board1 = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth)).json();
    expect((board1.cards || []).some((c: any) => c.id === "TSK00000108")).toBeFalsy();

    // PER6 doesn't match personMatch route, so card stays on first step.
    const board2 = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000002`, auth)).json();
    const handed = (board2.cards || []).find((c: any) => c.associatedWithId === "PER00000006" && c.title === "Handoff Tester");
    expect(handed).toBeTruthy();
    expect(handed.stepId).toBe("WFS00000004");

    await ctx.post(`${API_BASE}/doing/tasks/${handed.id}/complete`, { ...auth, data: {} });
    await ctx.dispose();
  });

  test("cards stay out of plain-task surfaces and the generic save endpoint (API)", async () => {
    const API_BASE = "http://localhost:8084";
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };

    // Generic task endpoint rejects workflow cards.
    const blocked = await ctx.post(`${API_BASE}/doing/tasks`, { ...auth, data: [{ title: "Sneaky card", status: "Open", workflowId: "WFL00000001", stepId: "WFS00000001" }] });
    expect(blocked.status()).toBe(400);

    // Plain task list excludes workflow cards.
    const list = await ctx.get(`${API_BASE}/doing/tasks`, auth);
    expect(list.status()).toBe(200);
    const tasks = await list.json();
    expect(Array.isArray(tasks)).toBeTruthy();
    expect((tasks as any[]).some((t) => t.workflowId)).toBeFalsy();

    await ctx.dispose();
  });

  test("a manual send-back does not re-trigger the target step onEnter route (API)", async () => {
    const API_BASE = "http://localhost:8084";
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };

    // John Smith matches personMatch route and auto-advances.
    const added = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: "WFL00000002", stepId: "WFS00000004", associatedWith: { type: "person", id: "PER00000001", label: "John Smith" } } });
    const card = await added.json();
    expect(card.stepId).toBe("WFS00000005");

    // Manual send-back suppresses onEnter route re-trigger.
    const back = await ctx.post(`${API_BASE}/doing/tasks/${card.id}/sendBack`, { ...auth, data: {} });
    expect(back.status()).toBe(200);
    expect((await back.json()).stepId).toBe("WFS00000004");

    await ctx.post(`${API_BASE}/doing/tasks/${card.id}/complete`, { ...auth, data: {} });
    await ctx.dispose();
  });

  test("a personMatch route auto-advances a matching card on entry (API)", async () => {
    const API_BASE = "http://localhost:8084";
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const jwt = uc?.jwt as string;
    expect(jwt).toBeTruthy();
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    const matchRes = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: "WFL00000002", stepId: "WFS00000004", associatedWith: { type: "person", id: "PER00000001", label: "John Smith" } } });
    expect(matchRes.status()).toBe(200);
    expect((await matchRes.json()).stepId).toBe("WFS00000005");

    const noMatchRes = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: "WFL00000002", stepId: "WFS00000004", associatedWith: { type: "person", id: "PER00000006", label: "Robert Johnson" } } });
    expect(noMatchRes.status()).toBe(200);
    expect((await noMatchRes.json()).stepId).toBe("WFS00000004");

    await ctx.dispose();
  });

  const API_BASE = "http://localhost:8084";
  async function apiAuth(ctx: any) {
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
  }
  // Build workflow with optional onEnter route so Auto step acts as pass-through.
  async function buildActionWorkflow(ctx: any, auth: any, actions: { actionType: string; config: any }[], routeAutoToDone = false) {
    const wfRes = await ctx.post(`${API_BASE}/doing/workflows`, { ...auth, data: [{ name: "Zacchaeus Action WF", active: true }] });
    const wf = (await wfRes.json())[0];
    const stepRes = await ctx.post(`${API_BASE}/doing/workflowSteps`, {
      ...auth,
      data: [
        { workflowId: wf.id, name: "Greet", sort: 1 },
        { workflowId: wf.id, name: "Auto", sort: 2 },
        { workflowId: wf.id, name: "Done", sort: 3 }
      ]
    });
    const steps = await stepRes.json();
    const auto = steps.find((s: any) => s.name === "Auto");
    const done = steps.find((s: any) => s.name === "Done");
    if (actions.length) {
      await ctx.post(`${API_BASE}/doing/workflowStepActions`, { ...auth, data: actions.map((a, i) => ({ stepId: auto.id, sort: i + 1, actionType: a.actionType, config: JSON.stringify(a.config) })) });
    }
    if (routeAutoToDone) {
      await ctx.post(`${API_BASE}/doing/workflowStepRoutes`, { ...auth, data: [{ workflowId: wf.id, stepId: auto.id, trigger: "onEnter", kind: "always", sort: 1, targetStepId: done.id }] });
    }
    return { wf, auto, done };
  }

  test("a card entering a step runs its on-enter action and rests there (API)", async () => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const { wf, auto } = await buildActionWorkflow(ctx, auth, [{ actionType: "addNote", config: { note: "Zacchaeus note" } }]);

    const added = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: wf.id, stepId: auto.id, associatedWith: { type: "person", id: "PER00000001", label: "John Smith" } } });
    expect(added.status()).toBe(200);
    const card = await added.json();
    expect(card.stepId).toBe(auto.id); // rests on the step for a human
    expect(JSON.parse(card.data || "{}").history?.some((h: any) => h.message === "Note: Zacchaeus note")).toBeTruthy();

    await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
    await ctx.dispose();
  });

  test("on-enter actions run and the card advances when an onEnter always route is set (API)", async () => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const { wf, auto, done } = await buildActionWorkflow(ctx, auth, [{ actionType: "addNote", config: { note: "passing through" } }], true);

    const added = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: wf.id, stepId: auto.id, associatedWith: { type: "person", id: "PER00000001", label: "John Smith" } } });
    expect(added.status()).toBe(200);
    const card = await added.json();
    expect(card.stepId).toBe(done.id); // the always route advanced it after the action ran
    expect(JSON.parse(card.data || "{}").history?.some((h: any) => h.message === "Note: passing through")).toBeTruthy();

    await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
    await ctx.dispose();
  });

  test("a delay action parks the card on the step (API)", async () => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const { wf, auto } = await buildActionWorkflow(ctx, auth, [{ actionType: "delay", config: { days: 3 } }]);

    const added = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: wf.id, stepId: auto.id, associatedWith: { type: "person", id: "PER00000001", label: "John Smith" } } });
    expect(added.status()).toBe(200);
    const card = await added.json();
    expect(card.stepId).toBe(auto.id); // parked, waiting on the delay
    expect(card.snoozedUntil).toBeTruthy();

    await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
    await ctx.dispose();
  });

  test("every step renders as a column with an automated-actions badge (no connector)", async () => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const { wf, auto } = await buildActionWorkflow(ctx, auth, [{ actionType: "addNote", config: { note: "x" } }]);
    await ctx.dispose();

    await openBoardById(page, wf.id);
    await expect(page.locator(`[data-testid="workflow-column-${auto.id}"]`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`[data-testid="step-actions-${auto.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="workflow-connector-${auto.id}"]`)).toHaveCount(0);

    const cleanup = await request.newContext();
    const auth2 = await apiAuth(cleanup);
    await cleanup.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth2);
    await cleanup.dispose();
  });
});
