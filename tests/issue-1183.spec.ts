import { servingTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1183: a new plan copied from the previous plan lost that plan's notes.
test("a plan copied from the previous plan keeps its notes", async ({ page }) => {
  await page.goto("/serving/planTypes/PLT00000001");
  const addBtn = page.getByTestId("add-plan-button").first();
  await expect(addBtn).toBeVisible({ timeout: 15000 });
  await addBtn.click();
  await expect(page.getByTestId("copy-mode-select")).toBeVisible({ timeout: 10000 });

  const copyPost = page.waitForResponse(r => r.url().includes("/plans/copy/") && r.request().method() === "POST", { timeout: 15000 });
  await page.locator("button").getByText("Save").click();
  const newPlan = await (await copyPost).json();

  await page.goto("/serving/plans/" + newPlan.id);
  await expect(page.getByTestId("plan-notes-input").locator("textarea").first()).toHaveValue("Upcoming worship services including special seasonal service", { timeout: 15000 });
});
