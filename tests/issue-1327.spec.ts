import { siteTest as test, expect } from "./helpers/test-fixtures";
import { navigateTo } from "./helpers/navigation";

// Issue 1327: an Element(s) block has no real section. The editor used to offer
// the section settings gear anyway, and a background chosen there never came back.
test.describe("Issue 1327 - element block section settings", () => {
  test.describe.configure({ retries: 0 });

  test("element block does not offer section settings", async ({ page }) => {
    const blockName = "Zacchaeus Element Block";

    await navigateTo(page, "blocks");
    await page.getByTestId("add-block-button").click();
    await page.getByTestId("block-name-input").locator("input").fill(blockName);

    const blockPost = page.waitForResponse(
      (r) => r.url().includes("/content/blocks") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.locator("#blockDetailsBox").getByRole("button", { name: "Save", exact: true }).click();
    expect((await blockPost).ok()).toBeTruthy();

    const row = page.locator("tr").filter({ hasText: blockName }).first();
    await expect(row.getByText("Element(s)", { exact: true })).toBeVisible({ timeout: 10000 });
    await row.getByRole("link", { name: "Edit", exact: true }).click();
    await expect(page).toHaveURL(/\/site\/blocks\/[^/]+/);

    const section = page.locator(".sectionEditWrapper").first();
    await expect(section).toBeVisible({ timeout: 15000 });
    await section.hover();
    await expect(page.getByTestId("section-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("section-toolbar-settings")).toHaveCount(0);

    await section.dblclick();
    await expect(page.getByTestId("edit-section-inputbox")).toHaveCount(0);
  });
});
