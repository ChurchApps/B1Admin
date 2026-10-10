import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToForms } from "./helpers/navigation";

// ChurchAppsSupport#1225: "Add submitters to a group" showed blank instead of "None" when no group is chosen.
test("Add submitters to a group shows None when no group is chosen", async ({ page }) => {
  await navigateToForms(page);
  await page.locator('[data-testid="add-form-button"]').click();
  await page.locator('[data-testid="auto-create-person-checkbox"] input').check();
  const groupSelect = page.locator('[data-testid="form-group-select"]');
  await expect(groupSelect).toBeVisible({ timeout: 10000 });
  await expect(groupSelect.getByRole("combobox")).toHaveText("None");
});
