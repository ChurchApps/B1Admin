import { sermonsTest as test, expect } from './helpers/test-fixtures';
import { editIconButton } from './helpers/fixtures';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Sermons Management', () => {

  /* test('should load sermons home', async ({ page }) => {
    const sermonsHeader = page.locator('h4').getByText('Sermons');
    await sermonsHeader.click();
  }); */

  test.describe.serial('Sermons Home', () => {

    test('should add sermon', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const sermonBtn = page.locator('li').getByText('Add Sermon');
      await sermonBtn.click();
      const date = page.locator('[name="publishDate"]');
      await date.fill('2025-12-02');
      const name = page.locator('[name="title"]');
      await name.fill('Octavian Test Sermon');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedSermon = page.locator('td').getByText('Octavian Test Sermon');
      await expect(validatedSermon).toHaveCount(1);
    });

    test('should edit sermon', async ({ page }) => {
      const sermonRow = page.locator('tr').filter({ hasText: 'Octavian Test Sermon' });
      const editBtn = sermonRow.locator('button').getByText('edit');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveValue('Octavian Test Sermon', { timeout: 10000 });
      const date = page.locator('[name="publishDate"]');
      await date.fill('2025-12-02');
      await name.fill('Octavius Test Sermon');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedSermon = page.locator('td').getByText('Octavius Test Sermon');
      await expect(validatedSermon).toHaveCount(1);
    });

    test('should search for a sermon', async ({ page }) => {
      const searchBar = page.locator('input');
      await searchBar.fill('Octavius Test Sermon')
      const validatedSermon = page.locator('td').getByText('Octavius Test Sermon');
      await expect(validatedSermon).toHaveCount(1);
    });

    test('should cancel editing sermon', async ({ page }) => {
      const sermonRow = page.locator('tr').filter({ hasText: 'Octavius Test Sermon' });
      const editBtn = sermonRow.locator('button').getByText('edit');
      await editBtn.click();
      const date = page.locator('[name="publishDate"]');
      await expect(date).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(date).toHaveCount(0);
    });

    test('should delete sermon', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const sermonRow = page.locator('tr').filter({ hasText: 'Octavius Test Sermon' });
      const editBtn = sermonRow.locator('button').getByText('edit');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Octavius Test Sermon');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test('should add live URL', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const urlBtn = page.locator('li').getByText('Add Permanent Live URL');
      await urlBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Octavian Test Live URL');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedUrl = page.locator('td').getByText('Octavian Test Live URL');
      await expect(validatedUrl).toHaveCount(1);
    });

    test('should edit live URL', async ({ page }) => {
      const urlRow = page.locator('tr').filter({ hasText: 'Octavian Test Live URL' });
      const editBtn = urlRow.locator('button').getByText('edit');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveValue('Octavian Test Live URL', { timeout: 10000 });
      await name.fill('Octavius Test Live URL');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedUrl = page.locator('td').getByText('Octavius Test Live URL');
      await expect(validatedUrl).toHaveCount(1);
    });

    test('should cancel editing live URL', async ({ page }) => {
      const urlRow = page.locator('tr').filter({ hasText: 'Octavius Test Live URL' });
      const editBtn = urlRow.locator('button').getByText('edit');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete live URL', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const urlRow = page.locator('tr').filter({ hasText: 'Octavius Test Live URL' });
      const editBtn = urlRow.locator('button').getByText('edit');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Octavius Test Live URL');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

  });

  test.describe.serial('Playlists', () => {
    test.beforeEach(async ({ page }) => {
      const playlistHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Playlists');
      await playlistHomeBtn.click();
    });

    test('should add playlist', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-playlist-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Octavian Test Playlist');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPlaylist = page.locator('td').getByText('Octavian Test Playlist');
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test('should edit playlist', async ({ page }) => {
      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill('Octavius Test Playlist');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPlaylist = page.locator('td').getByText('Octavius Test Playlist');
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test('should search for a playlist', async ({ page }) => {
      const searchBtn = page.locator('button').getByText('Search');
      await searchBtn.click();
      const searchBar = page.locator('input');
      await searchBar.fill('Octavius Test Playlist')
      const validatedPlaylist = page.locator('td').getByText('Octavius Test Playlist');
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test('should cancel editing playlist', async ({ page }) => {
      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete playlist', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Octavius Test Playlist');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

  });

  test.describe.serial('Live Stream Times', () => {
    test.beforeEach(async ({ page }) => {
      const streamHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Live Stream Times');
      await streamHomeBtn.click();
    });

    test('should add service', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-service-button"]');
      await addBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill('Octavian Test Service');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedService = page.locator('p').getByText('Octavian Test Service');
      await expect(validatedService).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit service', async ({ page }) => {
      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill('Octavius Test Service');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedService = page.locator('td').getByText('Octavius Test Service');
      await expect(validatedService).toHaveCount(1);
    });

    test('should cancel editing service', async ({ page }) => {
      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete service', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.getByText('Octavius Test Service');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test.skip('should view your stream', async ({ page, context }) => {
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

    test('should show settings tab with sidebar tabs section and view stream link', async ({ page }) => {
      const settingsBtn = page.locator('[role="tab"]').getByText('Settings');
      await settingsBtn.click();
      // Tabs section header (Content Tabs) and Add small-button render in Settings tab
      await expect(page.locator('[data-testid="small-button-add"]')).toBeVisible({ timeout: 10000 });
      // External "View Your Stream" button is rendered in the Settings tab
      await expect(page.getByRole('link', { name: 'View Your Stream' })).toBeVisible();
    });

  });

  test.describe.serial('Bulk Import', () => {
    test.beforeEach(async ({ page }) => {
      const bulkImportBtn = page.locator('[id="secondaryMenu"]').getByText('Bulk Import');
      await bulkImportBtn.click();
      await expect(page).toHaveURL(/\/sermons\/bulk/, { timeout: 10000 });
    });

    test('should show YouTube and Vimeo source cards', async ({ page }) => {
      await expect(page.locator('[data-testid="import-youtube-button"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="import-vimeo-button"]')).toBeVisible();
    });

    test('should open YouTube import form when YouTube card is selected', async ({ page }) => {
      await page.locator('[data-testid="import-youtube-button"]').click();
      const channelInput = page.locator('[name="channelId"]');
      await expect(channelInput).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button').getByText('Fetch')).toBeVisible();
    });

    test('should return to source selection via Back to Selection', async ({ page }) => {
      await page.locator('[data-testid="import-youtube-button"]').click();
      await expect(page.locator('[name="channelId"]')).toBeVisible({ timeout: 10000 });

      const backBtn = page.locator('button').getByText('Back to Selection');
      await backBtn.click();

      await expect(page.locator('[data-testid="import-youtube-button"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="import-vimeo-button"]')).toBeVisible();
    });

    test('should open Vimeo import form when Vimeo card is selected', async ({ page }) => {
      await page.locator('[data-testid="import-vimeo-button"]').click();
      const channelInput = page.locator('[name="channelId"]');
      await expect(channelInput).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button').getByText('Fetch')).toBeVisible();
    });
  });
});
