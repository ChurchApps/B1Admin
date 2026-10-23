import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// #1339: the search bar must find setup tasks by the words people use.
test.describe("Command palette setup terms (#1339)", () => {
  const search = async (page: any, q: string) => {
    await page.goto("/");
    await page.getByTestId("command-palette-open").click();
    const palette = page.getByTestId("command-palette");
    await palette.getByRole("textbox").fill(q);
    return palette;
  };

  test("church logo finds Add Your Church Logo", async ({ page }) => {
    const palette = await search(page, "church logo");
    await expect(palette.getByRole("button", { name: /Add Your Church Logo/ })).toBeVisible();
  });

  test("qr finds QR guest registration on the B1 CheckIn page", async ({ page }) => {
    const palette = await search(page, "qr");
    await expect(palette.getByRole("button", { name: /QR guest registration/i })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/mobile\/checkin/);
  });

  test("b1 checkin goes to the B1 CheckIn page", async ({ page }) => {
    const palette = await search(page, "b1 checkin");
    await expect(palette.locator(".om-hit").first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/mobile\/checkin$/);
  });
});
