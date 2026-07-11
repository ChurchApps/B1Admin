import type { Page } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSettings } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { MINISTRYSTUFF_ENABLED } from "../src/helpers/MinistryStuffFlag";

test.describe.serial("MinistryStuff provider settings", () => {
  test.skip(!MINISTRYSTUFF_ENABLED, "MinistryStuff is feature-flagged off until launch");

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToSettings(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("texting settings offers MinistryStuff and saves it", async () => {
    await page.locator('[data-testid="settings-section-texting"]').click();
    await expect(page.locator('[data-testid="settings-texting"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");
    const select = page.locator('[data-testid="settings-texting"]').getByRole("combobox");
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();
    await page.getByRole("option", { name: "MinistryStuff" }).click();
    await expect(page.locator('[data-testid="settings-texting"]').getByText("ministrystuff.org")).toBeVisible();
    await page.locator('[data-testid="settings-texting"] button').getByText("Save").click();
    await expect(select).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('[data-testid="settings-texting"]').getByText("MinistryStuff")).toBeVisible({ timeout: 10000 });
  });

  test("storage settings section saves MinistryStuff provider", async () => {
    await page.locator('[data-testid="settings-section-storage"]').click();
    await expect(page.locator('[data-testid="settings-storage"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");
    const select = page.locator('[data-testid="settings-storage"]').getByRole("combobox");
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();
    await page.getByRole("option", { name: "MinistryStuff" }).click();
    await expect(page.locator('[data-testid="settings-storage"]').getByText("ministrystuff.org")).toBeVisible();
    await page.locator('[data-testid="settings-storage"] button').getByText("Save").click();
    await expect(select).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('[data-testid="settings-storage"]').getByText("MinistryStuff")).toBeVisible({ timeout: 10000 });
  });

  test("storage settings switches back to free tier", async () => {
    await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");
    const select = page.locator('[data-testid="settings-storage"]').getByRole("combobox");
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();
    await page.getByRole("option", { name: "ChurchApps (Free)" }).click();
    await page.locator('[data-testid="settings-storage"] button').getByText("Save").click();
    await expect(select).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('[data-testid="settings-storage"]').getByText("ChurchApps (Free)").first()).toBeVisible({ timeout: 10000 });
  });
});
