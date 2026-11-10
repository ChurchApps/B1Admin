import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { personAddButton } from "./helpers/fixtures";

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

// Issue #1395: a to-do that is not about any person or group. "Associate with" used to be
// required and defaulted to the signed-in user; it is optional now and can be cleared.
test("a task can be created with no person or group", async ({ page }) => {
  await page.goto("/serving/tasks");
  await page.locator('[data-testid="add-task-button"]').click();
  const associate = page.locator('[data-testid="associate-with-input"] input');
  await expect(associate).toBeVisible({ timeout: 15000 });
  await expect(associate).toHaveValue("");

  await page.locator('[data-testid="assign-to-input"]').click();
  await page.locator('[name="personAddText"]').fill("Demo User");
  await page.locator('[data-testid="search-button"]').click();
  await personAddButton(page, "Demo User").click();

  await page.locator('[name="title"]').fill("Order more coffee");
  await page.locator("button").getByText("Save").click();

  const row = page.locator('[data-testid="task-list"] tr', { hasText: "Order more coffee" });
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row).toContainText("Not specified");
});

test("a task's person or group can be cleared", async ({ page }) => {
  await page.goto("/serving/tasks/TSK00000001");
  await page.locator('[data-testid="task-associate"]').click();
  await page.getByRole("button", { name: "No person or group" }).click();
  const label = page.locator('[data-testid="task-associated-label"]');
  await expect(label).toHaveText("Not specified", { timeout: 15000 });
  await page.reload();
  await expect(label).toHaveText("Not specified", { timeout: 15000 });
});
