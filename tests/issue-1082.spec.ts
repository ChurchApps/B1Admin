import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

// Issue #1082: raw i18n keys leak into the UI anywhere a label key is built from a
// prefix plus a variable. Locale.label() returns the key itself when en.json has no
// entry, and /locale-sync only harvests static string literals, so every key reached
// through `const l = (k) => Locale.label("prefix." + k)` was never added.
//
// Reported sample: Serving > Plans > Edit Plan Type renders the reminders accordion
// header as "plans.planTypeReminders.title" instead of "Reminders".
test.describe("Issue #1082 - Edit Plan Type shows English, not raw locale keys", () => {
  test("the reminders section of the Edit Plan Type dialog is localized", async ({ page }) => {
    await login(page);

    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });

    const row = page.locator("tr", { hasText: "Sunday Service" }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator('button[aria-label="Edit"]').click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Plan Type Details")).toBeVisible({ timeout: 10000 });

    // The defect: the accordion summary renders the literal key.
    await expect(dialog).not.toContainText("plans.planTypeReminders.");
    await expect(dialog.getByText("Reminders", { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
