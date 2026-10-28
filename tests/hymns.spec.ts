import { openPrimaryNav } from "./helpers/navigation";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Hymns stays hidden until Jeremy reviews it. These pin the off switch.
test.describe("Hymns hidden", () => {
  test("jump menu has no Hymns entry", async ({ page }) => {
    await openPrimaryNav(page);
    const palette = page.getByTestId("command-palette");
    await expect(palette.getByRole("button", { name: "Dashboard", exact: true })).toBeVisible();
    await palette.getByRole("textbox").fill("Hymns");
    await expect(palette.getByRole("button", { name: "Dashboard", exact: true })).toHaveCount(0);
    await expect(palette.getByRole("button", { name: "Hymns", exact: true })).toHaveCount(0);
  });

  test("direct /hymns does not open the hymn editor", async ({ page }) => {
    await page.goto("/hymns");
    await expect(page.getByTestId("not-found")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Add hymn" })).toHaveCount(0);
  });
});
