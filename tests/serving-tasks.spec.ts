import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1259: workflow "Send email" bell notifications were saved as tasks pointing at the
// email template id, so clicking one opened /serving/tasks/<templateId> and the page crashed.

test("task link to something that is not a task shows Task not found", async ({ page }) => {
  await page.goto("/serving/tasks/ETP00000001");
  await expect(page.getByText("Task not found")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Cannot read properties of undefined/)).toHaveCount(0);
});
