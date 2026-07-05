import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateToDeveloper } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

const KEY_NAME = "Barnabas Test Key";

const openDeveloperPage = async (page: Page) => {
  await navigateToDeveloper(page);
  await expect(page.getByRole("button", { name: "New API Key" })).toBeVisible({ timeout: 15000 });
};

test.describe.serial("Developer Portal", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await openDeveloperPage(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  // Cleanup leftover keys from prior test runs on non-reset DB.
  test("cleans up leftover test keys", async () => {
    for (let i = 0; i < 10; i++) {
      const row = page.locator("tr").filter({ hasText: KEY_NAME }).first();
      if (await row.count() === 0) break;
      await row.getByRole("button", { name: "Delete" }).click();
      await confirmDelete(page);
      await expect(row).toHaveCount(0, { timeout: 10000 }).catch(() => { });
    }
  });

  test("creates an API key and reveals the raw key once", async () => {
    await page.getByRole("button", { name: "New API Key" }).click();

    await page.getByLabel("Name", { exact: true }).fill(KEY_NAME);

    // Scope catalog loads async — wait for the checkbox before toggling it.
    const scope = page.getByLabel("people:read");
    await expect(scope).toBeVisible({ timeout: 10000 });
    await scope.check();

    const savePost = page.waitForResponse(
      (r) => r.url().includes("/apiKeys") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.locator("button").getByText("Save").click();
    await savePost;

    const keyDialog = page.locator('div[role="dialog"]:has-text("API Key")');
    await expect(keyDialog).toBeVisible({ timeout: 10000 });
    expect(await keyDialog.locator("input").inputValue()).toMatch(/^cak_/);
    await keyDialog.getByRole("button", { name: "Close" }).click();
    await expect(keyDialog).toHaveCount(0, { timeout: 10000 });

    await expect(page.locator("tr").filter({ hasText: KEY_NAME })).toHaveCount(1, { timeout: 10000 });
  });

  test("rejects an API key with no scopes selected", async () => {
    await page.getByRole("button", { name: "New API Key" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Barnabas Invalid Key");
    await page.locator("button").getByText("Save").click();
    // Client-side validation blocks the save and surfaces an error message.
    await expect(page.getByText("Select at least one scope")).toBeVisible({ timeout: 5000 });
    await page.locator("button").getByText("Cancel").click();
  });

  test("shows the Connected Apps section", async () => {
    await page.getByRole("tab", { name: "Connected Apps" }).click();
    await expect(page.getByRole("heading", { name: "Connected Apps" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "API Keys" }).click();
  });

  test("deletes the API key", async () => {
    const row = page.locator("tr").filter({ hasText: KEY_NAME }).first();
    await row.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page.locator("tr").filter({ hasText: KEY_NAME })).toHaveCount(0, { timeout: 10000 });
  });
});
