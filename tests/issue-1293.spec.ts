import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1293: the page editor preview ignored the Appearance fonts, so headings showed in the
// admin's default font instead of the site's heading font (Poppins in the demo seed).

test("page editor preview uses the Appearance heading font", async ({ page }) => {
  await page.goto("/site/pages/PAG00000001");
  const heading = page.locator('[data-testid="preview-desktop"]').locator("h1, h2, h3").first();
  await expect(heading).toBeVisible({ timeout: 15000 });
  await expect(heading).toHaveCSS("font-family", /Poppins/);
});
