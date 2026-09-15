import { loggedInTest as test, expect } from "./helpers/test-fixtures";

test.describe("Command palette", () => {
  test("header field opens palette and jumps by alias", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("command-palette-open").click();
    const palette = page.getByTestId("command-palette");
    await expect(palette).toBeVisible();
    await palette.getByRole("textbox").fill("tithes");
    await expect(palette.getByRole("button", { name: "Donations" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/donations$/);
  });

  test("Ctrl+K finds a person and Escape closes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("command-palette-open")).toBeVisible();
    await page.locator("body").click({ position: { x: 5, y: 300 } });
    await page.keyboard.press("Control+k");
    const palette = page.getByTestId("command-palette");
    await palette.getByRole("textbox").fill("demo");
    await expect(palette.locator(".om-hit").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });
});
