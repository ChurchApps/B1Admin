import type { Page } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { editIconButton, addIconButton, checkIconButton } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToServing } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Serving Management - Songs & Tasks', () => {

  test.describe.serial('Songs', () => {
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Target the Edit button inside the list item for the YouTube link, not
      // the outermost edit icon (which now opens the Arrangement editor after
      // the Keys redesign).
      const linkRow = page.locator('li').filter({ hasText: 'Frolic on YouTube' });
      const editBtn = linkRow.locator('button').first();
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // The link was renamed to "Frolic" in the previous test; target its row
      // specifically via the YouTube URL, which is stable across renames.
      const linkRow = page.locator('li').filter({ has: page.locator('a[href*="youtu.be"]') });
      await linkRow.locator('button').first().click();
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      const linkRow = page.locator('li').filter({ has: page.locator('a[href*="youtu.be"]') });
      await linkRow.locator('button').first().click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('a[href*="youtu.be"]');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test('should edit song key', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Target the "Edit selected key" button directly. editIconButton().last()
      // is fragile here because the page has multiple EditIcon buttons (header,
      // External Links, Arrangement, Keys) and DOM order changed.
      const editBtn = page.getByRole('button', { name: 'Edit selected key' });
      await editBtn.click();
      const label = page.locator('[name="shortDescription"]');
      await expect(label).toBeVisible({ timeout: 10000 });
      await label.fill('Octavian Key');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedEdit = page.locator('[role="tab"]').filter({ hasText: 'Octavian Key' });
      await expect(validatedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing song key', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.getByRole('heading', { name: 'Frolic' })).toBeVisible({ timeout: 10000 });
      // Click the "Octavian Key" tab so it becomes selected, then delete it.
      await page.locator('[role="tab"]').filter({ hasText: 'Octavian Key' }).click();
      const editBtn = page.getByRole('button', { name: 'Edit selected key' });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('[role="tab"]').filter({ hasText: 'Octavian Key' });
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test('should add external link', async () => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
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
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const searchBtn = page.locator('button').getByText('Search');
      await searchBtn.click();
      const searchInput = page.locator('input');
      await searchInput.fill('Amazing Grace');
      await searchInput.press('Enter');
      const results = page.locator('a');
      await expect(results).toHaveCount(7);
    });
  });

  test.describe.serial('Tasks', () => {
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

    test('should add a task', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

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
      await taskNotes.fill('Octavian Testing (Playwright)');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedTask = page.locator('a').getByText('Test Task');
      await expect(validatedTask).toHaveCount(2, { timeout: 10000 });
    });

    test('should cancel adding a task', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

      const addBtn = page.locator('[data-testid="add-task-button"]');
      await addBtn.click();
      const assignInput = page.locator('[data-testid="assign-to-input"]');
      await expect(assignInput).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(assignInput).toHaveCount(0);
    });

    test('should toggle show closed tasks', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

      // After "should add a task" creates one task assigned to Demo User, it appears
      // in both "Assigned to Me" and "Created by Me" sections -> 2 links.
      const task = page.locator('a').getByText('Test Task');
      await expect(task).toHaveCount(2);
      const closedBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedBtn.click();
      await expect(task).toHaveCount(0, { timeout: 10000 });
      const openBtn = page.locator('[data-testid="show-open-tasks-button"]');
      await openBtn.click();
      await expect(task).toHaveCount(2, { timeout: 10000 });
    });

    test('should reassign tasks', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

      const task = page.locator('a').getByText('Test Task');
      await expect(task).toHaveCount(2);
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
      await tasksBtn.click();
      // After reassignment, task is no longer in "Assigned to Me" but still in
      // "Created by Me" -> 1 link remaining.
      await expect(task).toHaveCount(1, { timeout: 10000 });
    });

    test('should reassociate tasks', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

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
      await tasksBtn.click();
      // After reassociation, the single remaining list entry shows
      // "Grace Jackson" as the Associated-With label.
      const validatedAssociation = page.locator('p').getByText('Grace Jackson');
      await expect(validatedAssociation).toHaveCount(1, { timeout: 10000 });
    });

    test('should close a task', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

      const task = page.locator('a').getByText('Test Task').first();
      await task.click();
      const openBtn = page.locator('button').getByText('Open');
      await openBtn.click();
      const closedBtn = page.locator('li').getByText('Closed');
      await closedBtn.click();
      await tasksBtn.click();
      // Task is now closed -> invisible on the default "Open" filter.
      await expect(task).toHaveCount(0, { timeout: 10000 });
      const closedTasksBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedTasksBtn.click();
      // After switching to "Closed" filter, the task reappears in "Created by Me".
      await expect(task).toHaveCount(1, { timeout: 10000 });
    });

    test('should add an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const addBtn = page.locator('button').getByText('Add Automation');
      await addBtn.click();
      const autoName = page.locator('[name="title"]');
      await expect(autoName).toBeVisible({ timeout: 10000 });
      await autoName.fill('Octavian Test Automation');
      const recurranceBox = page.locator('[id="mui-component-select-recurs"]');
      await recurranceBox.click();
      const selRecurrance = page.locator('[data-value="yearly"]');
      await selRecurrance.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedAuto = page.locator('h6').getByText('Octavian Test Automation');
      await expect(validatedAuto).toBeVisible({ timeout: 10000 });
      await expect(validatedAuto).toHaveCount(1);
    });

    test('should cancel adding an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const addBtn = page.locator('button').getByText('Add Automation');
      await addBtn.click();
      const autoName = page.locator('[name="title"]');
      await expect(autoName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(autoName).toHaveCount(0);
    });

    test('should add task to an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const addBtn = page.locator('button').getByText('Add Action');
      await addBtn.click();
      const assignBox = page.locator('input').nth(1);
      await assignBox.click();
      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Demo User');
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('button').getByText('Select');
      await selectBtn.click();
      const taskName = page.locator('[name="title"]');
      await taskName.fill('Octavian Test Task');
      const taskNotes = page.locator('[name="note"]');
      await taskNotes.fill('Octavian Testing (Playwright)');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedTask = page.locator('p').getByText('Octavian Test Task');
      await expect(validatedTask).toBeVisible({ timeout: 10000 });
      await expect(validatedTask).toHaveCount(1);
    });

    test('should cancel adding task to an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const addBtn = page.locator('button').getByText('Add Action');
      await addBtn.click();
      const assignBox = page.locator('input').nth(1);
      await expect(assignBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(assignBox).toHaveCount(0);
    });

    test('should edit task on automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const editBtn = editIconButton(page).nth(1);
      await editBtn.click();
      const taskName = page.locator('[name="title"]');
      await taskName.fill('Octavius Test Task');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedTask = page.locator('p').getByText('Octavius Test Task');
      await expect(validatedTask).toBeVisible({ timeout: 10000 });
      await expect(validatedTask).toHaveCount(1);
    });

    test('should add condition to an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const addBtn = page.locator('button').getByText('Add Condition');
      await addBtn.click();
      const typeBox = page.locator('[id="mui-component-select-groupType"]')
      await typeBox.click();
      const selType = page.locator('[data-value="or"]');
      await selType.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();

      const addConBtn = addIconButton(page).last();
      await expect(addConBtn).toBeVisible({ timeout: 10000 });
      await addConBtn.click();
      const addCon = page.locator('li').getByText('Add Condition');
      await addCon.click();
      const conType = page.locator('[role="combobox"]').first();
      await conType.click();
      const selConType = page.locator('[data-value="displayName"]');
      await selConType.click();
      const name = page.locator('[name="value"]');
      await name.fill('Demo User');
      await saveBtn.click();
      const validatedCon = page.locator('p').getByText('Display Name is Demo User');
      await expect(validatedCon).toBeVisible({ timeout: 10000 });
      await expect(validatedCon).toHaveCount(1);
    });

    test('should edit an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const autoName = page.locator('[name="title"]');
      await autoName.fill('Octavius Test Automation');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedAuto = page.locator('h6').getByText('Octavius Test Automation');
      await expect(validatedAuto).toBeVisible({ timeout: 10000 });
      await expect(validatedAuto).toHaveCount(1);
    });

    test('should cancel editing an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavius Test Automation');
      await auto.click();
      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const autoName = page.locator('[name="title"]');
      await expect(autoName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(autoName).toHaveCount(0);
    });

    test('should delete an automation', async () => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavius Test Automation');
      await auto.click();
      const editBtn = editIconButton(page).first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.locator('h6').getByText('Octavius Test Automation');
      await expect(validatedDeletion).toHaveCount(0);
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

    test('Tasks page exposes the Tasks/Automations tab navigation', async ({ page }) => {
      const tasksLink = page.locator('[id="secondaryMenu"]').getByText('Tasks').first();
      await tasksLink.click();
      await page.waitForURL(/\/serving\/tasks/, { timeout: 10000 });
      await expect(page.locator('button[role="tab"]').getByText('Automations')).toBeVisible({ timeout: 10000 });
    });
  });
});
