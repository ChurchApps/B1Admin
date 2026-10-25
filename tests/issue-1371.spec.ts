import { loggedInTest as test, peopleTest, expect } from "./helpers/test-fixtures";

// Issue #1371: People page papercuts found while recording training videos.

test("a Demographics slice opens People filtered to that slice", async ({ page }) => {
  await page.goto("/people/demographics");
  const card = page.locator(".MuiCard-root").filter({ has: page.getByRole("heading", { name: "Marital Status" }) });
  const legend = card.locator("svg text").filter({ hasText: /^Widowed$/ });
  await expect(legend).toBeVisible({ timeout: 20000 });
  await legend.click();
  await page.waitForURL(/\/people$/);
  await expect(page.getByTestId("people-results-bar")).toContainText(/people/, { timeout: 15000 });
  // The filtered list showed briefly, then the page remounted and refetched everyone.
  // Let that settle before checking what the user is left looking at.
  await page.waitForLoadState("networkidle");
  // Demo seed has five widowed people.
  await expect(page.getByTestId("people-results-bar")).toContainText("· 5 people");
});

peopleTest("a one-person result says household and person in the singular", async ({ page }) => {
  await page.locator('input[name="searchText"]').fill("Donald Clark");
  const bar = page.getByTestId("people-results-bar");
  await expect(bar).toContainText(/^1 household/, { timeout: 15000 });
  await expect(bar).toContainText("1 household · 1 person");
});

test("one custom field reads in the singular on Settings", async ({ page }) => {
  await page.route(/\/membership\/personfields(\?|$)/, (route) => route.fulfill({ json: [{ id: "PF1", name: "Shirt Size", fieldType: "text" }] }));
  await page.goto("/settings");
  await expect(page.getByText(/^1 custom fields?$/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("1 custom field", { exact: true })).toBeVisible();
});

peopleTest("clicking an Advanced search field name ticks its box", async ({ page }) => {
  await page.locator("#peopleSearch").getByRole("button", { name: "Advanced", exact: true }).click();
  const row = page.locator("#peopleSearch-advanced").getByText("Middle Name", { exact: true });
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.click();
  await expect(page.locator("span").getByText("1 active:")).toHaveCount(1);
});
