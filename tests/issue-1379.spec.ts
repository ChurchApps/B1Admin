import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue 1379: on a phone, opening the Jump menu focused its search box and raised the soft keyboard over the menu.
test.describe("Command palette on a touch screen", () => {
  test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

  test("opening the menu does not focus the search box", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("command-palette-open").tap();
    const palette = page.getByTestId("command-palette");
    await expect(palette).toBeVisible();
    await expect(palette.locator(".om-hit").first()).toBeVisible();
    await expect(palette.getByRole("textbox")).not.toBeFocused();

    await palette.getByRole("textbox").tap();
    await expect(palette.getByRole("textbox")).toBeFocused();
  });
});
