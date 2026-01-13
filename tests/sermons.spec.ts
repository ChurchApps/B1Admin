import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Sermons Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const sermonsHomeBtn = page.locator('[data-testid="nav-item-sermons"]');
    await sermonsHomeBtn.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/sermons/);
  });

  /* test('should load sermons home', async ({ page }) => {
    const sermonsHeader = page.locator('h4').getByText('Sermons');
    await sermonsHeader.click();
  }); */

  test.describe('Sermons Home', () => {

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
      const editBtn = page.locator('button').getByText('edit').first();
      await editBtn.click();
      const date = page.locator('[name="publishDate"]');
      await date.fill('2025-12-02');
      const name = page.locator('[name="title"]');
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
      const editBtn = page.locator('button').getByText('edit').first();
      await editBtn.click();
      const date = page.locator('[name="publishDate"]');
      await expect(date).toHaveCount(1);
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

      const editBtn = page.locator('button').getByText('edit').first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('Octavius Test Sermon');
      await expect(validatedDeletion).toHaveCount(0);
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
      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Octavius Test Live URL');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedUrl = page.locator('td').getByText('Octavius Test Live URL');
      await expect(validatedUrl).toHaveCount(1);
    });

    test('should cancel editing live URL', async ({ page }) => {
      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveCount(1);
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

      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('Octavius Test Live URL');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  test.describe('Playlists', () => {
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
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').first();
      await editBtn.click();
      const name = page.locator('[name="title"]');
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
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').first();
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveCount(1);
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

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('Octavius Test Playlist');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  test.describe('Live Stream Times', () => {
    test.beforeEach(async ({ page }) => {
      const streamHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Live Stream Times');
      await streamHomeBtn.click();
    });

    test('should add service', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-service-button"]');
      await addBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await name.fill('Octavian Test Service');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedService = page.locator('p').getByText('Octavian Test Service');
      await expect(validatedService).toHaveCount(1);
    });

    test('should edit service', async ({ page }) => {
      const editBtn = page.locator('button').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="serviceLabel"]');
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
      await expect(name).toHaveCount(1)
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
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('Octavius Test Service');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should add navigation link', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      const addBtn = page.locator('[data-testid="add-link-button"]');
      await addBtn.click();
      const name = page.locator('[name="text"]');
      await name.fill('Harder Better Faster Stronger Test');
      const link = page.locator('[name="url"]');
      await link.fill('https://www.youtube.com/watch?v=yydNF8tuVmU');
      const saveBtn = page.locator('button').getByText('Save Link');
      await saveBtn.click();
      const validatedLink = page.locator('a').getByText('Harder Better Faster Stronger Test');
      await expect(validatedLink).toHaveCount(1);
      await validatedLink.click();
      await page.waitForTimeout(5000);
      await expect(page).toHaveURL('https://www.youtube.com/watch?v=yydNF8tuVmU');
    });

    test('should edit navigation link', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      await page.waitForTimeout(500);
      const editBtn = page.locator('a span').getByText('edit').first();
      await editBtn.click();
      await page.waitForTimeout(500);
      const name = page.locator('[name="text"]');
      await name.fill('Harker Betker Fasker Stronker Test');
      const link = page.locator('[name="url"]');
      await link.fill('https://www.youtube.com/watch?v=yydNF8tuVmU');
      const saveBtn = page.locator('button').getByText('Save Link');
      await saveBtn.click();
      const validatedLink = page.locator('a').getByText('Harker Betker Fasker Stronker Test');
      await expect(validatedLink).toHaveCount(1);
    });

    test('should cancel editing navigation link', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      await page.waitForTimeout(500);
      const editBtn = page.locator('a span').getByText('edit').first();
      await editBtn.click();
      const name = page.locator('[name="text"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete navigation link', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      await page.waitForTimeout(500);
      const editBtn = page.locator('a span').getByText('edit').first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const conDeleteBtn = page.locator('button').getByText('Delete').last();
      await conDeleteBtn.click();
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('a').getByText('Harker Betker Fasker Stronker Test');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should add sidebar tab', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      const addBtn = page.locator('[data-testid="small-button-add"]');
      await addBtn.click();
      const name = page.locator('[name="text"]');
      await name.fill('Harder Better Faster Stronger Test');
      const link = page.locator('[name="url"]');
      await link.fill('https://www.youtube.com/watch?v=yydNF8tuVmU');
      const saveBtn = page.locator('button').getByText('Save Tab');
      await saveBtn.click();
      const validatedTab = page.locator('a').getByText('Harder Better Faster Stronger Test');
      await expect(validatedTab).toHaveCount(1);
      await validatedTab.click();
      await page.waitForTimeout(5000);
      await expect(page).toHaveURL('https://www.youtube.com/watch?v=yydNF8tuVmU');
    });

    test('should edit sidebar tab', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      await page.waitForTimeout(500);
      const editBtn = page.locator('a span').getByText('edit').first();
      await editBtn.click();
      const name = page.locator('[name="text"]');
      await name.fill('Harker Betker Fasker Stronker Test');
      const link = page.locator('[name="url"]');
      await link.fill('https://www.youtube.com/watch?v=yydNF8tuVmU');
      const saveBtn = page.locator('button').getByText('Save Tab');
      await saveBtn.click();
      const validatedTab = page.locator('a').getByText('Harker Betker Fasker Stronker Test');
      await expect(validatedTab).toHaveCount(1);
    });

    test('should cancel editing sidebar tab', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      await page.waitForTimeout(500);
      const editBtn = page.locator('a span').getByText('edit').first();
      await editBtn.click();
      const name = page.locator('[name="text"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete sidebar tab', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();

      await page.waitForTimeout(500);
      const editBtn = page.locator('a span').getByText('edit').first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const conDeleteBtn = page.locator('button').getByText('Delete').last();
      await conDeleteBtn.click();
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('a').getByText('Harker Betker Fasker Stronker Test');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should customize appearance', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();
      await page.waitForTimeout(500);

      const customBtn = page.locator('a').getByText('Customize Appearance');
      await customBtn.click();
      await expect(page).toHaveURL(/\/settings\/branding/);
    });

    test('should edit users', async ({ page }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();
      await page.waitForTimeout(500);

      const editBtn = page.locator('a').getByText('Edit Users');
      await editBtn.click();
      await expect(page).toHaveURL(/\/settings/);
    });

    test('should view your stream', async ({ page, context }) => {
      const settingsBtn = page.locator('[role="tablist"]').getByText('Settings');
      await settingsBtn.click();
      await page.waitForTimeout(500);

      const viewBtn = page.locator('a').getByText('View Your Stream');
      await viewBtn.click();
      await page.waitForTimeout(2000);

      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        viewBtn.click()
      ]);
      await newPage.waitForLoadState();
      await expect(newPage).toHaveURL(/vercel.com\/[^/]+/);
    });

  });
});