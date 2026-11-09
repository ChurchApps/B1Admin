import { test as base, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { openKnownPerson, personDetailsEditButton, SEED_PEOPLE } from "./helpers/fixtures";

const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem("b1admin-theme-mode", "dark"));
    await login(page);
    await use(page);
  }
});

function luminance(rgb: string) {
  const m = rgb.match(/\d+/g)?.map(Number) || [0, 0, 0];
  return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
}

// Issue #1012: merge search-result button should use light text in dark mode.

test("merge search result button uses light text in dark mode", async ({ page }) => {
  await openKnownPerson(page, SEED_PEOPLE.DONALD);
  await personDetailsEditButton(page).first().click();
  await page.locator("button").getByText("merge").click();
  await page.locator('[name="personAddText"]').fill("Carol Clark");
  await page.locator("#mergeBox").getByRole("button", { name: "Search" }).click();
  const mergeBtn = page.locator("#searchResults [data-testid='select-person-button']").first();
  await expect(mergeBtn).toBeVisible({ timeout: 15000 });
  const color = await mergeBtn.locator("div").first().evaluate((el) => getComputedStyle(el).color);
  expect(luminance(color), `expected light merge-button text, got ${color}`).toBeGreaterThan(160);
});
