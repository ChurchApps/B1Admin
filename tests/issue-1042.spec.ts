import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue #1042: in dark mode the position category dropdown (react-select) keeps its default
// light menu, so the option text — which inherits the dark theme's near-white body color —
// renders white on white and the unselected categories are invisible.
const DEMO_PLAN = "/serving/plans/PLA00000001";

// Contrast ratio between an element's text color and the first opaque background behind it.
const contrastRatio = (handle: import("@playwright/test").Locator) =>
  handle.evaluate((el) => {
    const parse = (value: string): number[] | null => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((p) => parseFloat(p.trim()));
      return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
    };
    const luminance = (rgb: number[]) => {
      const channel = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
    };
    const fg = parse(getComputedStyle(el).color);
    let node: HTMLElement | null = el as HTMLElement;
    let bg: number[] | null = null;
    while (node) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed[3] !== 0) { bg = parsed; break; }
      node = node.parentElement;
    }
    if (!fg || !bg) return 0;
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });

test.describe("issue-1042 position category dropdown in dark mode", () => {
  test.describe.configure({ retries: 0 });

  test("unselected category options are readable against the menu background", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    await context.addInitScript(() => window.localStorage.setItem("b1admin-theme-mode", "dark"));
    const page = await context.newPage();
    try {
      await login(page);
      await page.goto(DEMO_PLAN);
      await expect(page.locator("body.dark-theme")).toHaveCount(1, { timeout: 15000 });

      await page.locator(".positionsTable").getByText("Worship Leader").first().click();
      await expect(page.locator('[id="name"]')).toHaveValue("Worship Leader", { timeout: 15000 });

      await page.locator(".comboBox").click();
      const option = page.getByRole("option", { name: "Technical", exact: true });
      await expect(option).toBeVisible({ timeout: 10000 });

      expect(await contrastRatio(option)).toBeGreaterThan(4.5);
    } finally {
      await context.close();
    }
  });
});
