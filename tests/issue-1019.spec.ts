import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1019: Plans breadcrumb on a plan type / plan went to /serving (My Work)
// because Authenticated.tsx redirects /serving → /serving/tasks.

test("Plans breadcrumb goes to the plans list, not My Work", async ({ page }) => {
  await page.goto("/serving/planTypes/PLT00000001");
  await expect(page.locator(".MuiBreadcrumbs-root").getByRole("button", { name: /^Plans$/ })).toBeVisible({ timeout: 15000 });

  await page.locator(".MuiBreadcrumbs-root").getByRole("button", { name: /^Plans$/ }).click();
  await expect(page).toHaveURL(/\/serving\/plans(\/?$|\?)/, { timeout: 15000 });
  await expect(page).not.toHaveURL(/\/serving\/tasks/);

  await page.goto("/serving/plans/PLA00000001");
  await expect(page.locator(".MuiBreadcrumbs-root").getByRole("button", { name: /^Plans$/ })).toBeVisible({ timeout: 15000 });
  await page.locator(".MuiBreadcrumbs-root").getByRole("button", { name: /^Plans$/ }).click();
  await expect(page).toHaveURL(/\/serving\/plans(\/?$|\?)/, { timeout: 15000 });
  await expect(page).not.toHaveURL(/\/serving\/tasks/);
});
