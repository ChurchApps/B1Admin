import { settingsTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1419: removing two domains takes two slow writes (each waits on the
// proxy sync, ~10s), which outlasted the section's save timeout. The save landed but the
// editor stayed open and the list kept showing the old domains.
test.describe("issue-1419 domains editor closes after a slow save", () => {
  const DOMAINS = ["www.example-1419.org", "example-1419.org"];
  const SAVE_MS = 45000;
  // Prod/demo domain writes each wait on the Caddy sync (~10s). The local Api syncs fast,
  // so hold each domain write in the browser to match.
  const SYNC_MS = 8000;

  test("removing two domains closes the editor and clears the list", async ({ page }) => {
    test.setTimeout(180000);
    await page.route(/\/membership\/domains(\/|$)/, async (route) => {
      const method = route.request().method();
      if (method !== "DELETE" && method !== "POST") return route.continue();
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, SYNC_MS));
      await route.fulfill({ response });
    });
    await page.locator('[data-testid="settings-section-domains"]').click();
    const section = page.locator('[data-testid="settings-domains"]');
    await expect(section).toBeVisible({ timeout: 15000 });

    const input = section.locator('input[name="domainName"]');
    const save = () => section.locator("button").getByText("Save").click();
    const openEdit = async () => {
      await section.locator('[data-testid="small-button-edit"]').dispatchEvent("click");
      await expect(input).toBeVisible({ timeout: 10000 });
    };

    // Add both domains in one save.
    await openEdit();
    for (const name of DOMAINS) {
      // reset-demo keeps domains, so a run that died mid-way leaves them behind.
      if (await section.getByText(name, { exact: true }).count()) continue;
      await input.fill(name);
      await section.getByRole("button", { name: "Add" }).click();
    }
    await save();
    await expect(input).toHaveCount(0, { timeout: SAVE_MS });
    for (const name of DOMAINS) await expect(section.getByText(name, { exact: true })).toBeVisible();

    // Remove both: two DELETEs, each slow.
    await openEdit();
    const deleteButtons = section.getByRole("button", { name: "Delete" });
    while (await deleteButtons.count()) await deleteButtons.first().click();
    await save();

    await expect(input).toHaveCount(0, { timeout: SAVE_MS });
    for (const name of DOMAINS) await expect(section.getByText(name, { exact: true })).toHaveCount(0, { timeout: 15000 });
    await expect(section.getByText("No custom domains")).toBeVisible({ timeout: 15000 });
  });
});
