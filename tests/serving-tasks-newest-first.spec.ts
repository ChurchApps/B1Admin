import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The Api returns tasks oldest first, cards soonest due first and board columns in arrival
// order; My Work and the workflow board show what just arrived on top.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const DEMO_USER = { id: "PER00000082", label: "Demo User" };

async function demoAuth() {
  const ctx = await request.newContext();
  const body = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { ctx, auth: { headers: { Authorization: "Bearer " + (uc?.jwt as string) } } };
}

test("My Work tasks table lists the newest task first", async ({ page }) => {
  const { ctx, auth } = await demoAuth();
  const ids: any[] = [];
  const stamp = Date.now();
  for (const title of [`Older ordering task ${stamp}`, `Newer ordering task ${stamp}`]) {
    const saved = await (await ctx.post(`${API_BASE}/doing/tasks`, {
      ...auth,
      data: [{ title, status: "Open", createdByType: "person", createdById: DEMO_USER.id, createdByLabel: DEMO_USER.label, assignedToType: "person", assignedToId: DEMO_USER.id, assignedToLabel: DEMO_USER.label }]
    })).json();
    ids.push(saved[0]);
  }

  await page.goto("/serving/tasks");
  const rows = page.locator('[data-testid="task-list"] tbody tr');
  await expect(rows.filter({ hasText: `Older ordering task ${stamp}` })).toBeVisible({ timeout: 15000 });
  await expect(rows.first()).toContainText(`Newer ordering task ${stamp}`);

  await ctx.post(`${API_BASE}/doing/tasks`, { ...auth, data: ids.map((t) => ({ ...t, status: "Closed" })) });
  await ctx.dispose();
});

test("My Cards lists the newest card first", async ({ page }) => {
  const { ctx, auth } = await demoAuth();
  // Call sets a due date, so the Api lists this card after Demo User's undated James Wilson card.
  const added = await (await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: "WFL00000001", stepId: "WFS00000002", associatedWith: { type: "person", id: "PER00000080", label: "Donald Clark" } } })).json();
  await ctx.post(`${API_BASE}/doing/tasks/${added.id}/reassign`, { ...auth, data: { assignedToType: "person", assignedToId: DEMO_USER.id, assignedToLabel: DEMO_USER.label } });

  await page.goto("/serving/tasks");
  const cards = page.locator('[data-testid="my-cards-list"] [data-testid^="workflow-card-"]');
  await expect(page.locator('[data-testid="my-cards-list"] [data-testid="workflow-card-TSK00000104"]')).toBeVisible({ timeout: 15000 });
  await expect(cards.first()).toHaveAttribute("data-testid", `workflow-card-${added.id}`);

  await ctx.post(`${API_BASE}/doing/tasks/${added.id}/remove`, { ...auth, data: {} });
  await ctx.dispose();
});

test("a workflow board column lists the newest card first", async ({ page }) => {
  // Greet holds Maria Rodriguez (arrived second) and John Smith (arrived first).
  await page.goto("/serving/tasks/workflows/WFL00000001");
  const column = page.locator('[data-testid="workflow-column-WFS00000001"]');
  await expect(column.locator('[data-testid="workflow-card-TSK00000101"]')).toBeVisible({ timeout: 15000 });
  // Other specs may add cards to Greet, so compare the two seeded cards rather than the top slot.
  const ids = await column.locator('[data-testid^="workflow-card-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids.indexOf("workflow-card-TSK00000102")).toBeGreaterThanOrEqual(0);
  expect(ids.indexOf("workflow-card-TSK00000102")).toBeLessThan(ids.indexOf("workflow-card-TSK00000101"));
});
