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

  test("Create a group and Create a page wizards are not titled as the first one", async ({ page }) => {
    await page.goto("/");
    const runWizard = async (search: string, field: string) => {
      await page.getByTestId("command-palette-open").click();
      const palette = page.getByTestId("command-palette");
      await palette.getByRole("textbox").fill(search);
      await expect(palette.getByRole("button", { name: new RegExp(search) })).toBeVisible();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(field).first()).toBeVisible({ timeout: 10000 });
      return dialog;
    };

    const groupDialog = await runWizard("Create a group", "Group Name");
    await expect(groupDialog).toContainText("Create a Group");
    await expect(groupDialog).not.toContainText("First Group");
    await page.keyboard.press("Escape");
    await expect(groupDialog).toHaveCount(0);

    const pageDialog = await runWizard("Create a page", "Page Title");
    await expect(pageDialog).toContainText("Create a Page");
    await expect(pageDialog).not.toContainText("first page");
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

  const searchPalette = async (page: any, q: string) => {
    await page.goto("/");
    await page.getByTestId("command-palette-open").click();
    const palette = page.getByTestId("command-palette");
    await palette.getByRole("textbox").fill(q);
    return palette;
  };

  test("church logo finds Add Your Church Logo", async ({ page }) => {
    const palette = await searchPalette(page, "church logo");
    await expect(palette.getByRole("button", { name: /Add Your Church Logo/ })).toBeVisible();
  });

  test("qr finds QR guest registration on the B1 CheckIn page", async ({ page }) => {
    const palette = await searchPalette(page, "qr");
    await expect(palette.getByRole("button", { name: /QR guest registration/i })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/mobile\/checkin/);
  });

  test("b1 checkin goes to the B1 CheckIn page", async ({ page }) => {
    const palette = await searchPalette(page, "b1 checkin");
    await expect(palette.locator(".om-hit").first()).toHaveAccessibleName(/check-?in/i);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/mobile\/checkin$/);
  });
});

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
