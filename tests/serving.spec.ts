import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Serving Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const servingHomeBtn = page.locator('[data-testid="nav-item-serving"]');
    await servingHomeBtn.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/serving/);
  });

  /* test('should load serving page', async ({ page }) => {
    const servingHeader = page.locator('h4').getByText('Select a Ministry');
    await servingHeader.click();
  }); */

  test.describe('Plans', () => {
    test('should add ministry', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Ministry');
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await minName.fill('Octavian Ministry');
      const saveBtn = page.locator('button').getByText('Add').first();
      await saveBtn.click();
      const verifiedMin = page.locator('[role="tab"]').getByText('Octavian Ministry');
      await expect(verifiedMin).toHaveCount(1);
    });

    test('should cancel adding ministry', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Ministry');
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await expect(minName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('cancel');
      await cancelBtn.click();
      await expect(minName).toHaveCount(0);
    });

    test('should manage ministry', async ({ page }) => {
      const manageBtn = page.locator('[role="tab"]').getByText('Octavian Ministry');
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
    });

    test('should add person to ministry', async ({ page }) => {
      const manageBtn = page.locator('a').getByText('Manage').nth(1);
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Dorothy');
      const searchBtn = page.locator('[data-testid="person-add-search-button"]');
      await searchBtn.click();
      const addBtn = page.locator('button').getByText('Add');
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText('Dorothy Jackson');
      await expect(verifiedPerson).toHaveCount(1);
    });

    test('should advanced add person to ministry', async ({ page }) => {
      const manageBtn = page.locator('a').getByText('Manage').nth(1);
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const advBtn = page.locator('button').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]');
      await firstName.fill('Grace');
      const searchBtn = page.locator('button').getByText('Search').last();
      await searchBtn.click();
      await page.waitForTimeout(500);
      const addBtn = page.locator('button').getByText('Add');
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText('Grace Jackson');
      await expect(verifiedPerson).toHaveCount(1);
    });

    test('should promote person to ministry leader', async ({ page }) => {
      const manageBtn = page.locator('a').getByText('Manage').nth(1);
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const promoteBtn = page.locator('button').getByText('key').first();
      await promoteBtn.click();
      await page.waitForTimeout(500);
      await page.reload();
      const verifiedPromoted = page.locator('button').getByText('key_off');
      await expect(verifiedPromoted).toHaveCount(1);
    });

    test('should remove person from ministry', async ({ page }) => {
      const manageBtn = page.locator('a').getByText('Manage').nth(1);
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const removeBtn = page.locator('button').getByText('person_remove').last();
      await removeBtn.click();
      const verifiedRemoved = page.locator('[id="groupMembersBox"] a').getByText('Grace Jackson');
      await expect(verifiedRemoved).toHaveCount(0);
    });

    test('should edit ministry', async ({ page }) => {
      const manageBtn = page.locator('a').getByText('Manage').nth(1);
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      await page.waitForTimeout(500);
      const minName = page.locator('[name="name"]');
      await minName.fill('Octavius Ministry');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedHeader = page.locator('p').getByText('Octavius Ministry');
      await expect(verifiedHeader).toHaveCount(1);
    });

    test('should cancel editing ministry', async ({ page }) => {
      const manageBtn = page.locator('a').getByText('Manage').nth(1);
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const minName = page.locator('[name="name"]');
      await page.waitForTimeout(500);
      await expect(minName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(minName).toHaveCount(0);
    });

    test('should create plan type', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);

      const addBtn = page.locator('button').getByText('Create Plan Type');
      /* const secondaryAddBtn = page.locator('button').getByText('Add Plan Type');
      const eitherAddBtn = addBtn.or(secondaryAddBtn); */
      await addBtn.click();
      const typeName = page.locator('[type="text"]');
      await typeName.fill('Octavian Type');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedType = page.locator('a').getByText('Octavian Type');
      await expect(verifiedType).toHaveCount(1);
    });

    test('should edit plan type', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const typeName = page.locator('[type="text"]');
      await typeName.fill('Octavius Type');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedType = page.locator('a').getByText('Octavius Type');
      await expect(verifiedType).toHaveCount(1);
    });

    test('should cancel editing plan type', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const typeName = page.locator('[type="text"]');
      await expect(typeName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(typeName).toHaveCount(0);
    });

    test('should add service plan', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const plansBtn = page.locator('button').getByText('Plans').last();
      await plansBtn.click();

      const addBtn = page.locator('[data-testid="add-plan-button"]');
      await addBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill('Mar 10, 2025');
      const date = page.locator('[id="serviceDate"]');
      await date.fill('2025-03-01');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedPlan = page.locator('a').getByText('Mar 10, 2025');
      await expect(verifiedPlan).toHaveCount(1);
    });

    test('should edit service plan', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const plansBtn = page.locator('button').getByText('Plans').last();
      await plansBtn.click();

      const editBtn = page.locator('button').getByText('Edit');
      await editBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill('Mar 1, 2025');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2025');
      await expect(verifiedPlan).toHaveCount(1);
    });

    test('should cancel editing service plan', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      await page.waitForTimeout(500);
      const plansBtn = page.locator('button').getByText('Plans').last();
      await plansBtn.click();

      const editBtn = page.locator('button').getByText('Edit');
      await editBtn.click();
      const planName = page.locator('[name="name"]');
      await expect(planName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(planName).toHaveCount(0);
    });

    test('should delete service plan', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const plansBtn = page.locator('button').getByText('Plans').last();
      await plansBtn.click();

      const editBtn = page.locator('button').getByText('Edit');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2025');
      await expect(verifiedPlan).toHaveCount(0);
    });

    test('should add team', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const teamsBtn = page.locator('button').getByText('Teams');
      await teamsBtn.click();

      const addBtn = page.locator('[data-testid="add-team-button"]');
      await addBtn.click();
      const teamName = page.locator('[name="name"]');
      await teamName.fill('Octavian Team');
      const saveBtn = page.locator('button').getByText('Add');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedTeam = page.locator('a').getByText('Octavian Team');
      await expect(verifiedTeam).toHaveCount(1);
    });

    test('should add person to team', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const teamsBtn = page.locator('button').getByText('Teams');
      await teamsBtn.click();
      const manageBtn = page.locator('a').getByText('Octavian Team');
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Dorothy');
      const searchBtn = page.locator('[data-testid="person-add-search-button"]');
      await searchBtn.click();
      await page.waitForTimeout(2000);
      const addBtn = page.locator('button').getByText('Add');
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText('Dorothy Jackson');
      await expect(verifiedPerson).toHaveCount(1);
    });

    test('should advanced add person to team', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const teamsBtn = page.locator('button').getByText('Teams');
      await teamsBtn.click();
      const manageBtn = page.locator('a').getByText('Octavian Team');
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const advBtn = page.locator('button').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]');
      await firstName.fill('Grace');
      const searchBtn = page.locator('button').getByText('Search').last();
      await searchBtn.click();
      await page.waitForTimeout(500);
      const addBtn = page.locator('button').getByText('Add');
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText('Grace Jackson');
      await expect(verifiedPerson).toHaveCount(1);
    });

    test('should promote person to team leader', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const teamsBtn = page.locator('button').getByText('Teams');
      await teamsBtn.click();
      const manageBtn = page.locator('a').getByText('Octavian Team');
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const promoteBtn = page.locator('button').getByText('key').first();
      await promoteBtn.click();
      await page.waitForTimeout(500);
      await page.reload();
      const verifiedPromoted = page.locator('button').getByText('key_off');
      await expect(verifiedPromoted).toHaveCount(1);
    });

    test('should remove person from team', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const teamsBtn = page.locator('button').getByText('Teams');
      await teamsBtn.click();
      const manageBtn = page.locator('a').getByText('Octavian Team');
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const removeBtn = page.locator('button').getByText('person_remove').last();
      await removeBtn.click();
      const verifiedRemoved = page.locator('[id="groupMembersBox"] a').getByText('Grace Jackson');
      await expect(verifiedRemoved).toHaveCount(0);
    });

    test('should edit team', async ({ page }) => {
      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const teamsBtn = page.locator('button').getByText('Teams');
      await teamsBtn.click();
      const manageBtn = page.locator('a').getByText('Octavian Team');
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const teamName = page.locator('[name="name"]');
      await teamName.fill('Octavius Team');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedHeader = page.locator('p').getByText('Octavius Team');
      await expect(verifiedHeader).toHaveCount(1);
    });

    test('should delete team', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const minBtn = page.locator('a').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/plans\/ministries\/[^/]+/);
      const teamsBtn = page.locator('button').getByText('Teams');
      await teamsBtn.click();
      const manageBtn = page.locator('a').getByText('Octavius Team');
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const verifiedRemoved = page.locator('table a').getByText('Octavius Team');
      await expect(verifiedRemoved).toHaveCount(0);
    });

    test('should delete ministry', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const manageBtn = page.locator('a').getByText('Manage').nth(1);
      await manageBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const verifiedRemoved = page.locator('table a').getByText('Octavius Ministry');
      await expect(verifiedRemoved).toHaveCount(0);
    });
  });

  test.describe('Songs', () => {
    test('should add a song', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

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
      await page.waitForTimeout(500);
      const validatedSong = page.locator('h4').getByText('Frolic');
      await expect(validatedSong).toHaveCount(1);
    });

    test('should add song key', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      const addKeyBtn = page.locator('[role="tab"]');
      await addKeyBtn.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await expect(addKeyBtn).toHaveCount(2);
    });

    test('should add link from song key menu', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('a').getByText('Frolic');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should edit song key', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      const validatedDeletion = page.locator('[role="tab"]').getByText('Octavian Key');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should add external link', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').nth(1);
      await editBtn.click();
      const addBtn = page.locator('[d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"]').nth(2);
      await addBtn.click();
      const serviceBox = page.locator('[role="combobox"]');
      await serviceBox.click();
      const selService = page.locator('li').getByText('YouTube');
      await selService.click();
      const link = page.locator('[name="serviceKey"]');
      await link.fill('https://www.youtube.com/watch?v=6MYAGyZlBY0');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const checkBtn = page.locator('[d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"]');
      await checkBtn.click();

      await page.waitForTimeout(2000);
      const validatedAddition = page.locator('a img');
      await expect(validatedAddition).toHaveCount(1);
    });

    test('should cancel adding external link', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').nth(1);
      await editBtn.click();
      const addBtn = page.locator('[d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"]').nth(2);
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').nth(2);
      await editBtn.click();
      const lyricBox = page.locator('[name="lyrics"]');
      await lyricBox.fill('No Lyrics');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const validatedLyrics = page.locator('div').getByText('No Lyrics');
      await expect(validatedLyrics).toHaveCount(1);
    });

    test('should cancel editing lyrics', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').nth(2);
      await editBtn.click();
      const lyricBox = page.locator('[name="lyrics"]');
      await expect(lyricBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

      const song = page.locator('a').getByText('Frolic');
      await song.click();
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').nth(2);
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete').last();
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('a').getByText('Frolic');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should search for songs', async ({ page }) => {
      const songsBtn = page.locator('[id="secondaryMenu"] a').getByText('Songs');
      await songsBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/serving\/songs/);

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
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/tasks/);

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
      await page.waitForTimeout(500);
      const validatedTask = page.locator('a').getByText('Test Task');
      await expect(validatedTask).toHaveCount(2);
    });

    test('should cancel adding a task', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/tasks/);

      const addBtn = page.locator('[data-testid="add-task-button"]');
      await addBtn.click();
      const assignInput = page.locator('[data-testid="assign-to-input"]');
      await expect(assignInput).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(assignInput).toHaveCount(0);
    });

    test('should toggle show closed tasks', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/tasks/);

      const task = page.locator('a').getByText('Test Task');
      await expect(task).toHaveCount(4);
      const closedBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedBtn.click();
      await page.waitForTimeout(500);
      await expect(task).toHaveCount(0);
      const openBtn = page.locator('[data-testid="show-open-tasks-button"]');
      await openBtn.click();
      await page.waitForTimeout(500);
      await expect(task).toHaveCount(4);
    });

    test('should reassign tasks', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/tasks/);

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
      await page.waitForTimeout(2000);
      await expect(task).toHaveCount(3);
    });

    test('should reassociate tasks', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/tasks/);

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
      await page.waitForTimeout(2000);
      const validatedAssociation = page.locator('p').getByText('Grace Jackson');
      await expect(validatedAssociation).toHaveCount(2);
    });

    test('should close a task', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/tasks/);

      const task = page.locator('a').getByText('Test Task').first();
      await task.click();
      const openBtn = page.locator('button').getByText('Open');
      await openBtn.click();
      const closedBtn = page.locator('li').getByText('Closed');
      await closedBtn.click();
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      await expect(task).toHaveCount(1);
      const closedTasksBtn = page.locator('[data-testid="show-closed-tasks-button"]');
      await closedTasksBtn.click();
      await expect(task).toHaveCount(1);
    });

    test('should add an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const addBtn = page.locator('button').getByText('Add Automation');
      await addBtn.click();
      await page.waitForTimeout(500);
      const autoName = page.locator('[name="title"]');
      await autoName.fill('Octavian Test Automation');
      const recurranceBox = page.locator('[id="mui-component-select-recurs"]');
      await recurranceBox.click();
      const selRecurrance = page.locator('[data-value="yearly"]');
      await selRecurrance.click();
      /* const inactiveCheck = page.locator('[type="checkbox"]');
      await inactiveCheck.click(); */
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const validatedAuto = page.locator('h6').getByText('Octavian Test Automation');
      await expect(validatedAuto).toHaveCount(1);
    });

    test('should cancel adding an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
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
      await page.waitForTimeout(2000);
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
      await page.waitForTimeout(500);
      const validatedTask = page.locator('p').getByText('Octavian Test Task');
      await expect(validatedTask).toHaveCount(1);
    });

    test('should cancel adding task to an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
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
      await page.waitForTimeout(500);
      await expect(assignBox).toHaveCount(0);
    });

    test('should edit task on automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').nth(1);
      await editBtn.click();
      const taskName = page.locator('[name="title"]');
      await taskName.fill('Octavius Test Task');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const validatedTask = page.locator('p').getByText('Octavius Test Task');
      await expect(validatedTask).toHaveCount(1);
    });

    test('should add condition to an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
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
      await page.waitForTimeout(500);

      const addConBtn = page.locator('[d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"]').last();
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
      await page.waitForTimeout(500);
      const validatedCon = page.locator('p').getByText('Display Name is Demo User');
      await expect(validatedCon).toHaveCount(1);
    });

    test('should edit an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavian Test Automation');
      await auto.click();
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').first();
      await editBtn.click();
      const autoName = page.locator('[name="title"]');
      await autoName.fill('Octavius Test Automation');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const validatedAuto = page.locator('h6').getByText('Octavius Test Automation');
      await expect(validatedAuto).toHaveCount(1);
    });

    test('should cancel editing an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavius Test Automation');
      await auto.click();
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').first();
      await editBtn.click();
      const autoName = page.locator('[name="title"]');
      await expect(autoName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(2000);
      await expect(autoName).toHaveCount(0);
    });

    test('should delete an automation', async ({ page }) => {
      const tasksBtn = page.locator('[id="secondaryMenu"] a').getByText('Tasks');
      await tasksBtn.click();
      await page.waitForTimeout(2000);
      const automationsBtn = page.locator('[role="tablist"] button').getByText('Automations');
      await automationsBtn.click();
      await expect(page).toHaveURL(/\/tasks\/automations/);

      const auto = page.locator('h6').getByText('Octavius Test Automation');
      await auto.click();
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').first();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(2000);
      const validatedDeletion = page.locator('h6').getByText('Octavius Test Automation');
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

});