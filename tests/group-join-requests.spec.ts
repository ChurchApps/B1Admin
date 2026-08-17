import type { Page } from "@playwright/test";
import { groupsTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToGroups } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// API-level tests cover approve/decline; UI tests verify surface plumbing only.
test.describe.serial("Group Join Requests", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToGroups(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.beforeEach(async () => {
    if (!/\/groups$|\/groups\?/.test(page.url())) {
      await navigateToGroups(page);
    }
  });

  test("enrollment policy field is present and persists", async () => {
    const firstGroup = page.locator("table tbody tr a").first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
    await page.locator('[data-testid="edit-group-button"]').click();

    const select = page.locator('[data-testid="join-policy-select"]');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();
    const requestOption = page.locator('li[role="option"]').filter({ hasText: /Request to Join/i });
    await requestOption.click();
    const savePost = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST");
    await page.locator("#groupDetailsBox button").filter({ hasText: /^save$/i }).first().click();
    await savePost;
    await page.reload();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
    await page.locator('[data-testid="edit-group-button"]').click();
    await expect(page.locator('[data-testid="join-policy-select"]')).toContainText(/Request to Join/i);
    await page.locator('[data-testid="join-policy-select"]').click();
    await page.locator('li[role="option"]').filter({ hasText: /Open \(/i }).click();
    const cleanupPost = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST");
    await page.locator("#groupDetailsBox button").filter({ hasText: /^save$/i }).first().click();
    await cleanupPost;
  });

  test("members tab still renders for a group in request mode", async () => {
    const firstGroup = page.locator("table tbody tr a").first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
    await expect(page.locator("#groupMembersBox")).toBeVisible({ timeout: 10000 });
  });

  test("org-wide pending requests page loads", async () => {
    await page.goto("/groups/pending");
    await expect(page.locator('[data-testid="pending-requests-page"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="pending-requests-empty"]')).toBeVisible({ timeout: 10000 });
  });
});
