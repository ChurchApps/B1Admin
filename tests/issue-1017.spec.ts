import { test as base, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { openSeedGroup } from "./helpers/fixtures";

const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem("b1admin-theme-mode", "dark"));
    await login(page);
    await use(page);
  }
});

function luminance(rgb: string) {
  const m = rgb.match(/\d+/g)?.map(Number) || [255, 255, 255];
  return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
}

// Issue #1017: group push preview Paper uses grey.50 in dark mode.

test("group push preview is not a light card in dark mode", async ({ page }) => {
  await openSeedGroup(page);
  await page.getByRole("button", { name: /Send push notification/i }).click();
  const title = page.getByText("Notification title");
  await expect(title).toBeVisible({ timeout: 15000 });
  const bg = await title.evaluate((el) => {
    let n: HTMLElement | null = el as HTMLElement;
    while (n && !n.className.toString().includes("MuiPaper-root")) n = n.parentElement;
    return n ? getComputedStyle(n).backgroundColor : "";
  });
  expect(luminance(bg), `expected a dark preview paper, got ${bg}`).toBeLessThan(80);
});
