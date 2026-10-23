import { type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1341: while data was still loading, the plan page and the home page said
// "No items in service order", "Plan is valid.", "No service planned this week." and
// "You're not in any groups yet.", and the logo screen let you leave with unsaved changes.

// Holds matching API requests until release() is called, so the page stays in its loading state.
const holdRequests = async (page: Page, pattern: RegExp) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(pattern, async (route) => { await gate; await route.continue().catch(() => {}); });
  return () => release();
};

test("plan page shows loading, not empty, while its lists load", async ({ page }) => {
  const release = await holdRequests(page, /\/(planItems|positions|assignments)\/plan\//);
  await page.goto("/serving/plans/PLA00000001");
  await expect(page.getByTestId("plan-plans-link")).toBeVisible({ timeout: 15000 });

  await expect(page.getByTestId("service-order-loading")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("assignment-loading")).toBeVisible();
  await expect(page.getByText("No items in service order")).toHaveCount(0);
  await expect(page.getByText("Plan is valid.")).toHaveCount(0);

  release();
  await expect(page.getByTestId("service-order-loading")).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByTestId("assignment-loading")).toHaveCount(0, { timeout: 15000 });
});

test("home page shows loading, not empty, while its cards load", async ({ page }) => {
  const release = await holdRequests(page, /\/(plans\/presenter|groupmembers\?personId=)/);
  await page.goto("/");
  await expect(page.getByTestId("sunday-home")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("home-my-groups")).toBeVisible({ timeout: 15000 });

  await expect(page.getByTestId("sunday-loading")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("my-groups-loading")).toBeVisible();
  await expect(page.getByText("No service planned this week.")).toHaveCount(0);
  await expect(page.getByText("You're not in any groups yet.")).toHaveCount(0);

  release();
  await expect(page.getByTestId("sunday-loading")).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByTestId("my-groups-loading")).toHaveCount(0, { timeout: 15000 });
});

test("logo screen warns before leaving with unsaved changes", async ({ page }) => {
  await page.goto("/site/appearance#logo");
  await expect(page.locator('[data-testid="save-appearance-button"]')).toBeVisible({ timeout: 15000 });

  const blocksUnload = () => page.evaluate(() => {
    const e = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(await blocksUnload()).toBe(false);

  await page.getByLabel(/short name/i).fill("E2E1341");
  await expect.poll(blocksUnload).toBe(true);
});
