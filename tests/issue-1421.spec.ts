import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { recoverFromViteError } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue #1421: a card on My Work can be removed right there, without hunting for it on the board.
test("a My Work card opens its detail panel with Remove card", async ({ browser }) => {
  const API_BASE = process.env.API_BASE || "http://localhost:8084";
  const ctx = await request.newContext();
  const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await loginRes.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  const auth = { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
  const added = await (await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: "WFL00000001", associatedWith: { type: "person", id: "PER00000080", label: "Donald Clark" } } })).json();
  const assigned = await ctx.post(`${API_BASE}/doing/tasks/${added.id}/reassign`, { ...auth, data: { assignedToType: "person", assignedToId: "PER00000082", assignedToLabel: "Demo User" } });
  expect(assigned.ok()).toBeTruthy();

  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  await login(page);
  await page.goto("/serving/tasks");
  await recoverFromViteError(page, page.locator('[data-testid="my-cards-list"]'));
  const myCard = page.locator(`[data-testid="my-cards-list"] [data-testid="workflow-card-${added.id}"]`);
  await expect(myCard).toBeVisible({ timeout: 15000 });

  await myCard.click();
  const drawer = page.locator('[data-testid="workflow-card-drawer"]');
  await expect(drawer).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/serving\/tasks$/);
  await drawer.locator('[data-testid="card-remove-button"]').click();
  const dialog = page.locator('[data-testid="card-remove-confirm"]');
  await dialog.getByRole("button", { name: "Remove card" }).click();
  await expect(drawer).toHaveCount(0, { timeout: 10000 });
  await expect(myCard).toHaveCount(0, { timeout: 10000 });

  await context.close();
  await ctx.dispose();
});
