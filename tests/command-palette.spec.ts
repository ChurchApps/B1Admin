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

  test("tasks alias opens My Work", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("command-palette-open").click();
    const palette = page.getByTestId("command-palette");
    await palette.getByRole("textbox").fill("tasks");
    await expect(palette.getByRole("button", { name: /My Work/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/serving\/tasks/);
  });

  test("opens with the current section expanded and keeps one section open at a time", async ({ page }) => {
    await page.goto("/donations/batches");
    await page.getByTestId("command-palette-open").click();
    const palette = page.getByTestId("command-palette");
    const expanded = palette.locator('.om-hit[aria-expanded="true"]');
    await expect(expanded).toHaveCount(1);
    await expect(expanded).toContainText("Donations");
    await expect(palette.locator(".om-hit.active")).toHaveText(/Batches$/);
    await expect(palette.locator('.om-hit[aria-current="page"]')).toHaveText(/Batches$/);

    await page.keyboard.press("ArrowLeft");
    await expect(expanded).toHaveCount(0);
    await expect(palette.locator(".om-hit.active")).toContainText("Donations");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowRight");
    await expect(expanded).toHaveCount(1);
    await expect(expanded).toContainText("People");

    await palette.locator(".om-hit", { hasText: "Donations" }).first().click();
    await expect(expanded).toHaveCount(1);
    await expect(expanded).toContainText("Donations");
    await palette.locator(".om-child", { hasText: "Funds" }).click();
    await expect(page).toHaveURL(/\/donations\/funds$/);
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
