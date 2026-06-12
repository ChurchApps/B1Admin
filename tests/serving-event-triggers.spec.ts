import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { recoverFromViteError } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// Event-driven workflow triggers, managed per-workflow from the board. Seed
// (Api/tools/dbScripts/doing/demo.sql) on WFL00000001 "New Visitor Follow-up":
//   WKT1 person.created + WKT2 person.updated (Visitor), WKT3 form.submission.created.
// The engine taps WebhookDispatcher.emit, so any back-end mutation triggers it.
const API_BASE = "http://localhost:8084";

// Open the triggers manager for the seeded workflow's board.
async function openManager(page: Page) {
  await page.goto("/serving/tasks/workflows/WFL00000001");
  await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
  await page.locator('[data-testid="workflow-board"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator('[data-testid="board-triggers-tab"]').click();
  await page.locator('[data-testid="add-event-trigger-button"]').waitFor({ state: "visible", timeout: 10000 });
}

test.describe.serial("Serving Management - Event Triggers", () => {
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

  test("triggers manager opens from the board and lists seeded triggers", async () => {
    await openManager(page);
    // Scoped to the trigger list — the executions panel can repeat the trigger's name.
    await expect(page.locator('[data-testid="event-trigger-row-WKT00000001"]')).toBeVisible({ timeout: 10000 });
  });

  test("create, then delete, an event trigger (workflow implied)", async () => {
    await openManager(page);
    await page.locator('[data-testid="add-event-trigger-button"]').click();

    await page.locator('[data-testid="trigger-name"] input').fill("Zacchaeus Trigger");
    await page.locator('[data-testid="trigger-event-select"]').click();
    await page.getByRole("option", { name: /Person.*Created/ }).click();

    // No workflow picker — the trigger targets this board's workflow.
    await page.locator('[data-testid="add-condition-button"]').click();
    await page.locator('[data-testid="condition-value-0"]').click();
    await page.getByRole("option", { name: "Visitor" }).click();

    await page.locator('[data-testid="save-trigger-button"]').click();

    const row = page.locator("li").filter({ hasText: "Zacchaeus Trigger" });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="remove-event-trigger-"]').click();
    await expect(page.getByText("Zacchaeus Trigger")).toHaveCount(0, { timeout: 10000 });
  });

  test("create a form-submission trigger via the manager", async () => {
    await openManager(page);
    await page.locator('[data-testid="add-event-trigger-button"]').click();

    await page.locator('[data-testid="trigger-name"] input').fill("Zacchaeus Form Trigger");
    await page.locator('[data-testid="trigger-event-select"]').click();
    await page.getByRole("option", { name: /Form.*Submitted/ }).click();

    // The form field's value list is populated from MembershipApi /forms.
    await page.locator('[data-testid="add-condition-button"]').click();
    await page.locator('[data-testid="condition-value-0"]').click();
    await page.getByRole("option", { name: "Visitor Information Card" }).click();

    await page.locator('[data-testid="save-trigger-button"]').click();
    const row = page.locator("li").filter({ hasText: "Zacchaeus Form Trigger" });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="remove-event-trigger-"]').click();
    await expect(page.getByText("Zacchaeus Form Trigger")).toHaveCount(0, { timeout: 10000 });
  });

  test("create, then delete, a scheduled rule", async () => {
    await openManager(page);
    await page.locator('[data-testid="add-event-trigger-button"]').click();

    await page.locator('[data-testid="trigger-kind-schedule"]').click();
    await page.locator('[data-testid="trigger-name"] input').fill("Zacchaeus Schedule");
    // Scheduled rules pick a recurrence, not an event.
    await page.locator('[data-testid="trigger-recurs-select"]').click();
    await page.getByRole("option", { name: "Monthly" }).click();

    await page.locator('[data-testid="save-trigger-button"]').click();

    const row = page.locator("li").filter({ hasText: "Zacchaeus Schedule" });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="remove-event-trigger-"]').click();
    await expect(page.getByText("Zacchaeus Schedule")).toHaveCount(0, { timeout: 10000 });
  });

  // The point of the feature: a back-end mutation from ANY front-end fires the
  // trigger. We create a Visitor person through the membership API and assert a
  // card lands on the seeded workflow — no UI path involved.
  test("creating a Visitor person via the API drops a card on the workflow", async () => {
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };

    const created = await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ name: { first: "Zedediah", last: "Zacchaeus" }, membershipStatus: "Visitor", contactInfo: {} }] });
    expect(created.status()).toBe(200);
    const person = (await created.json())[0];
    expect(person?.id).toBeTruthy();

    const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth)).json();
    const card = (board.cards || []).find((c: any) => c.associatedWithId === person.id);
    expect(card).toBeTruthy();
    expect(card.triggerId).toBeTruthy();

    // A second save of the same Visitor must NOT create a second card (oncePerSubject by workflow+subject).
    await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ id: person.id, name: { first: "Zedediah", last: "Zacchaeus" }, membershipStatus: "Visitor", contactInfo: {} }] });
    const board2 = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth)).json();
    expect((board2.cards || []).filter((c: any) => c.associatedWithId === person.id).length).toBe(1);

    await ctx.post(`${API_BASE}/doing/tasks/${card.id}/complete`, { ...auth, data: {} });
    await ctx.delete(`${API_BASE}/membership/people/${person.id}`, auth);
    await ctx.dispose();
  });

  // Execution-history lifecycle, all API-driven on a throwaway workflow: a firing
  // records an execution; failures (no steps yet) park pending with the error; run-now
  // bulk-applies; retry succeeds once a step exists; pause-all parks queued retries.
  test("executions record, retry, run-now and pause-all on a temp workflow", async () => {
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };

    const wf = (await (await ctx.post(`${API_BASE}/doing/workflows`, { ...auth, data: [{ name: "Zacchaeus Exec WF", active: true }] })).json())[0];
    const conditions = JSON.stringify({ type: "group", conjunction: "AND", children: [{ type: "condition", field: "person.membershipStatus", operator: "=", value: "Visitor" }] });
    const trigger = (await (await ctx.post(`${API_BASE}/doing/workflowTriggers`, { ...auth, data: [{ name: "Zacchaeus Exec Trigger", triggerKind: "event", eventType: "person.created", workflowId: wf.id, conditions, oncePerSubject: true, active: true }] })).json())[0];

    // A live event against a step-less workflow fails and parks a pending retry.
    const created = await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ name: { first: "Zinnia", last: "Zacchaeus" }, membershipStatus: "Visitor", contactInfo: {} }] });
    const person = (await created.json())[0];
    let executions = await (await ctx.get(`${API_BASE}/doing/workflowTriggers/executions/workflow/${wf.id}`, auth)).json();
    const mine = (executions || []).find((e: any) => e.subjectId === person.id);
    expect(mine).toBeTruthy();
    expect(mine.status).toBe("pending");
    expect(mine.lastError).toContain("no steps");

    // Bulk-apply-on-create against the current matching set.
    const runResult = await (await ctx.post(`${API_BASE}/doing/workflowTriggers/${trigger.id}/runNow`, { ...auth, data: {} })).json();
    expect(runResult.created).toBeGreaterThanOrEqual(1);

    // With a step in place, retry completes and drops the card.
    await ctx.post(`${API_BASE}/doing/workflowSteps`, { ...auth, data: [{ workflowId: wf.id, name: "Intake", sort: 1 }] });
    const retried = await (await ctx.post(`${API_BASE}/doing/workflowTriggers/executions/${mine.id}/retry`, { ...auth, data: {} })).json();
    expect(retried.status).toBe("success");
    const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/${wf.id}`, auth)).json();
    expect((board.cards || []).some((c: any) => c.associatedWithId === person.id)).toBeTruthy();

    // Pause-all deactivates the trigger and parks its queued retries; resume reverses.
    const pausedTrigger = await (await ctx.post(`${API_BASE}/doing/workflowTriggers/${trigger.id}/pauseAll`, { ...auth, data: {} })).json();
    expect(pausedTrigger.active).toBeFalsy();
    executions = await (await ctx.get(`${API_BASE}/doing/workflowTriggers/${trigger.id}/executions`, auth)).json();
    expect((executions || []).filter((e: any) => e.status === "pending").length).toBe(0);
    const resumedTrigger = await (await ctx.post(`${API_BASE}/doing/workflowTriggers/${trigger.id}/resumeAll`, { ...auth, data: {} })).json();
    expect(resumedTrigger.active).toBeTruthy();

    await ctx.delete(`${API_BASE}/doing/workflowTriggers/${trigger.id}`, auth);
    await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
    await ctx.delete(`${API_BASE}/membership/people/${person.id}`, auth);
    await ctx.dispose();
  });

  test("execution history panel lists firings on the board", async () => {
    await openManager(page);
    await expect(page.locator('[data-testid="trigger-executions-panel"]')).toBeVisible({ timeout: 10000 });
    // The earlier API test fired WKT1 for Zedediah; that execution shows as Success.
    const row = page.locator('[data-testid^="execution-row-"]').filter({ hasText: "Zedediah Zacchaeus" }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.getByText("Success")).toBeVisible();
  });

  test("pause-all and resume-all toggle from the trigger row", async () => {
    await openManager(page);
    const row = page.locator("li").filter({ hasText: "New Visitor Follow-up (created)" });
    await expect(row.locator('[data-testid^="run-now-trigger-"]')).toBeVisible();
    await row.locator('[data-testid^="pause-trigger-"]').click();
    await expect(row.getByText("Paused")).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="pause-trigger-"]').click();
    await expect(row.getByText("Paused")).toHaveCount(0, { timeout: 10000 });
  });
});
