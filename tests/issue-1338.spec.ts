import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { recoverFromViteError } from "./helpers/fixtures";

// Issue #1338: a new action is lost on the step's Save, the Send Email action never warns that
// the church's email isn't approved, and a template pick shows no busy state so it gets clicked twice.

const API_BASE = process.env.API_BASE || "http://localhost:8084";

async function apiAuth(ctx: any) {
  const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await loginRes.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

async function buildWorkflow() {
  const ctx = await request.newContext();
  const auth = await apiAuth(ctx);
  const wf = (await (await ctx.post(`${API_BASE}/doing/workflows`, { ...auth, data: [{ name: "Zacchaeus 1338 WF", active: true }] })).json())[0];
  const step = (await (await ctx.post(`${API_BASE}/doing/workflowSteps`, { ...auth, data: [{ workflowId: wf.id, name: "Greet", sort: 1 }] })).json())[0];
  return { ctx, auth, wf, step };
}

async function openStepEditor(page: any, workflowId: string, stepId: string) {
  await page.goto("/serving/tasks/workflows/" + workflowId);
  await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
  await page.locator(`[data-testid="edit-step-${stepId}"]`).click();
  await expect(page.locator('[data-testid="add-action-button"]')).toBeVisible({ timeout: 10000 });
}

test("the step's Save also saves a newly added action", async ({ page }) => {
  const { ctx, auth, wf, step } = await buildWorkflow();
  await openStepEditor(page, wf.id, step.id);
  await page.locator('[data-testid="add-action-button"]').click();
  await page.locator('[data-testid="action-days-0"] input').fill("3");
  await page.locator('[data-testid="step-save-button"]').click();
  await expect(page.locator('[data-testid="step-save-button"]')).toHaveCount(0, { timeout: 10000 });

  const actions = await (await ctx.get(`${API_BASE}/doing/workflowStepActions/step/${step.id}`, auth)).json();
  expect(actions.map((a: any) => a.actionType)).toEqual(["delay"]);
  expect(JSON.parse(actions[0].config).days).toBe(3);
  await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
  await ctx.dispose();
});

test("the Send Email action warns when the church's email isn't approved", async ({ page }) => {
  await page.route("**/emailTemplates/sendStatus", (route) => route.fulfill({ json: { approved: false, paused: false, remaining: 0, requested: false } }));
  const { ctx, auth, wf, step } = await buildWorkflow();
  await openStepEditor(page, wf.id, step.id);
  await page.locator('[data-testid="add-action-button"]').click();
  await page.locator('[data-testid="action-type-0"]').click();
  await page.getByRole("option", { name: "Send Email" }).click();
  await expect(page.locator('[data-testid="action-email-not-approved-0"]')).toBeVisible({ timeout: 10000 });
  await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
  await ctx.dispose();
});

test("creating from a template shows a busy state so it can't be picked twice", async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/workflows/fromTemplate", async (route) => { await held; await route.continue(); });
  await page.goto("/serving/tasks/workflows");
  await recoverFromViteError(page, page.locator('[data-testid="add-workflow-button"]'));
  await page.locator('[data-testid="add-workflow-button"]').click();
  await page.locator('[data-testid="add-workflow-template-newVisitor"]').click();
  await expect(page.locator('[data-testid="add-workflow-button"]')).toBeDisabled();
  release();
  await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/[\w-]+$/, { timeout: 15000 });
});
