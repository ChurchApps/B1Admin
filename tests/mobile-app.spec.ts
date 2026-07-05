import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToMobile } from "./helpers/navigation";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// Mobile App Settings tests per ChurchAppsSupport/b1Admin/mobile-admin.md.
const DISPOSABLE_TAB = "Zacchaeus Test Tab";

async function openMobileSettings(page: import("@playwright/test").Page) {
  await navigateToMobile(page);
  await page.waitForURL(/\/mobile\/navigation/, { timeout: 15000 });
  // Use #page-header-title to avoid getByRole heading strict-mode collision with subtitle.
  await page.locator("#page-header-title").filter({ hasText: "Mobile App Settings" })
    .waitFor({ state: "visible", timeout: 15000 });
}

async function openAddTabDrawer(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /^Add Tab$/i }).first().click();
  await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
}

async function selectMuiByLabel(page: import("@playwright/test").Page, labelText: string, optionText: string) {
  const select = page.getByLabel(labelText, { exact: true }).first();
  await select.click();
  const option = page.locator('li[role="option"]', { hasText: new RegExp(`^${optionText}$`, "i") }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
}

async function findTabRow(page: import("@playwright/test").Page, tabName: string) {
  // Wait for heading to confirm existence, then return listitem via filter for button scope.
  const heading = page.getByRole("heading", { level: 6, name: tabName, exact: true });
  await heading.first().waitFor({ state: "visible", timeout: 15000 });
  return page.getByRole("listitem").filter({ has: heading }).first();
}

test.describe("Mobile App Settings page", () => {
  test("renders the page with header, subtitle, and Add Tab button", async ({ page }) => {
    await openMobileSettings(page);
    await expect(page.locator("#page-header-title")).toContainText("Mobile App Settings");
    await expect(page.locator("#page-header-subtitle")).toContainText("Configure mobile app settings");
    await expect(page.getByRole("button", { name: /^Add Tab$/ }).first()).toBeVisible();
  });

  test("shows the App Tabs card heading", async ({ page }) => {
    await openMobileSettings(page);
    await expect(page.getByText("App Tabs").first()).toBeVisible({ timeout: 15000 });
  });

  test("opens Add Tab drawer with Name, Type, Visibility, and Save controls", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await expect(page.locator('input[name="text"]')).toBeVisible();
    await expect(page.getByLabel("Tab Type")).toBeVisible();
    await expect(page.getByLabel("Visibility")).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Tab/i })).toBeVisible();
  });

  test("Tab Type dropdown exposes documented options (Bible, Live Stream, Donation, External URL)", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.getByLabel("Tab Type").click();
    await expect(page.locator('li[role="option"]', { hasText: /^Bible$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('li[role="option"]', { hasText: /^Live Stream$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^Donation$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^External URL$/ })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Visibility dropdown exposes documented options including Specific Groups", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.getByLabel("Visibility").click();
    await expect(page.locator('li[role="option"]', { hasText: /Everyone/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('li[role="option"]', { hasText: /Logged-in Users/i })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /Specific Groups/i })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("switching Tab Type to External URL surfaces the URL field", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await selectMuiByLabel(page, "Tab Type", "External URL");
    await expect(page.locator('input[name="url"]')).toBeVisible({ timeout: 10000 });
  });

  test("switching Visibility to Specific Groups surfaces the group picker", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await selectMuiByLabel(page, "Visibility", "Specific Groups...");
    // The group picker section displays "Select Groups:" or "No groups found"
    await expect(page.getByText(/Select Groups|No groups found/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe.serial("Mobile tab lifecycle", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("creates a new External URL tab", async () => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(DISPOSABLE_TAB);
    await selectMuiByLabel(page, "Tab Type", "External URL");
    await page.locator('input[name="url"]').fill("https://example.org");
    await page.getByRole("button", { name: /Save Tab/i }).click();
    await findTabRow(page, DISPOSABLE_TAB);
  });

  test("opens the existing tab in the edit drawer with delete affordance", async () => {
    await openMobileSettings(page);
    const row = await findTabRow(page, DISPOSABLE_TAB);
    await row.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator('input[name="text"]')).toHaveValue(DISPOSABLE_TAB, { timeout: 10000 });
    await expect(page.getByRole("button", { name: /Delete Tab/i })).toBeVisible();
  });

  test("deletes the disposable tab", async () => {
    await openMobileSettings(page);
    const row = await findTabRow(page, DISPOSABLE_TAB);
    await row.getByRole("button", { name: "Edit" }).click();
    await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: /Delete Tab/i }).click();
    await confirmDelete(page);
    await expect(page.getByRole("heading", { level: 6, name: DISPOSABLE_TAB, exact: true }))
      .toHaveCount(0, { timeout: 15000 });
  });
});

// mobile-admin.md steps 12-13: tab ordering via the row Move Up / Move Down
// icon buttons (each move POSTs the re-sorted list to /links).
test.describe.serial("Mobile tab ordering", () => {
  // Retries would duplicate tabs; data is shared across serial tests.
  test.describe.configure({ retries: 0 });
  let page: Page;
  const TAB_A = "Zacchaeus Order Tab A";
  const TAB_B = "Zacchaeus Order Tab B";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  async function createUrlTab(name: string) {
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(name);
    await selectMuiByLabel(page, "Tab Type", "External URL");
    await page.locator('input[name="url"]').fill("https://example.org");
    await page.getByRole("button", { name: /Save Tab/i }).click();
    await findTabRow(page, name);
  }

  async function tabNames() {
    return page.getByRole("listitem").getByRole("heading", { level: 6 }).allTextContents();
  }

  test("moves the lower of two created tabs above the other and persists the order", async () => {
    await openMobileSettings(page);
    await createUrlTab(TAB_A);
    await createUrlTab(TAB_B);
    // Derive which tab is lower since sort isn't deterministic.
    const before = await tabNames();
    const lower = before.indexOf(TAB_A) > before.indexOf(TAB_B) ? TAB_A : TAB_B;
    const upper = lower === TAB_A ? TAB_B : TAB_A;

    // Move Up only guarantees one adjacent swap; repeat until above.
    for (let i = 0; i < 6; i++) {
      const names = await tabNames();
      if (names.indexOf(lower) < names.indexOf(upper)) break;
      const row = await findTabRow(page, lower);
      const moveUp = row.getByRole("button", { name: "Move Up" });
      // Concurrent delete may disable Move Up; the order is settled if so.
      if (await moveUp.isDisabled().catch(() => true)) continue;
      const saved = page.waitForResponse(r => r.url().includes("/links") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 }).catch((): null => null);
      await moveUp.click({ timeout: 5000 }).catch(() => { });
      await saved;
    }
    await expect.poll(async () => {
      const names = await tabNames();
      return names.indexOf(lower) !== -1 && names.indexOf(lower) < names.indexOf(upper);
    }, { timeout: 10000 }).toBe(true);

    // The new order survives a reload (sort persisted via POST /links).
    await page.reload();
    await findTabRow(page, lower);
    const after = await tabNames();
    expect(after.indexOf(lower)).toBeLessThan(after.indexOf(upper));
  });

  test("deletes the ordering tabs", async () => {
    await openMobileSettings(page);
    for (const name of [TAB_A, TAB_B]) {
      const row = await findTabRow(page, name);
      await row.getByRole("button", { name: "Edit" }).click();
      await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: /Delete Tab/i }).click();
      await confirmDelete(page);
      await expect(page.getByRole("heading", { level: 6, name, exact: true })).toHaveCount(0, { timeout: 15000 });
    }
  });
});
