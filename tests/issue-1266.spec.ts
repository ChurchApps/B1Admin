import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { login } from "./helpers/auth";

const luminanceOf = async (el: Locator) => {
  const color = await el.evaluate((node) => getComputedStyle(node).color);
  const [r, g, b] = (color.match(/\d+/g) || []).map(Number);
  return { color, luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
};

// Issue 1266: in dark mode the batch printout inherits the dark theme's light text,
// and the browser drops the dark background on paper, so the page prints near-white.
test.describe("Issue 1266 - batch printout in dark mode", () => {
  test.describe.configure({ retries: 0 });

  test("prints batch text in a dark color", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("b1admin-theme-mode", "dark"));
    await login(page);
    await page.emulateMedia({ media: "print" });
    await page.goto("/donations/batches/print-all?start=2000-01-01&end=2100-01-01");

    const total = page.locator('[data-testid="batch-print-document"]').first().getByText("Batch Total", { exact: true });
    await expect(total).toBeVisible({ timeout: 15000 });

    const { color, luminance } = await luminanceOf(total);
    expect(luminance, "text color " + color).toBeLessThan(0.4);
  });

  test("prints calendar headings in a dark color", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("b1admin-theme-mode", "dark"));
    await login(page);
    await page.emulateMedia({ media: "print" });
    await page.goto("/calendars/CAL00000001");

    const label = page.locator(".print-area .rbc-toolbar-label");
    await expect(label).toBeVisible({ timeout: 15000 });
    const { color, luminance } = await luminanceOf(label);
    expect(luminance, "text color " + color).toBeLessThan(0.4);
  });
});
