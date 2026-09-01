import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { SEED_PEOPLE, openPersonRow } from "./helpers/fixtures";

test.describe("Person data export", () => {
  test("downloads the full data packet from the person banner", async ({ page }) => {
    await openPersonRow(page, SEED_PEOPLE.DONALD);

    const exportButton = page.locator('[data-testid="export-person-data-button"]');
    await expect(exportButton).toBeVisible({ timeout: 10000 });

    const [download, response] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.waitForResponse((r) => r.url().includes("/gdpr/people/") && r.url().includes("/export") && r.status() === 200, { timeout: 15000 }),
      exportButton.click()
    ]);

    expect(download.suggestedFilename()).toMatch(/^person-data-.+\.json$/);

    const packet = await response.json();
    expect(packet.exportedAt).toBeTruthy();
    for (const key of ["person", "groups", "notes", "formSubmissions", "customFieldValues", "tasks", "subscriptions", "eventRsvps"]) {
      expect(packet).toHaveProperty(key);
    }
  });
});
