import { settingsTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1180: typing a domain and clicking Save (without +) closed the panel and saved nothing.
const DOMAIN = "example-1180.org";

test("Save keeps a typed domain even when + was not clicked", async ({ page }) => {
  await page.locator('[data-testid="settings-section-domains"]').click();
  const section = page.locator('[data-testid="settings-domains"]');
  await expect(section).toBeVisible({ timeout: 15000 });

  await section.locator('[data-testid="small-button-edit"]').dispatchEvent("click");
  const input = section.locator('input[name="domainName"]');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(DOMAIN);
  await section.locator("button").getByText("Save").click();
  await expect(input).toHaveCount(0, { timeout: 10000 });
  await expect(section.getByText(DOMAIN)).toBeVisible({ timeout: 10000 });

  // Clean up so later runs start without the domain.
  await section.locator('[data-testid="small-button-edit"]').dispatchEvent("click");
  const row = section.locator("tr", { hasText: DOMAIN });
  await row.getByRole("button").click();
  await section.locator("button").getByText("Save").click();
  await expect(input).toHaveCount(0, { timeout: 10000 });
  await expect(section.getByText(DOMAIN)).toHaveCount(0, { timeout: 10000 });
});
