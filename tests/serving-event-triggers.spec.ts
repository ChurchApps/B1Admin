import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { recoverFromViteError } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// Event-driven workflow triggers fire on back-end mutations via WebhookDispatcher.
const API_BASE = process.env.API_BASE || "http://localhost:8084";

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

  // ChurchAppsSupport#1374: "On a schedule" rules honour Only once per person, so they offer the same repeat option.
  test("a scheduled rule offers and saves add again after close", async () => {
    await openManager(page);
    await page.locator('[data-testid="add-event-trigger-button"]').click();
    await page.locator('[data-testid="trigger-kind-schedule"]').click();
    await page.locator('[data-testid="trigger-name"] input').fill("Zacchaeus Weekly Repeat");
    await page.locator('[data-testid="trigger-recurs-select"]').click();
    await page.getByRole("option", { name: "Weekly" }).click();
    await expect(page.locator('[data-testid="trigger-once"] input')).toBeChecked();
    const repeat = page.locator('[data-testid="trigger-repeat-after-close"] input');
    await expect(repeat).toBeVisible();
    await repeat.check();
    await page.locator('[data-testid="save-trigger-button"]').click();

    const row = page.locator("li").filter({ hasText: "Zacchaeus Weekly Repeat" });
    await expect(row).toBeVisible({ timeout: 10000 });
    const ctx = await request.newContext();
    const body = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
    const trigger = ((await (await ctx.get(`${API_BASE}/doing/workflowTriggers/workflow/WFL00000001`, auth)).json()) || []).find((t: any) => t.name === "Zacchaeus Weekly Repeat");
    expect(trigger?.triggerKind).toBe("schedule");
    expect(trigger?.allowRepeatAfterClose).toBeTruthy();

    await page.locator(`[data-testid="event-trigger-row-${trigger.id}"]`).click();
    await expect(page.locator('[data-testid="trigger-repeat-after-close"] input')).toBeChecked();
    await page.getByRole("button", { name: "Cancel" }).click();
    await ctx.delete(`${API_BASE}/doing/workflowTriggers/${trigger.id}`, auth);
    await ctx.dispose();
  });

  // Add condition on a saved scheduled rule used to crash with "Box is not defined".
  test("add condition on a saved scheduled rule opens the condition editor", async () => {
    await page.goto("/serving/tasks/workflows/WFL00000004");
    const board = page.locator('[data-testid="workflow-board"]');
    await recoverFromViteError(page, board);
    await board.waitFor({ state: "visible", timeout: 15000 });
    await page.locator('[data-testid="board-triggers-tab"]').click();

    await page.locator('[data-testid="event-trigger-row-WKT00000004"]').click();
    await page.locator('[data-testid="add-sched-condition-button"]').click();

    await expect(page.locator('[data-testid="condition-type-select"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Box is not defined")).toHaveCount(0);
  });

  // Yearly birthday rule: Birth Date day of month can be "Today" (resolved in the church's time zone).
  test("a scheduled rule condition can match a birthday that is today", async () => {
    await page.goto("/serving/tasks/workflows/WFL00000004");
    const board = page.locator('[data-testid="workflow-board"]');
    await recoverFromViteError(page, board);
    await board.waitFor({ state: "visible", timeout: 15000 });
    await page.locator('[data-testid="board-triggers-tab"]').click();
    await page.locator('[data-testid="event-trigger-row-WKT00000004"]').click();
    await page.locator('[data-testid="add-sched-condition-button"]').click();

    await page.locator('[data-testid="condition-type-select"]').click();
    await page.getByRole("option", { name: "Birth Date" }).click();
    await page.getByRole("combobox").filter({ hasText: "Full Date" }).click();
    await page.getByRole("option", { name: "Day of Month" }).click();
    await page.locator('[data-testid="day-of-month-select"]').click();
    await page.getByRole("option", { name: "Today" }).click();
    await page.getByRole("button", { name: "Save" }).click();

    const chip = page.locator('[data-testid^="sched-condition-"]').filter({ hasText: "Birth Date: Day of month is Today" });
    await expect(chip).toBeVisible({ timeout: 10000 });
    await chip.locator(".MuiChip-deleteIcon").click();
    await expect(chip).toHaveCount(0, { timeout: 10000 });
  });

  // ChurchAppsSupport#1363: a scheduled rule can start a care card for a regular giver who stopped giving.
  test("a scheduled rule condition can match a lapsed regular giver without showing amounts", async () => {
    await page.goto("/serving/tasks/workflows/WFL00000004");
    const board = page.locator('[data-testid="workflow-board"]');
    await recoverFromViteError(page, board);
    await board.waitFor({ state: "visible", timeout: 15000 });
    await page.locator('[data-testid="board-triggers-tab"]').click();
    await page.locator('[data-testid="event-trigger-row-WKT00000004"]').click();
    await page.locator('[data-testid="add-sched-condition-button"]').click();

    await page.locator('[data-testid="condition-type-select"]').click();
    await page.getByRole("option", { name: "Lapsed regular giver" }).click();
    await expect(page.locator('[data-testid="giving-min-weeks"] input')).toHaveValue("3");
    await expect(page.locator('[data-testid="giving-regular-weeks"] input')).toHaveValue("12");
    await expect(page.locator('[data-testid="giving-lapsed-weeks"] input')).toHaveValue("3");
    await page.locator('[data-testid="giving-min-weeks"] input').fill("4");
    await page.locator('[data-testid="giving-regular-weeks"] input').fill("10");
    await page.locator('[data-testid="giving-lapsed-weeks"] input').fill("2");
    await page.getByRole("button", { name: "Save" }).click();

    const chip = page.locator('[data-testid^="sched-condition-"]').filter({ hasText: "Gave in 4 of the last 10 weeks, then nothing for 2 weeks" });
    await expect(chip).toBeVisible({ timeout: 10000 });
    await expect(chip).not.toContainText("$");

    const ctx = await request.newContext();
    const body = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
    const saved = ((await (await ctx.get(`${API_BASE}/doing/conditions/trigger/WKT00000004`, auth)).json()) || []).find((c: any) => c.field === "giving");
    expect(saved?.operator).toBe("lapsed");
    expect(JSON.parse(saved?.fieldData || "{}")).toEqual({ regularWeeks: 10, minWeeks: 4, lapsedWeeks: 2 });
    await ctx.dispose();

    await chip.locator(".MuiChip-deleteIcon").click();
    await expect(chip).toHaveCount(0, { timeout: 10000 });
  });

  // The feature: back-end mutation from ANY front-end fires the trigger.
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

  // Execution lifecycle: record on fire, park on failure, run-now bulk-applies, retry after step exists, pause-all parks queued.
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

    const runResult = await (await ctx.post(`${API_BASE}/doing/workflowTriggers/${trigger.id}/runNow`, { ...auth, data: {} })).json();
    expect(runResult.created).toBeGreaterThanOrEqual(1);

    // With a step in place, retry completes and drops the card.
    await ctx.post(`${API_BASE}/doing/workflowSteps`, { ...auth, data: [{ workflowId: wf.id, name: "Intake", sort: 1 }] });
    const retried = await (await ctx.post(`${API_BASE}/doing/workflowTriggers/executions/${mine.id}/retry`, { ...auth, data: {} })).json();
    expect(retried.status).toBe("success");
    const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/${wf.id}`, auth)).json();
    expect((board.cards || []).some((c: any) => c.associatedWithId === person.id)).toBeTruthy();

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

  // "Add again after their card is closed": no second open card, but a new one once the first is closed.
  test("repeat after close re-adds a person only once their card is closed", async () => {
    const ctx = await request.newContext();
    const body = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };

    const wf = (await (await ctx.post(`${API_BASE}/doing/workflows`, { ...auth, data: [{ name: "Zacchaeus Repeat WF", active: true }] })).json())[0];
    await ctx.post(`${API_BASE}/doing/workflowSteps`, { ...auth, data: [{ workflowId: wf.id, name: "Intake", sort: 1 }] });
    const person = (await (await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ name: { first: "Zelda", last: "Zacchaeus" }, membershipStatus: "Member", contactInfo: {} }] })).json())[0];
    const touch = () => ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ id: person.id, name: { first: "Zelda", last: "Zacchaeus" }, membershipStatus: "Member", contactInfo: {} }] });
    const openCards = async () => ((await (await ctx.get(`${API_BASE}/doing/tasks/board/${wf.id}`, auth)).json()).cards || []).filter((c: any) => c.associatedWithId === person.id);

    // Turn the option on from the trigger dialog.
    await page.goto(`/serving/tasks/workflows/${wf.id}`);
    await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
    await page.locator('[data-testid="board-triggers-tab"]').click();
    await page.locator('[data-testid="add-event-trigger-button"]').click();
    await page.locator('[data-testid="trigger-name"] input').fill("Zacchaeus Repeat Trigger");
    await page.locator('[data-testid="trigger-event-select"]').click();
    await page.getByRole("option", { name: /Person.*Updated/ }).click();
    const repeat = page.locator('[data-testid="trigger-repeat-after-close"] input');
    await expect(repeat).not.toBeChecked();
    await repeat.check();
    // It only applies with "Only once per person" on.
    await page.locator('[data-testid="trigger-once"] input').uncheck();
    await expect(page.locator('[data-testid="trigger-repeat-after-close"]')).toHaveCount(0);
    await page.locator('[data-testid="trigger-once"] input').check();
    await expect(repeat).toBeChecked();
    await page.locator('[data-testid="save-trigger-button"]').click();

    const row = page.locator("li").filter({ hasText: "Zacchaeus Repeat Trigger" });
    await expect(row).toBeVisible({ timeout: 10000 });
    const trigger = ((await (await ctx.get(`${API_BASE}/doing/workflowTriggers/workflow/${wf.id}`, auth)).json()) || []).find((t: any) => t.name === "Zacchaeus Repeat Trigger");
    expect(trigger?.allowRepeatAfterClose).toBeTruthy();

    // Reopening the trigger shows the saved choice.
    await page.locator(`[data-testid="event-trigger-row-${trigger.id}"]`).click();
    await expect(page.locator('[data-testid="trigger-repeat-after-close"] input')).toBeChecked();
    await page.getByRole("button", { name: "Cancel" }).click();

    await touch();
    await expect.poll(async () => (await openCards()).length, { timeout: 10000 }).toBe(1);
    const first = (await openCards())[0];
    // While that card is open, another update does not add a second one.
    await touch();
    expect((await openCards()).length).toBe(1);

    // Once it is closed, the next update adds a new card.
    await ctx.post(`${API_BASE}/doing/tasks/${first.id}/complete`, { ...auth, data: {} });
    await expect.poll(async () => (await openCards()).length, { timeout: 10000 }).toBe(0);
    await touch();
    await expect.poll(async () => (await openCards()).map((c: any) => c.id), { timeout: 10000 }).toEqual([expect.not.stringContaining(first.id)]);

    for (const c of await openCards()) await ctx.post(`${API_BASE}/doing/tasks/${c.id}/complete`, { ...auth, data: {} });
    if (trigger?.id) await ctx.delete(`${API_BASE}/doing/workflowTriggers/${trigger.id}`, auth);
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

// Run now on the Triggers tab must refresh the board count, and Execution History
// shows the run in the viewer's local time, not the UTC clock time.
test.describe("Serving Management - Event Triggers Run now", () => {
  const TZ = "America/Chicago";
  test.use({ timezoneId: TZ, locale: "en-US" });

  test("Run now refreshes the board count and lists the run in local time", async ({ page }) => {
    const ctx = await request.newContext();
    const body = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };

    const wf = (await (await ctx.post(`${API_BASE}/doing/workflows`, { ...auth, data: [{ name: "Zacchaeus Run Now WF", active: true }] })).json())[0];
    await ctx.post(`${API_BASE}/doing/workflowSteps`, { ...auth, data: [{ workflowId: wf.id, name: "Intake", sort: 1 }] });
    // Person exists before the trigger, so only Run now can add them.
    const person = (await (await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ name: { first: "Zebulon", last: "Zacchaeus" }, membershipStatus: "Zacchaeus1380", contactInfo: {} }] })).json())[0];
    const conditions = JSON.stringify({ type: "group", conjunction: "AND", children: [{ type: "condition", field: "person.membershipStatus", operator: "=", value: "Zacchaeus1380" }] });
    const trigger = (await (await ctx.post(`${API_BASE}/doing/workflowTriggers`, { ...auth, data: [{ name: "Zacchaeus Run Now Trigger", triggerKind: "event", eventType: "person.created", workflowId: wf.id, conditions, oncePerSubject: true, active: true }] })).json())[0];

    try {
      await page.goto(`/serving/tasks/workflows/${wf.id}`);
      await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
      await page.locator('[data-testid="board-triggers-tab"]').click();
      await expect(page.getByText(/1 steps? · 0 cards/)).toBeVisible({ timeout: 10000 });

      const startedAt = new Date();
      await page.locator(`[data-testid="run-now-trigger-${trigger.id}"]`).click();
      await expect(page.locator('[data-testid="run-now-result"]')).toBeVisible({ timeout: 10000 });
      const finishedAt = new Date();

      // No reload: the board count updates from the Run now callback.
      await expect(page.getByText(/1 steps? · 1 cards?/)).toBeVisible({ timeout: 10000 });

      const row = page.locator('[data-testid^="execution-row-"]').first();
      await expect(row).toBeVisible({ timeout: 10000 });
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
      const expectedTimes = [fmt.format(startedAt), fmt.format(finishedAt)].map((t) => t.replace(/\u202f/g, " "));
      const whenText = (await row.locator("td").first().innerText()).replace(/\u202f/g, " ");
      expect(expectedTimes.some((t) => whenText.includes(t)), `"${whenText}" should show ${expectedTimes.join(" or ")}`).toBeTruthy();
    } finally {
      const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/${wf.id}`, auth)).json();
      for (const c of board.cards || []) await ctx.post(`${API_BASE}/doing/tasks/${c.id}/complete`, { ...auth, data: {} });
      await ctx.delete(`${API_BASE}/doing/workflowTriggers/${trigger.id}`, auth);
      await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
      await ctx.delete(`${API_BASE}/membership/people/${person.id}`, auth);
      await ctx.dispose();
    }
  });
});
