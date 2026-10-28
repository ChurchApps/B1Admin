import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1259: workflow "Send email" bell notifications were saved as tasks pointing at the
// email template id, so clicking one opened /serving/tasks/<templateId> and the page crashed.

test("task link to something that is not a task shows Task not found", async ({ page }) => {
  await page.goto("/serving/tasks/ETP00000001");
  await expect(page.getByText("Task not found")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Cannot read properties of undefined/)).toHaveCount(0);
});

// Issue #1407: a hand-made task had no way to get a due date.
test("a hand-made task can be given a due date", async ({ page }) => {
  await page.goto("/serving/tasks");
  await page.locator('[data-testid="add-task-button"]').click();
  await expect(page.getByLabel("Due date")).toBeVisible({ timeout: 15000 });

  await page.goto("/serving/tasks/TSK00000001");
  const due = page.locator('[data-testid="task-due-input"] input');
  await expect(due).toBeVisible({ timeout: 15000 });
  await due.fill("2030-01-15");
  await due.blur();
  await page.reload();
  await expect(page.locator('[data-testid="task-due-input"] input')).toHaveValue("2030-01-15", { timeout: 15000 });
});
