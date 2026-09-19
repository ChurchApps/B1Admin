import { siteTest as test, expect } from "./helpers/test-fixtures";

// The "choose a section layout" dialog resolves its heading, its category chips and every
// template name through concatenated keys, e.g.
// Locale.label("site.sectionTemplates." + template.key). With those keys missing from
// en.json, Locale.label echoes the key, so the dialog would list
// "site.sectionTemplates.heroCentered" instead of "Centered Hero".
test.describe("Section template picker", () => {
  test("section layout dialog renders English names, not placeholder keys", async ({ page }) => {
    const editBtn = page.locator('[data-testid="edit-content-button"]').first();
    await expect(editBtn).toBeVisible({ timeout: 15000 });
    await editBtn.click();

    const divider = page.locator('[data-testid="add-section-divider"]').first();
    await expect(divider).toBeVisible({ timeout: 15000 });
    await divider.hover();
    await divider.locator('[data-testid="add-section-divider-button"]').click();

    // The dialog is up once the blank-section card is on screen.
    await expect(page.locator('[data-testid="template-blank"]')).toBeVisible({ timeout: 15000 });

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Choose a Section Layout")).toBeVisible();
    await expect(dialog.getByText("Call to Action", { exact: true }).first()).toBeVisible();

    // Category chips.
    await expect(dialog.getByText("Hero", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Giving", { exact: true })).toBeVisible();

    // Individual template names.
    await expect(dialog.getByText("Centered Hero", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Latest Sermons", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Meet the Team", { exact: true })).toBeVisible();

    // No raw i18n key may survive into the dialog.
    await expect(dialog.getByText(/site\.sectionTemplates\./)).toHaveCount(0);
  });
});
