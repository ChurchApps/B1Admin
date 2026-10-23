import { siteTest as test, expect } from "./helpers/test-fixtures";

// Issue #1340: the website editor didn't load the live site's section styles, so a photo hero
// with light text showed dark text over a tiled image, and the Pages count included the group
// pages hidden inside the collapsed Groups row.
test.describe("Issue #1340 website editor and pages list", () => {
  test("pages count matches the rows listed", async ({ page }) => {
    const table = page.getByRole("region", { name: "Pages" }).locator("table");
    await expect(table.getByText("/about", { exact: true })).toBeVisible({ timeout: 15000 });
    const rows = await table.locator("tbody tr").count();
    await expect(page.getByText(/^\d+ pages$/)).toHaveText(`${rows} pages`);
  });

  test("editor hero with a photo background matches the live site", async ({ page }) => {
    const editBtn = page.locator('[data-testid="edit-content-button"]').first();
    await expect(editBtn).toBeVisible({ timeout: 15000 });
    await editBtn.click();

    const hero = page.locator(".section.sectionBG.sectionDark").first();
    await expect(hero).toBeVisible({ timeout: 15000 });
    await expect(hero).toHaveCSS("background-size", "cover");
    await expect(hero.getByText("Join us this Sunday", { exact: false })).toHaveCSS("color", "rgb(238, 238, 238)");
  });
});
