import type { Page } from '@playwright/test';
import { sermonsTest as test, expect } from './helpers/test-fixtures';
import { editIconButton } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToSermons } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe('Sermons Management', () => {

  /* test('should load sermons home', async ({ page }) => {
    const sermonsHeader = page.locator('h4').getByText('Sermons');
    await sermonsHeader.click();
  }); */

  test.describe.serial('Sermons Home', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test('should add sermon', async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const sermonBtn = page.locator('li').getByText('Add Sermon');
      await sermonBtn.click();
      const date = page.locator('[name="publishDate"]');
      await date.fill('2025-12-02');
      const name = page.locator('[name="title"]');
      await name.fill('Zacchaeus Test Sermon');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedSermon = page.locator('td').getByText('Zacchaeus Test Sermon');
      await expect(validatedSermon).toHaveCount(1);
    });

    test('should edit sermon', async () => {
      const sermonRow = page.locator('tr').filter({ hasText: 'Zacchaeus Test Sermon' });
      const editBtn = sermonRow.locator('button').getByText('edit');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveValue('Zacchaeus Test Sermon', { timeout: 10000 });
      const date = page.locator('[name="publishDate"]');
      await date.fill('2025-12-02');
      await name.fill('Zebedee Test Sermon');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedSermon = page.locator('td').getByText('Zebedee Test Sermon');
      await expect(validatedSermon).toHaveCount(1);
    });

    test('should search for a sermon', async () => {
      const searchBar = page.locator('input');
      await searchBar.fill('Zebedee Test Sermon')
      const validatedSermon = page.locator('td').getByText('Zebedee Test Sermon');
      await expect(validatedSermon).toHaveCount(1);
    });

    test('should cancel editing sermon', async () => {
      const sermonRow = page.locator('tr').filter({ hasText: 'Zebedee Test Sermon' });
      const editBtn = sermonRow.locator('button').getByText('edit');
      await editBtn.click();
      const date = page.locator('[name="publishDate"]');
      await expect(date).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(date).toHaveCount(0);
    });

    test('should delete sermon', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const sermonRow = page.locator('tr').filter({ hasText: 'Zebedee Test Sermon' });
      const editBtn = sermonRow.locator('button').getByText('edit');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Zebedee Test Sermon');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test('should add live URL', async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const urlBtn = page.locator('li').getByText('Add Permanent Live URL');
      await urlBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Zacchaeus Test Live URL');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedUrl = page.locator('td').getByText('Zacchaeus Test Live URL');
      await expect(validatedUrl).toHaveCount(1);
    });

    test('should edit live URL', async () => {
      const urlRow = page.locator('tr').filter({ hasText: 'Zacchaeus Test Live URL' });
      const editBtn = urlRow.locator('button').getByText('edit');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveValue('Zacchaeus Test Live URL', { timeout: 10000 });
      await name.fill('Zebedee Test Live URL');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedUrl = page.locator('td').getByText('Zebedee Test Live URL');
      await expect(validatedUrl).toHaveCount(1);
    });

    test('should cancel editing live URL', async () => {
      const urlRow = page.locator('tr').filter({ hasText: 'Zebedee Test Live URL' });
      const editBtn = urlRow.locator('button').getByText('edit');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete live URL', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const urlRow = page.locator('tr').filter({ hasText: 'Zebedee Test Live URL' });
      const editBtn = urlRow.locator('button').getByText('edit');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Zebedee Test Live URL');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

  });

  test.describe.serial('Playlists', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const playlistHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Playlists');
      await playlistHomeBtn.click();
    });

    test('should add playlist', async () => {
      const addBtn = page.locator('[data-testid="add-playlist-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Zacchaeus Test Playlist');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPlaylist = page.locator('td').getByText('Zacchaeus Test Playlist');
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test('should edit playlist', async () => {
      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill('Zebedee Test Playlist');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPlaylist = page.locator('td').getByText('Zebedee Test Playlist');
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test('should search for a playlist', async () => {
      const searchBtn = page.locator('button').getByText('Search');
      await searchBtn.click();
      const searchBar = page.locator('input');
      await searchBar.fill('Zebedee Test Playlist')
      const validatedPlaylist = page.locator('td').getByText('Zebedee Test Playlist');
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test('should cancel editing playlist', async () => {
      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete playlist', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Zebedee Test Playlist');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

  });

  test.describe.serial('Live Stream Times', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const streamHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Live Stream Times');
      await streamHomeBtn.click();
    });

    test('should add service', async () => {
      const addBtn = page.locator('[data-testid="add-service-button"]');
      await addBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill('Zacchaeus Test Service');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedService = page.locator('p').getByText('Zacchaeus Test Service');
      await expect(validatedService).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit service', async () => {
      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill('Zebedee Test Service');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedService = page.locator('td').getByText('Zebedee Test Service');
      await expect(validatedService).toHaveCount(1);
    });

    test('should cancel editing service', async () => {
      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete service', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Zebedee Test Service');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test.skip('should view your stream', async () => {
      const context = page.context();
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      const viewBtn = page.locator('a').getByText('View Your Stream');
      await expect(viewBtn).toBeVisible({ timeout: 10000 });
      await viewBtn.click();

      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        viewBtn.click()
      ]);
      await newPage.waitForLoadState();
      await expect(newPage).toHaveURL(/vercel.com\/[^/]+/);
    });

    test('should show settings tab with sidebar tabs section and view stream link', async () => {
      const settingsBtn = page.locator('[role="tab"]').getByText('Settings');
      await settingsBtn.click();
      // Tabs section header (Content Tabs) and Add small-button render in Settings tab
      await expect(page.locator('[data-testid="small-button-add"]')).toBeVisible({ timeout: 10000 });
      // External "View Your Stream" button is rendered in the Settings tab
      await expect(page.getByRole('link', { name: 'View Your Stream' })).toBeVisible();
    });

  });

  test.describe.serial('Bulk Import', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const bulkImportBtn = page.locator('[id="secondaryMenu"]').getByText('Bulk Import');
      await bulkImportBtn.click();
      await expect(page).toHaveURL(/\/sermons\/bulk/, { timeout: 10000 });
    });

    test('should show YouTube and Vimeo source cards', async () => {
      await expect(page.locator('[data-testid="import-youtube-button"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="import-vimeo-button"]')).toBeVisible();
    });

    test('should open YouTube import form when YouTube card is selected', async () => {
      await page.locator('[data-testid="import-youtube-button"]').click();
      const channelInput = page.locator('[name="channelId"]');
      await expect(channelInput).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button').getByText('Fetch')).toBeVisible();
    });

    test('should return to source selection via Back to Selection', async () => {
      await page.locator('[data-testid="import-youtube-button"]').click();
      await expect(page.locator('[name="channelId"]')).toBeVisible({ timeout: 10000 });

      const backBtn = page.locator('button').getByText('Back to Selection');
      await backBtn.click();

      await expect(page.locator('[data-testid="import-youtube-button"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="import-vimeo-button"]')).toBeVisible();
    });

    test('should open Vimeo import form when Vimeo card is selected', async () => {
      await page.locator('[data-testid="import-vimeo-button"]').click();
      const channelInput = page.locator('[name="channelId"]');
      await expect(channelInput).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button').getByText('Fetch')).toBeVisible();
    });
  });

  // Edge-case extensions: provider validation + live-stream config gaps from
  // .notes/B1Admin-test-coverage-gaps.md §3 (sermons row).
  test.describe.serial('Sermon edit — video provider details', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test('opens a fresh sermon and exposes the video provider dropdown', async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const openSermonOption = page.locator('li').getByText('Add Sermon');
      if (await openSermonOption.isVisible().catch(() => false)) {
        await openSermonOption.click();
      }
      await expect(page.locator('[data-testid="video-provider-select"]')).toBeVisible({ timeout: 10000 });
    });

    test('video provider dropdown exposes YouTube / Vimeo / Facebook / Custom', async () => {
      // The drawer is still open from the previous test (serial chain). If the runtime
      // reset between tests, re-open it.
      let providerSel = page.locator('[data-testid="video-provider-select"]');
      if (!(await providerSel.isVisible().catch(() => false))) {
        await page.locator('[data-testid="add-sermon-button"]').click();
        const openSermonOption = page.locator('li').getByText('Add Sermon');
        if (await openSermonOption.isVisible().catch(() => false)) await openSermonOption.click();
        providerSel = page.locator('[data-testid="video-provider-select"]');
      }
      await providerSel.click();
      for (const option of ['YouTube', 'Vimeo', 'Facebook']) {
        await expect(page.locator('li[role="option"]', { hasText: new RegExp(`^${option}\\b`) })).toBeVisible({ timeout: 10000 });
      }
      // Custom is also expected per docs (steps mention multiple providers).
      await expect(page.locator('li[role="option"]', { hasText: /Custom/i })).toBeVisible();
      await page.keyboard.press('Escape');
    });

    test('switching provider to Vimeo updates the video ID input label', async () => {
      let providerSel = page.locator('[data-testid="video-provider-select"]');
      if (!(await providerSel.isVisible().catch(() => false))) {
        await page.locator('[data-testid="add-sermon-button"]').click();
        const openSermonOption = page.locator('li').getByText('Add Sermon');
        if (await openSermonOption.isVisible().catch(() => false)) await openSermonOption.click();
        providerSel = page.locator('[data-testid="video-provider-select"]');
      }
      await providerSel.click();
      await page.locator('li[role="option"]', { hasText: /^Vimeo/ }).click();
      // The video-data field's label switches to "Vimeo ID" plus a fetch button surfaces.
      await expect(page.locator('[data-testid="fetch-vimeo-button"]')).toBeVisible({ timeout: 10000 });
      // Cancel out so we don't pollute later tests.
      await page.locator('button').getByText('Cancel').first().click().catch(() => { });
    });

    test('publish date input is present on a new sermon', async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const openSermonOption = page.locator('li').getByText('Add Sermon');
      if (await openSermonOption.isVisible().catch(() => false)) {
        await openSermonOption.click();
      }
      await expect(page.locator('[data-testid="publish-date-input"]')).toBeVisible({ timeout: 10000 });
      await page.locator('button').getByText('Cancel').first().click().catch(() => { });
    });
  });
});
