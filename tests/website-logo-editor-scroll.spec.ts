import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateTo } from "./helpers/navigation";

// Issue #997: the ImageEditor renders above the Logo & Branding card. Clicking an
// "Edit ... Logo" button after scrolling down left the editor off-screen, so nothing
// appeared to happen until the user scrolled back up.
const LOGO_BUTTONS = ["logoLight", "logoDark", "ogImage", "favicon_400x400"];

const openLogoSection = async (page: import("@playwright/test").Page) => {
  await navigateTo(page, "appearance");
  await page.locator('[data-testid="style-option-logo"]').click();
  await expect(page.locator('[data-testid="save-appearance-button"]')).toBeVisible({ timeout: 10000 });
};

test.describe("issue-997 logo editor scrolls into view", () => {
  for (const name of LOGO_BUTTONS) {
    test(`${name} editor is visible immediately after clicking its Edit button`, async ({ page }) => {
      await login(page);
      await openLogoSection(page);

      const button = page.locator(`[data-testid="${name}-button"]`);
      await button.scrollIntoViewIfNeeded();
      // Pin the button to the top of the viewport so the editor's insertion point is above it.
      await button.evaluate((el) => el.scrollIntoView({ block: "start" }));
      await button.click();

      const editor = page.locator("#cropperBox");
      await expect(editor).toBeVisible({ timeout: 10000 });

      const viewportHeight = page.viewportSize()!.height;
      await expect.poll(async () => (await editor.boundingBox())?.y ?? -9999, { timeout: 10000 })
        .toBeGreaterThanOrEqual(0);
      const box = (await editor.boundingBox())!;
      expect(box.y, "editor top must be inside the viewport").toBeLessThan(viewportHeight);
    });
  }
});
