import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { recoverFromViteError } from "./helpers/fixtures";

// Issue 1380: Run now on the Triggers tab left the board's card count stale, and
// Execution History showed the UTC clock time as if it were local.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
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

    const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/${wf.id}`, auth)).json();
    const cardCount = (board.cards || []).length;
    expect(cardCount).toBe(1);
    await expect(page.getByText(/1 steps? · 1 cards?/)).toBeVisible({ timeout: 10000 });

    const row = page.locator('[data-testid^="execution-row-"]').first();
    await expect(row).toBeVisible({ timeout: 10000 });
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
    const expectedTimes = [fmt.format(startedAt), fmt.format(finishedAt)];
    const whenText = (await row.locator("td").first().innerText()).replace(/\u202f/g, " ");
    expect(expectedTimes.map((t) => t.replace(/\u202f/g, " ")).some((t) => whenText.includes(t)), `"${whenText}" should show ${expectedTimes.join(" or ")}`).toBeTruthy();
  } finally {
    const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/${wf.id}`, auth)).json();
    for (const c of board.cards || []) await ctx.post(`${API_BASE}/doing/tasks/${c.id}/complete`, { ...auth, data: {} });
    await ctx.delete(`${API_BASE}/doing/workflowTriggers/${trigger.id}`, auth);
    await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
    await ctx.delete(`${API_BASE}/membership/people/${person.id}`, auth);
    await ctx.dispose();
  }
});
