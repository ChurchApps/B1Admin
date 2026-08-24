import { test as base, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { openKnownPerson } from "./helpers/fixtures";

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

// Issue #1014: person form results use grey.50, which is near-white in dark mode.

test("person form results are not a light card in dark mode", async ({ page }) => {
  await openKnownPerson(page, "Jessica Taylor");
  await page.locator("button").getByText("Forms", { exact: true }).click();
  await page.getByText("Visitor Information Card", { exact: true }).first().click();
  const title = page.getByText("First Name", { exact: true });
  await expect(title).toBeVisible({ timeout: 15000 });
  const bg = await title.evaluate((el) => getComputedStyle(el.parentElement as Element).backgroundColor);
  expect(luminance(bg), `expected a dark result card, got ${bg}`).toBeLessThan(80);
});
