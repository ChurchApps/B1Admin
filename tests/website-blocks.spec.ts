import { siteTest as test, expect } from "./helpers/test-fixtures";
import { navigateTo, navigateToSite } from "./helpers/navigation";

test.describe("Website blocks and section settings", () => {
  test.describe.configure({ retries: 0 });

  // An Element(s) block has no real section, so the editor must not offer section settings for it.
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

  // A rejected section save must keep the editor open and show why, not close silently.
  test("failed section save keeps the editor open and shows the error", async ({ page }) => {
    const rejection = "Section save rejected by server";

    await navigateToSite(page);
    await page.getByTestId("edit-content-button").first().click();
    const sectionWrapper = page.locator(".sectionEditWrapper").first();
    await expect(sectionWrapper).toBeVisible({ timeout: 15000 });
    await sectionWrapper.hover();
    await sectionWrapper.getByTestId("section-toolbar-settings").click();
    const card = page.getByTestId("edit-section-inputbox");
    await expect(card).toBeVisible({ timeout: 10000 });

    await page.route(
      (url) => url.pathname.endsWith("/sections"),
      async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ errors: [rejection] }) });
      }
    );

    const post = page.waitForResponse((r) => r.url().endsWith("/sections") && r.request().method() === "POST", { timeout: 15000 });
    await card.getByRole("button", { name: "Save", exact: true }).click();
    expect((await post).status()).toBe(500);

    await expect(card).toBeVisible();
    await expect(card.getByText(rejection, { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
