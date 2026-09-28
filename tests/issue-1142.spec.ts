import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

// Issue #1142: with no earlier plan that has a lesson, the Associate Lesson picker
// defaulted to the first provider in registry order (Dropbox, which is not linked)
// and showed "Provider Not Linked" instead of opening on Lessons.church.
// Demo plan type PLT00000002 (Wednesday Night Service) has no plans and the demo
// church has no linked providers.
test.describe("issue-1142 lesson picker default provider", () => {
  test("Bulk Schedule's Select Lesson opens on Lessons.church", async ({ page }) => {
    await login(page);
    await page.goto("/serving/planTypes/PLT00000002");

    await page.getByRole("button", { name: "Schedule Lesson" }).first().click();
    await page.getByRole("menuitem", { name: "Bulk Schedule" }).click();
    await page.getByRole("button", { name: "Select Lesson" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Associate Lesson" })).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator(".MuiChip-filled")).toHaveText("Lessons.church", { timeout: 10000 });
    await expect(dialog.getByText("Provider Not Linked")).toHaveCount(0);
  });
});
