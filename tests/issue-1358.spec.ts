import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

// Issue #1358: the People columns dialog was titled "Filters" with an "Apply Filters"
// button though it only picks columns, and the daily group attendance report showed
// a raw "{groupName}" placeholder in its title.
test.describe("issue-1358 report and columns labels", () => {
  test("people columns dialog is labeled for columns, not filters", async ({ page }) => {
    await login(page);
    await page.goto("/people");
    await page.locator('[data-testid="columns-button"]').click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Select Columns" })).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
    await expect(dialog.getByText("Apply Filters")).toHaveCount(0);
  });

  test("daily group attendance report title has no unfilled placeholder", async ({ page }) => {
    await login(page);
    await page.goto("/reports/dailyGroupAttendance");
    await expect(page.getByText("Group attendance by day").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("{groupName}")).toHaveCount(0);
  });
});
