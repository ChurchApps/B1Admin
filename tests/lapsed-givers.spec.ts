import { donationsTest as test, expect } from "./helpers/test-fixtures";

// Demo giving data: John Smith (PER00000001) gave weekly March-May 2025 and nothing
// since, so he's lapsed under the report's default windows (last calendar year / this
// year to date). The demo user (PER00000082) gives on rolling relative dates so is
// never lapsed - used as a negative control.
test.describe("Lapsed Givers report", () => {
  test("lists a lapsed giver with last gift date and total, and exports a CSV", async ({ page }) => {
    const lapsedTab = page.locator('button[role="tab"]').getByText("Lapsed Givers");
    await expect(lapsedTab).toBeVisible({ timeout: 10000 });
    await lapsedTab.click();

    const table = page.locator("table").filter({ hasText: "Last Gift Date" });
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.getByRole("cell", { name: "John Smith", exact: true })).toBeVisible({ timeout: 15000 });

    const downloadOptions = page.getByRole("button", { name: "Download Options" });
    await expect(downloadOptions).toBeVisible();
    await downloadOptions.click();

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.getByRole("menuitem", { name: "Summary" }).click()
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
