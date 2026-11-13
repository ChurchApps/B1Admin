import { type Locator } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Name search boxes must tell the browser not to autocorrect or spell-check, or Safari turns
// uncommon surnames (Mincks -> Mitch) into common words before the search runs.

async function expectNoCorrection(input: Locator) {
  await expect(input).toBeVisible({ timeout: 15000 });
  await expect(input).toHaveAttribute("autocorrect", "off");
  await expect(input).toHaveAttribute("spellcheck", "false");
  await expect(input).toHaveAttribute("autocapitalize", "off");
}

test("batch entry person search turns off autocorrect", async ({ page }) => {
  await page.goto("/donations/batches/BAT00000001");
  await expectNoCorrection(page.locator('input[data-testid="person-search-input"], [data-testid="person-search-input"] input').first());
});

test("people page search turns off autocorrect", async ({ page }) => {
  await page.goto("/people");
  await expectNoCorrection(page.locator('input[data-testid="people-search-input"]'));
});
