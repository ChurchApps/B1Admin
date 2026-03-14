import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Serving Management - Songs & Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const servingHomeBtn = page.locator('[data-testid="nav-item-serving"]');
    await servingHomeBtn.click();
    await expect(page).toHaveURL(/\/serving/);
  });

  test.describe('Songs', () => {
    test('should add a song', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const addBtn = page.locator('[data-testid="add-song-button"]');
      await addBtn.click();
      const songSearch = page.locator('input');
      await songSearch.fill('Frolic');
      const searchBtn = page.locator('[data-testid="song-search-dialog-button"]');
      await searchBtn.click();
      const createBtn = page.locator('button').getByText('Create Manually');
      await createBtn.click();
      const songName = page.locator('[name="title"]');
      await songName.fill('Frolic');
      const artistName = page.locator('[name="artist"]');
      await artistName.fill('Luciano Michelini');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedSong = page.locator('h4').getByText('Frolic');
      await expect(validatedSong).toBeVisible({ timeout: 10000 });
      await expect(validatedSong).toHaveCount(1);
    });

    test('should add song key', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const addKeyBtn = page.locator('[role="tab"]');
      await addKeyBtn.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await expect(addKeyBtn).toHaveCount(2);
    });

    test('should add link from song key menu', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
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

    test('should edit link from song key menu', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).last();
      await editBtn.click();
      const textInput = page.locator('[name="text"]');
      await textInput.fill('Frolic');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedLink = page.locator('a').getByText('Frolic');
      await expect(validatedLink).toHaveCount(1);
    });

    test('should cancel editing link from song key menu', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).last();
      await editBtn.click();
      const textInput = page.locator('[name="text"]');
      await expect(textInput).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(textInput).toHaveCount(0);
    });

    test('should delete link from song key menu', async ({ page }) => {
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
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('a').getByText('Frolic');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should edit song key', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).last();
      await editBtn.click();
      const label = page.locator('textarea').first();
      await label.fill('Octavian Key');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedEdit = page.locator('[role="tab"]').getByText('Octavian Key');
      await expect(validatedEdit).toHaveCount(1);
    });

    test('should cancel editing song key', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).last();
      await editBtn.click();
      const label = page.locator('textarea').first();
      await expect(label).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(label).toHaveCount(0);
    });

    test('should delete key', async ({ page }) => {
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
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('[role="tab"]').getByText('Octavian Key');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should add external link', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).nth(1);
      await editBtn.click();
      const addBtn = page.locator('button').filter({ has: page.locator('[d*="M19 13h-6"]') }).nth(2);
      await addBtn.click();
      const serviceBox = page.locator('[role="combobox"]');
      await serviceBox.click();
      const selService = page.locator('li').getByText('YouTube');
      await selService.click();
      const link = page.locator('[name="serviceKey"]');
      await link.fill('https://www.youtube.com/watch?v=6MYAGyZlBY0');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const checkBtn = page.locator('button').filter({ has: page.locator('[d*="M9 16.2"]') });
      await checkBtn.click();

      const validatedAddition = page.locator('a img');
      await expect(validatedAddition).toBeVisible({ timeout: 10000 });
      await expect(validatedAddition).toHaveCount(1);
    });

    test('should cancel adding external link', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).nth(1);
      await editBtn.click();
      const addBtn = page.locator('button').filter({ has: page.locator('[d*="M19 13h-6"]') }).nth(2);
      await addBtn.click();
      const serviceBox = page.locator('[role="combobox"]');
      await expect(serviceBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(serviceBox).toHaveCount(0);
    });

    test('should add lyrics', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).nth(2);
      await editBtn.click();
      const lyricBox = page.locator('[name="lyrics"]');
      await lyricBox.fill('No Lyrics');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedLyrics = page.locator('div').getByText('No Lyrics');
      await expect(validatedLyrics).toBeVisible({ timeout: 10000 });
      await expect(validatedLyrics).toHaveCount(1);
    });

    test('should cancel editing lyrics', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await expect(page).toHaveURL(/\/serving\/songs/, { timeout: 10000 });

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).nth(2);
      await editBtn.click();
      const lyricBox = page.locator('[name="lyrics"]');
      await expect(lyricBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(lyricBox).toHaveCount(0);
    });

    test('should delete arrangement', async ({ page }) => {
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
      await expect(page.locator('h4').getByText('Frolic')).toBeVisible({ timeout: 10000 });
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).nth(2);
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('a').getByText('Frolic');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should search for songs', async ({ page }) => {
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

  test.describe('Tasks', () => {
    test('should add a task', async ({ page }) => {
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

    test('should cancel adding a task', async ({ page }) => {
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

    test('should toggle show closed tasks', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

      const task = page.locator('a').getByText('Test Task');
      await expect(task).toHaveCount(4);
      const closedBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedBtn.click();
      await expect(task).toHaveCount(0, { timeout: 10000 });
      const openBtn = page.locator('[data-testid="show-open-tasks-button"]');
      await openBtn.click();
      await expect(task).toHaveCount(4, { timeout: 10000 });
    });

    test('should reassign tasks', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });

      const task = page.locator('a').getByText('Test Task');
      await expect(task).toHaveCount(4);
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
      await expect(task).toHaveCount(3, { timeout: 10000 });
    });

    test('should reassociate tasks', async ({ page }) => {
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
      const validatedAssociation = page.locator('p').getByText('Grace Jackson');
      await expect(validatedAssociation).toHaveCount(2, { timeout: 10000 });
    });

    test('should close a task', async ({ page }) => {
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
      await expect(task).toHaveCount(1, { timeout: 10000 });
      const closedTasksBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedTasksBtn.click();
      await expect(task).toHaveCount(1);
    });

    test('should add an automation', async ({ page }) => {
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

    test('should cancel adding an automation', async ({ page }) => {
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

    test('should add task to an automation', async ({ page }) => {
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

    test('should cancel adding task to an automation', async ({ page }) => {
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

    test('should edit task on automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).nth(1);
      await editBtn.click();
      const taskName = page.locator('[name="title"]');
      await taskName.fill('Octavius Test Task');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedTask = page.locator('p').getByText('Octavius Test Task');
      await expect(validatedTask).toBeVisible({ timeout: 10000 });
      await expect(validatedTask).toHaveCount(1);
    });

    test('should add condition to an automation', async ({ page }) => {
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

      const addConBtn = page.locator('button').filter({ has: page.locator('[d*="M19 13h-6"]') }).last();
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

    test('should edit an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).first();
      await editBtn.click();
      const autoName = page.locator('[name="title"]');
      await autoName.fill('Octavius Test Automation');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedAuto = page.locator('h6').getByText('Octavius Test Automation');
      await expect(validatedAuto).toBeVisible({ timeout: 10000 });
      await expect(validatedAuto).toHaveCount(1);
    });

    test('should cancel editing an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavius Test Automation');
      await auto.click();
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).first();
      await editBtn.click();
      const autoName = page.locator('[name="title"]');
      await expect(autoName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(autoName).toHaveCount(0);
    });

    test('should delete an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await expect(page).toHaveURL(/\/tasks/, { timeout: 10000 });
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavius Test Automation');
      await auto.click();
      const editBtn = page.locator('button').filter({ has: page.locator('[d*="M3 17.25"]') }).first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.locator('h6').getByText('Octavius Test Automation');
      await expect(validatedDeletion).toHaveCount(0);
    });
  });
});
