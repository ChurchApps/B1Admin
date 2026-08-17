import { settingsTest as test, expect } from "./helpers/test-fixtures";

// Actual workflow lives in B1Transfer app; here we only verify entry-point button.
test.describe("Settings — Import/Export entry point", () => {
  test("shows the Import/Export button on the Settings page", async ({ page }) => {
    const button = page.getByRole("link", { name: "Import/Export" });
    await expect(button).toBeVisible({ timeout: 15000 });
  });

  test("Import/Export button targets transfer.b1.church with auth params", async ({ page }) => {
    const button = page.getByRole("link", { name: "Import/Export" });
    const href = await button.getAttribute("href") || "";
    expect(href).toContain("transfer.b1.church/login");
    expect(href).toMatch(/[?&]churchId=/);
    expect(href).toContain("#jwt=");
    expect(href).not.toMatch(/[?&]jwt=/);
  });

  test("Import/Export button opens in a new tab", async ({ page }) => {
    const button = page.getByRole("link", { name: "Import/Export" });
    await expect(button).toHaveAttribute("target", "_blank");
    await expect(button).toHaveAttribute("rel", /noreferrer.*noopener|noopener.*noreferrer/);
  });
});
