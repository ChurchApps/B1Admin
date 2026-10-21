import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1312: the Set up FreePlay wizard's Create & Continue opened the Plans page on the first ministry, not the new one.

test("FreePlay wizard opens the Plans page on the ministry it created", async ({ page }) => {
  // Demo data already has classrooms; with none listed the palette offers the wizard.
  await page.route(/\/planTypes(\?.*)?$/, (route) => (route.request().method() === "GET" ? route.fulfill({ json: [] }) : route.fallback()));
  const ministryName = "Issue1312 Ministry " + Date.now();

  await page.getByTestId("command-palette-open").click();
  const palette = page.getByTestId("command-palette");
  await palette.getByRole("textbox").fill("FreePlay");
  await palette.getByRole("button", { name: /FreePlay/ }).first().click();

  const dialog = page.getByRole("dialog", { name: "Set Up Your FreePlay Classroom" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Ministry Name").fill(ministryName);
  await dialog.getByLabel("Classroom Name").fill("Room 1");
  await dialog.getByRole("button", { name: "Create & Continue" }).click();

  await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
  await expect(page.getByRole("tab", { name: ministryName })).toHaveAttribute("aria-selected", "true", { timeout: 15000 });
  await expect(page.locator("#page-header-title")).toHaveText(ministryName);
});
