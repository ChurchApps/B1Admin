import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { recoverFromViteError } from "./helpers/fixtures";

// Issue #1243: Add condition on a scheduled rule crashed with "Box is not defined".

test("Add condition on a scheduled rule opens the condition editor", async ({ page }) => {
  await login(page);
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
