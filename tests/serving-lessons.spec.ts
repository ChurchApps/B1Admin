import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Serving Management - Lessons', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const servingHomeBtn = page.locator('[data-testid="nav-item-serving"]');
    await servingHomeBtn.click();
    await expect(page).toHaveURL(/\/serving/);
  });

  test.describe('Lesson Plans', () => {
    test('should add lesson plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(200);

      const arrowBtn = page.locator('[d="m7 10 5 5 5-5z"]');
      await arrowBtn.click();
      const lessonBtn = page.locator('li').getByText('Schedule Lesson');
      await lessonBtn.click();
      await page.waitForTimeout(2500);
      const date = page.locator('[type="date"]');
      await date.fill('2025-03-01');
      await page.waitForTimeout(1000);
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(1000);
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2025');
      await expect(verifiedPlan).toHaveCount(1);
    });

    test('should edit lesson plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
      await editBtn.click();
      const date = page.locator('[id="name"]');
      await date.fill('Octavian Lesson');
      await page.waitForTimeout(200);
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedEdit = page.locator('a').getByText('Octavian Lesson');
      await expect(verifiedEdit).toHaveCount(1);
    });
  });

  test.describe('Positions', () => {
    test('should add position to lesson', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);

      const addBtn = page.locator('[data-testid="add-position-button"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Octavian Assignment');
      const volunteerGroup = page.locator('[role="combobox"]').last();
      await volunteerGroup.click();
      const octaviusTeam = page.locator('li').getByText('Octavius Team');
      await octaviusTeam.click();
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedPosition = page.locator('td button').getByText('Octavian Assignment');
      await expect(verifiedPosition).toHaveCount(1);
    });

    test('should edit lesson position', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);

      const assignment = page.locator('td button').getByText('Octavian Assignment');
      await assignment.click();
      const name = page.locator('[name="name"]');
      await name.fill('Octavius Assignment');
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedEdit = page.locator('td button').getByText('Octavius Assignment');
      await expect(verifiedEdit).toHaveCount(1);
    });

    test('should assign person to lesson position', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);

      const assignment = page.locator('td button').getByText('1 Person Needed');
      await assignment.click();
      const person = page.locator('td button').getByText('Dorothy Jackson');
      await person.click();
      await page.waitForTimeout(200);
      const verifiedAddition = page.locator('td button').getByText('Dorothy Jackson');
      await expect(verifiedAddition).toHaveCount(1);
    });

    test('should delete lesson position', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);

      const assignment = page.locator('td button').getByText('Octavius Assignment');
      await assignment.click();
      await page.waitForTimeout(200);
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(200);
      await expect(assignment).toHaveCount(0);
    });
  });

  test.describe('Times', () => {
    test('should add time to lesson', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);

      const addBtn = page.locator('[data-testid="add-time-button"]');
      await addBtn.click();
      const name = page.locator('[name="displayName"]');
      await name.fill('Octavian Service');
      const team = page.locator('[type="checkbox"]');
      await team.click();
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedTime = page.locator('td button').getByText('Octavian Service');
      await expect(verifiedTime).toHaveCount(1);
    });

    test('should edit lesson time', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);

      const time = page.locator('td button').getByText('Octavian Service');
      await time.click();
      const name = page.locator('[name="displayName"]');
      await name.fill('Octavius Service');
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedEdit = page.locator('td button').getByText('Octavius Service');
      await expect(verifiedEdit).toHaveCount(1);
    });

    test('should delete lesson time', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);

      const time = page.locator('td button').getByText('Octavius Service');
      await time.click();
      await page.waitForTimeout(200);
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(200);
      await expect(time).toHaveCount(0);
    });
  });

  test.describe('Service Order', () => {
    test('should add section to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const addBtn = page.locator('button').getByText('Add Section');
      await addBtn.click();
      const name = page.locator('[id="label"]');
      await name.fill('Octavian Section');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedSection = page.locator('div span').getByText('Octavian Section');
      await expect(verifiedSection).toHaveCount(1);
    });

    test('should edit service order section', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const editBtn = page.locator('button span').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[id="label"]');
      await name.fill('Octavius Section');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedSection = page.locator('div span').getByText('Octavius Section');
      await expect(verifiedSection).toHaveCount(1);
    });

    test('should add song to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const addBtn = page.locator('button span').getByText('add').last();
      await addBtn.click();
      const song = page.locator('li').getByText('Song');
      await song.click();
      const searchBar = page.locator('[name="searchText"]');
      await searchBar.fill('Amazing');
      const searchBtn = page.locator('[data-testid="song-search-button"]');
      await searchBtn.click();
      const keySelect = page.locator('button').getByText('Traditional');
      await keySelect.click();
      await page.waitForTimeout(200);
      const verifiedSong = page.locator('div a').getByText('Amazing Grace');
      await expect(verifiedSong).toHaveCount(1);
    });

    test('should add item to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const addBtn = page.locator('button span').getByText('add').last();
      await addBtn.click();
      const item = page.locator('li').getByText('Item');
      await item.click();
      const name = page.locator('[name="label"]');
      await name.fill('Octavian Item');
      const minutes = page.locator('[name="minutes"]');
      await minutes.fill('5');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedItem = page.locator('div').getByText('Octavian Item');
      await expect(verifiedItem).toHaveCount(1);
    });

    test('should edit service order item', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const editBtn = page.locator('button span').getByText('edit').last();
      await editBtn.click();
      const name = page.locator('[name="label"]');
      await name.fill('Octavius Item');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(200);
      const verifiedEdit = page.locator('div').getByText('Octavius Item');
      await expect(verifiedEdit).toHaveCount(1);
    });

    test('should add lesson action to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const addBtn = page.locator('button span').getByText('add').last();
      await addBtn.click();
      const action = page.locator('li').getByText('Lesson Action');
      await action.click();
      await page.waitForTimeout(200);
      const selectBtn = page.locator('button').getByText('Select Action');
      await selectBtn.click();
      await page.waitForTimeout(200);
      const verifiedAction = page.locator('div a').getByText('Test JPEG');
      await expect(verifiedAction).toHaveCount(1);
    });

    test('should add add-on to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const addBtn = page.locator('button span').getByText('add').last();
      await addBtn.click();
      const addition = page.locator('li').getByText('Add-On');
      await addition.click();
      const category = page.locator('[role="combobox"]');
      await category.click();
      const scriptureSong = page.locator('li').getByText('scripture song');
      await scriptureSong.click();
      const starTrek = page.locator('p').getByText('First Add On');
      await starTrek.click();
      const selectBtn = page.locator('button').getByText('Select Add-On');
      await selectBtn.click()
      await page.waitForTimeout(200);
      const verifiedAddition = page.locator('div a').getByText('First Add On');
      await expect(verifiedAddition).toHaveCount(1);
    });

    test('should delete add-on from service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await lesson.click();
      await page.waitForTimeout(200);
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await servOrder.click();
      await page.waitForTimeout(200);

      const editBtn = page.locator('button span').getByText('edit').last();
      await editBtn.click();
      await page.waitForTimeout(200);
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(200);
      const verifiedDeletion = page.locator('div a').getByText('First Add On');
      await expect(verifiedDeletion).toHaveCount(0);
    });
  });

  test.describe('Cleanup', () => {
    test('should delete lesson plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      await page.waitForTimeout(200);
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      await page.waitForTimeout(1000);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]').last();
      await editBtn.click();
      await page.waitForTimeout(200);
      const deleteBtn = page.locator('[id="delete"]');
      await deleteBtn.click();
      const verifiedEdit = page.locator('a').getByText('Octavian Lesson');
      await expect(verifiedEdit).toHaveCount(0);
    });
  });
});
