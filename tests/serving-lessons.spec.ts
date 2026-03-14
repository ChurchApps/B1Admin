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
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const arrowBtn = page.locator('[d="m7 10 5 5 5-5z"]');
      await expect(arrowBtn).toBeVisible({ timeout: 10000 });
      await arrowBtn.click();
      const lessonBtn = page.locator('li').getByText('Schedule Lesson');
      await lessonBtn.click();
      const date = page.locator('[type="date"]');
      await expect(date).toBeVisible({ timeout: 10000 });
      await date.fill('2025-03-01');
      const saveBtn = page.locator('button').getByText('Save');
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2025');
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit lesson plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button span').getByText('edit').last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const date = page.locator('[id="name"]');
      await expect(date).toBeVisible({ timeout: 10000 });
      await date.fill('Octavian Lesson');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedEdit = page.locator('a').getByText('Octavian Lesson');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });
  });

  test.describe('Positions', () => {
    test('should add position to lesson', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const addBtn = page.locator('[data-testid="add-position-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Octavian Assignment');
      const volunteerGroup = page.locator('[role="combobox"]').last();
      await volunteerGroup.click();
      const octaviusTeam = page.locator('li').getByText('Octavius Team');
      await octaviusTeam.click();
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedPosition = page.locator('td button').getByText('Octavian Assignment');
      await expect(verifiedPosition).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit lesson position', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const assignment = page.locator('td button').getByText('Octavian Assignment');
      await expect(assignment).toBeVisible({ timeout: 10000 });
      await assignment.click();
      const name = page.locator('[name="name"]');
      await name.fill('Octavius Assignment');
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedEdit = page.locator('td button').getByText('Octavius Assignment');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should assign person to lesson position', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const assignment = page.locator('td button').getByText('1 Person Needed');
      await expect(assignment).toBeVisible({ timeout: 10000 });
      await assignment.click();
      const person = page.locator('td button').getByText('Dorothy Jackson');
      await person.click();
      const verifiedAddition = page.locator('td button').getByText('Dorothy Jackson');
      await expect(verifiedAddition).toHaveCount(1, { timeout: 10000 });
    });

    test('should delete lesson position', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const assignment = page.locator('td button').getByText('Octavius Assignment');
      await expect(assignment).toBeVisible({ timeout: 10000 });
      await assignment.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await expect(assignment).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Times', () => {
    test('should add time to lesson', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const addBtn = page.locator('[data-testid="add-time-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const name = page.locator('[name="displayName"]');
      await name.fill('Octavian Service');
      const team = page.locator('[type="checkbox"]');
      await team.click();
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedTime = page.locator('td button').getByText('Octavian Service');
      await expect(verifiedTime).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit lesson time', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const time = page.locator('td button').getByText('Octavian Service');
      await expect(time).toBeVisible({ timeout: 10000 });
      await time.click();
      const name = page.locator('[name="displayName"]');
      await name.fill('Octavius Service');
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedEdit = page.locator('td button').getByText('Octavius Service');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should delete lesson time', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const time = page.locator('td button').getByText('Octavius Service');
      await expect(time).toBeVisible({ timeout: 10000 });
      await time.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await expect(time).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Service Order', () => {
    test('should add section to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const addBtn = page.locator('button').getByText('Add Section');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const name = page.locator('[id="label"]');
      await name.fill('Octavian Section');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedSection = page.locator('div span').getByText('Octavian Section');
      await expect(verifiedSection).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit service order section', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = page.locator('button span').getByText('edit').last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const name = page.locator('[id="label"]');
      await name.fill('Octavius Section');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedSection = page.locator('div span').getByText('Octavius Section');
      await expect(verifiedSection).toHaveCount(1, { timeout: 10000 });
    });

    test('should add song to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const addBtn = page.locator('button span').getByText('add').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const song = page.locator('li').getByText('Song');
      await song.click();
      const searchBar = page.locator('[name="searchText"]');
      await searchBar.fill('Amazing');
      const searchBtn = page.locator('[data-testid="song-search-button"]');
      await searchBtn.click();
      const keySelect = page.locator('button').getByText('Traditional');
      await expect(keySelect).toBeVisible({ timeout: 10000 });
      await keySelect.click();
      const verifiedSong = page.locator('div a').getByText('Amazing Grace');
      await expect(verifiedSong).toHaveCount(1, { timeout: 10000 });
    });

    test('should add item to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const addBtn = page.locator('button span').getByText('add').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const item = page.locator('li').getByText('Item');
      await item.click();
      const name = page.locator('[name="label"]');
      await name.fill('Octavian Item');
      const minutes = page.locator('[name="minutes"]');
      await minutes.fill('5');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedItem = page.locator('div').getByText('Octavian Item');
      await expect(verifiedItem).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit service order item', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = page.locator('button span').getByText('edit').last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const name = page.locator('[name="label"]');
      await name.fill('Octavius Item');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedEdit = page.locator('div').getByText('Octavius Item');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should add lesson action to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const addBtn = page.locator('button span').getByText('add').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const action = page.locator('li').getByText('Lesson Action');
      await action.click();
      const selectBtn = page.locator('button').getByText('Select Action');
      await expect(selectBtn).toBeVisible({ timeout: 10000 });
      await selectBtn.click();
      const verifiedAction = page.locator('div a').getByText('Test JPEG');
      await expect(verifiedAction).toHaveCount(1, { timeout: 10000 });
    });

    test('should add add-on to service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const addBtn = page.locator('button span').getByText('add').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
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
      const verifiedAddition = page.locator('div a').getByText('First Add On');
      await expect(verifiedAddition).toHaveCount(1, { timeout: 10000 });
    });

    test('should delete add-on from service order', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = page.locator('button span').getByText('edit').last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedDeletion = page.locator('div a').getByText('First Add On');
      await expect(verifiedDeletion).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Cleanup', () => {
    test('should delete lesson plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button span').getByText('edit').last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedEdit = page.locator('a').getByText('Octavian Lesson');
      await expect(verifiedEdit).toHaveCount(0, { timeout: 10000 });
    });
  });
});
