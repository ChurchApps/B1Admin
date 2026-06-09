import type { Page } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { editIconButton, addIconButton, checkIconButton } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToServing } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// The "My Work" inbox (/serving/tasks) shows My Cards beside the tasks module; the
// plain task list (Add Task, sections) is the right-hand module.
async function openMyTasks(page: Page) {
  await page.locator('[id="secondaryMenu"] a').getByText('My Work').click();
  await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
}

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe('Serving Management - Songs & Tasks', () => {

  test.describe.serial('Songs', () => {
    // Songs tests share data — a retry would create duplicate "Zacchaeus
    // Song" rows and break subsequent assertions.
    test.describe.configure({ retries: 0 });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToServing(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test('should add a song', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      const addBtn = page.locator('[data-testid="add-song-button"]');
      await addBtn.click();
      const songSearch = page.locator('[data-testid="song-search-dialog-input"] input');
      await songSearch.fill('Frolic');
      const searchBtn = page.locator('[data-testid="song-search-dialog-button"]');
      await searchBtn.click();
      const createBtn = page.locator('button').getByText('Create Manually');
      await expect(createBtn).toBeVisible({ timeout: 15000 });
      await createBtn.click();
      const songName = page.locator('[name="title"]');
      await expect(songName).toBeVisible({ timeout: 10000 });
      await songName.fill('Frolic');
      const artistName = page.locator('[name="artist"]');
      await artistName.fill('Luciano Michelini');
      const saveBtn = page.locator('[role="dialog"] button').getByText('Save', { exact: true });
      await saveBtn.click();
      await page.waitForURL(/\/serving\/songs\/[^/]+/, { timeout: 20000 });
      const validatedSong = page.getByRole('heading', { name: 'Frolic' });
      await expect(validatedSong).toBeVisible({ timeout: 10000 });
    });

    test('should add song key', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Song was created with a default key, so the Keys tablist already has
      // ["Default", "Add"]. Click "Add" to open the new-key form.
      const allTabs = page.locator('[role="tab"]');
      await expect(allTabs).toHaveCount(2, { timeout: 10000 });
      const addKeyTab = page.getByRole('tab', { name: /Add/ });
      await addKeyTab.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      // After save: two real keys (Default + the new one) plus the "Add" tab = 3.
      await expect(allTabs).toHaveCount(3, { timeout: 10000 });
    });

    test('should add link from song key menu', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      const addBtn = page.locator('[id="addBtnGroup"]');
      await addBtn.click();
      const addLinkBtn = page.locator('li').getByText('Add External Link');
      await addLinkBtn.click();
      const urlInput = page.locator('[name="url"]');
      await urlInput.fill('https://youtu.be/6MYAGyZlBY0?si=S4ULjdVbcBof2inI');
      const textInput = page.locator('[name="text"]');
      await textInput.fill('Frolic on YouTube');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedLink = page.locator('a').getByText('Frolic on YouTube');
      await expect(validatedLink).toHaveCount(1);
    });

    test('should edit link from song key menu', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Exact match — the songs page renders a "Play Frolic" link too, which
      // would make a substring locator strict-mode-violate.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Target the Edit button inside the list item for the YouTube link, not
      // the outermost edit icon (which now opens the Arrangement editor after
      // the Keys redesign).
      const linkRow = page.locator('li').filter({ hasText: 'Frolic on YouTube' });
      const editBtn = linkRow.locator('button:has(svg[data-testid="EditIcon"])').first();
      await editBtn.click();
      const textInput = page.locator('[name="text"]');
      await expect(textInput).toBeVisible({ timeout: 10000 });
      await textInput.fill('Frolic');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedLink = page.locator('a').getByText('Frolic', { exact: true });
      await expect(validatedLink).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing link from song key menu', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Keys load first, then a follow-up effect fetches links — the link
      // list re-renders mid-page-load. Wait for the YouTube link itself to
      // render before clicking its row's edit icon, then dispatch the click
      // directly so the click survives a layout shift between actionability
      // check and execution (the IconButton was detaching otherwise).
      await page.locator('a[href*="youtu.be"]').waitFor({ state: 'visible', timeout: 10000 });
      const linkRow = page.locator('li').filter({ has: page.locator('a[href*="youtu.be"]') });
      await linkRow.locator('button:has(svg[data-testid="EditIcon"])').first().dispatchEvent('click');
      const textInput = page.locator('[name="text"]');
      await expect(textInput).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(textInput).toHaveCount(0);
    });

    test('should delete link from song key menu', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Wait for the YouTube link to render, then dispatch the edit click
      // directly — the link list keeps re-rendering as keys/links/products
      // load, so a normal click hits the actionability retry/detach loop.
      await page.locator('a[href*="youtu.be"]').waitFor({ state: 'visible', timeout: 10000 });
      const linkRow = page.locator('li').filter({ has: page.locator('a[href*="youtu.be"]') });
      await linkRow.locator('button:has(svg[data-testid="EditIcon"])').first().dispatchEvent('click');
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('a[href*="youtu.be"]');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test('should edit song key', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Target the "Edit selected key" button directly. editIconButton().last()
      // is fragile here because the page has multiple EditIcon buttons (header,
      // External Links, Arrangement, Keys) and DOM order changed.
      const editBtn = page.getByRole('button', { name: 'Edit selected key' });
      await editBtn.click();
      const label = page.locator('[name="shortDescription"]');
      await expect(label).toBeVisible({ timeout: 10000 });
      await label.fill('Zacchaeus Key');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedEdit = page.locator('[role="tab"]').filter({ hasText: 'Zacchaeus Key' });
      await expect(validatedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing song key', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      const editBtn = page.getByRole('button', { name: 'Edit selected key' });
      await editBtn.click();
      const keySignature = page.locator('[name="keySignature"]');
      await expect(keySignature).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(keySignature).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete key', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Click the "Zacchaeus Key" tab so it becomes selected, then delete it.
      await page.locator('[role="tab"]').filter({ hasText: 'Zacchaeus Key' }).click();
      const editBtn = page.getByRole('button', { name: 'Edit selected key' });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('[role="tab"]').filter({ hasText: 'Zacchaeus Key' });
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test('should add external link', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Click the edit pencil next to the External Links heading to open
      // SongDetailLinksEdit, then click the Add (+) icon it renders.
      const extHeading = page.getByRole('heading', { name: 'External Links' });
      const extContainer = extHeading.locator('xpath=ancestor::div[1]/..');
      await extContainer.locator('button:has(svg[data-testid="EditIcon"])').first().click();
      await extContainer.locator('button:has(svg[data-testid="AddIcon"])').first().click();
      const serviceBox = page.locator('[role="combobox"]');
      await expect(serviceBox).toBeVisible({ timeout: 10000 });
      await serviceBox.click();
      const selService = page.locator('li').getByText('YouTube');
      await selService.click();
      const link = page.locator('[name="serviceKey"]');
      await link.fill('6MYAGyZlBY0');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await expect(page.getByRole('cell', { name: 'YouTube' })).toBeVisible({ timeout: 10000 });
    });

    test('should cancel adding external link', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      const extHeading = page.getByRole('heading', { name: 'External Links' });
      const extContainer = extHeading.locator('xpath=ancestor::div[1]/..');
      await extContainer.locator('button:has(svg[data-testid="EditIcon"])').first().click();
      await extContainer.locator('button:has(svg[data-testid="AddIcon"])').first().click();
      const serviceBox = page.locator('[role="combobox"]');
      await expect(serviceBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(serviceBox).toHaveCount(0);
    });

    test('should add lyrics', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      const editBtn = editIconButton(page).nth(2);
      await editBtn.click();
      const lyricBox = page.locator('[name="lyrics"]');
      await lyricBox.fill('No Lyrics');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedLyrics = page.locator('div').getByText('No Lyrics');
      await expect(validatedLyrics).toBeVisible({ timeout: 10000 });
      await expect(validatedLyrics).toHaveCount(1);
    });

    test('should cancel editing lyrics', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      const editBtn = editIconButton(page).nth(2);
      await editBtn.click();
      const lyricBox = page.locator('[name="lyrics"]');
      await expect(lyricBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(lyricBox).toHaveCount(0);
    });

    test('should delete arrangement', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      // Songs page renders both "Frolic" (link to song) and "Play Frolic"
      // (player link). Use exact match to avoid strict-mode violation.
      const song = page.locator('a').getByText('Frolic', { exact: true }).first();
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      const editBtn = editIconButton(page).nth(2);
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('a').getByText('Frolic');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should search for songs', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      // Tight match: the songs *list* page, not /serving/songs/<id> (detail).
      // On the detail page, "Frolic" matches the renamed YouTube link first,
      // and clicking it opens an external tab.
      await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
      // Wait for the songs-list query to settle so locator('a') sees list
      // links (which navigate to /serving/songs/<id>) rather than stale
      // detail-page anchors (which include the YouTube link renamed "Frolic").
      await page.locator('[data-testid="add-song-button"]').waitFor({ state: 'visible', timeout: 10000 });

      const searchBtn = page.locator('button').getByText('Search');
      await searchBtn.click();
      // After clicking Search, a search input renders; multiple inputs may be
      // on the page, so target the visible textbox by role + name fallback.
      const searchInput = page.locator('input[type="text"]').last();
      await searchInput.fill('Amazing Grace');
      await searchInput.press('Enter');
      // SongsPage filters client-side on title/artist substring; the demo
      // seed has at least one Amazing Grace song, possibly more arrangements.
      const results = page.locator('a').getByText('Amazing Grace');
      await expect(results.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe.serial('Tasks', () => {
    // Tasks tests share data — a retry would create duplicate task/automation
    // rows and break subsequent assertions.
    test.describe.configure({ retries: 0 });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToServing(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    // The tasks module on My Work is the compact (tabbed) TaskList — one tab is
    // visible at a time (Assigned to Me / My Groups / Created by Me), so counts are
    // per-tab. "Test Task" is created by Demo User, so it always lives on the
    // Created-by-Me tab regardless of who it's assigned to.
    test('should add a task', async () => {
      await openMyTasks(page);

      const addBtn = page.locator('[data-testid="add-task-button"]');
      await addBtn.click();
      const assignInput = page.locator('[data-testid="assign-to-input"]');
      await assignInput.click();
      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Demo User');
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('button').getByText('Select');
      await selectBtn.click();
      const taskName = page.locator('[name="title"]');
      await taskName.fill('Test Task');
      const taskNotes = page.locator('[name="note"]');
      await taskNotes.fill('Zacchaeus Testing (Playwright)');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      // New task is assigned to Demo User -> visible on the default Assigned-to-Me tab.
      const validatedTask = page.locator('a').getByText('Test Task');
      await expect(validatedTask).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel adding a task', async () => {
      await openMyTasks(page);

      const addBtn = page.locator('[data-testid="add-task-button"]');
      await addBtn.click();
      const assignInput = page.locator('[data-testid="assign-to-input"]');
      await expect(assignInput).toBeVisible({ timeout: 10000 });
      // The NewTask form re-renders during async loads; force-click avoids
      // the "element detached" race and target the last Cancel (in the form).
      const cancelBtn = page.locator('button').getByText('Cancel').last();
      await cancelBtn.click({ force: true });
      await expect(assignInput).toHaveCount(0, { timeout: 10000 });
    });

    test('should toggle show closed tasks', async () => {
      await openMyTasks(page);

      // On the default Assigned-to-Me tab the open task shows once.
      const task = page.locator('a').getByText('Test Task');
      await expect(task).toHaveCount(1);
      const closedBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedBtn.click();
      await expect(task).toHaveCount(0, { timeout: 10000 });
      const openBtn = page.locator('[data-testid="show-open-tasks-button"]');
      await openBtn.click();
      await expect(task).toHaveCount(1, { timeout: 10000 });
    });

    test('should reassign tasks', async () => {
      await openMyTasks(page);

      const task = page.locator('a').getByText('Test Task');
      await expect(task).toHaveCount(1);
      const selectedTask = page.locator('a').getByText('Test Task').first();
      await selectedTask.click()
      const assignBtn = page.locator('[title="Edit Assigned"]');
      await assignBtn.click();
      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Dorothy');
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('button').getByText('Select');
      await selectBtn.click();
      await openMyTasks(page);
      // Reassigned to Dorothy -> gone from the Assigned-to-Me tab (default).
      await expect(task).toHaveCount(0, { timeout: 10000 });
      // Still created by Demo User -> present on the Created-by-Me tab.
      await page.locator('[data-testid="tasklist-tab-created"]').click();
      await expect(task).toHaveCount(1, { timeout: 10000 });
    });

    test('should reassociate tasks', async () => {
      await openMyTasks(page);
      // The task was reassigned away from Demo User, so find it on the Created-by-Me tab.
      await page.locator('[data-testid="tasklist-tab-created"]').click();

      const task = page.locator('a').getByText('Test Task').first();
      await task.click()
      const associateBtn = page.locator('[title="Edit Associated"]');
      await associateBtn.click();
      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Grace Jackson');
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('button').getByText('Select');
      await selectBtn.click();
      // The task detail header reflects the new association (compact list rows omit it).
      await expect(page.getByText(/Grace Jackson/).first()).toBeVisible({ timeout: 10000 });
    });

    test('should close a task', async () => {
      await openMyTasks(page);
      await page.locator('[data-testid="tasklist-tab-created"]').click();

      const task = page.locator('a').getByText('Test Task').first();
      await task.click();
      const openBtn = page.locator('button').getByText('Open');
      await openBtn.click();
      const closedBtn = page.locator('li').getByText('Closed');
      await closedBtn.click();
      await openMyTasks(page);
      await page.locator('[data-testid="tasklist-tab-created"]').click();
      // Task is now closed -> invisible on the default "Open" filter.
      const task2 = page.locator('a').getByText('Test Task');
      await expect(task2).toHaveCount(0, { timeout: 10000 });
      const closedTasksBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedTasksBtn.click();
      // After switching to "Closed" filter, the task reappears on Created-by-Me.
      await expect(task2).toHaveCount(1, { timeout: 10000 });
    });
  });

  // Edge-case extensions: navigation surface from .notes/B1Admin-test-coverage-gaps.md §3.
  test.describe('Songs and Tasks navigation extras', () => {
    test('Songs page exposes Add Song affordance', async ({ page }) => {
      const songsLink = page.locator('[id="secondaryMenu"]').getByText('Songs').first();
      await songsLink.click();
      await page.waitForURL(/\/serving\/songs/, { timeout: 10000 });
      await expect(page.locator('button').getByText(/Add Song/i).first()).toBeVisible({ timeout: 10000 });
    });

    test('Serving subnav exposes My Work and Workflows links', async ({ page }) => {
      const tasksLink = page.locator('[id="secondaryMenu"]').getByText('My Work').first();
      await tasksLink.click();
      await page.waitForURL(/\/serving\/tasks/, { timeout: 10000 });
      const secondaryMenu = page.locator('[id="secondaryMenu"]');
      await expect(secondaryMenu.locator('a').getByText('My Work')).toBeVisible({ timeout: 10000 });
      await expect(secondaryMenu.locator('a').getByText('Workflows')).toBeVisible({ timeout: 10000 });
    });
  });
});
