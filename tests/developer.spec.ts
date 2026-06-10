import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateToDeveloper } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// BARNABAS is the name used for testing. If you see Barnabas entered anywhere,
// it is a result of these tests.
const KEY_NAME = 'Barnabas Test Key';

// Developer is a section of the Settings landing's configuration list.
const openDeveloperPage = async (page: Page) => {
  await navigateToDeveloper(page);
  await expect(page.getByRole('button', { name: 'New API Key' })).toBeVisible({ timeout: 15000 });
};

test.describe.serial('Developer Portal', () => {
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

  // Re-runs on a non-reset local DB can leave test keys behind; clear them so
  // the create assertion starts from a known state. In CI the DB is fresh.
  test('cleans up leftover test keys', async () => {
    for (let i = 0; i < 10; i++) {
      const row = page.locator('tr').filter({ hasText: KEY_NAME }).first();
      if (await row.count() === 0) break;
      page.once('dialog', (d) => d.accept());
      await row.getByRole('button', { name: 'Delete' }).click();
      await expect(row).toHaveCount(0, { timeout: 10000 }).catch(() => { });
    }
  });

  test('creates an API key and reveals the raw key once', async () => {
    await page.getByRole('button', { name: 'New API Key' }).click();

    await page.getByLabel('Name', { exact: true }).fill(KEY_NAME);

    // Scope catalog loads async — wait for the checkbox before toggling it.
    const scope = page.getByLabel('people:read');
    await expect(scope).toBeVisible({ timeout: 10000 });
    await scope.check();

    const savePost = page.waitForResponse(
      (r) => r.url().includes('/apiKeys') && r.request().method() === 'POST',
      { timeout: 15000 }
    );
    await page.locator('button').getByText('Save').click();
    await savePost;

    // Create returns the raw key exactly once, shown in a dialog.
    const keyDialog = page.locator('div[role="dialog"]:has-text("API Key")');
    await expect(keyDialog).toBeVisible({ timeout: 10000 });
    expect(await keyDialog.locator('input').inputValue()).toMatch(/^cak_/);
    await keyDialog.getByRole('button', { name: 'Close' }).click();
    await expect(keyDialog).toHaveCount(0, { timeout: 10000 });

    await expect(page.locator('tr').filter({ hasText: KEY_NAME })).toHaveCount(1, { timeout: 10000 });
  });

  test('rejects an API key with no scopes selected', async () => {
    await page.getByRole('button', { name: 'New API Key' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Barnabas Invalid Key');
    await page.locator('button').getByText('Save').click();
    // Client-side validation blocks the save and surfaces an error message.
    await expect(page.getByText('Select at least one scope')).toBeVisible({ timeout: 5000 });
    await page.locator('button').getByText('Cancel').click();
  });

  test('shows the Connected Apps section', async () => {
    // The Developer section is tabbed (API Keys / Webhooks / Connected Apps);
    // the heading only renders once its tab is selected. Return to API Keys
    // afterward so the delete test still sees the key table.
    await page.getByRole('tab', { name: 'Connected Apps' }).click();
    await expect(page.getByRole('heading', { name: 'Connected Apps' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: 'API Keys' }).click();
  });

  test('deletes the API key', async () => {
    const row = page.locator('tr').filter({ hasText: KEY_NAME }).first();
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('tr').filter({ hasText: KEY_NAME })).toHaveCount(0, { timeout: 10000 });
  });
});
