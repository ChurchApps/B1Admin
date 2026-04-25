import type { Page } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { editIconButton } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToServing } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// "Lessonius" names are private to this spec so it runs independently of
// serving-plans.spec.ts (which owns the "Octavius" namespace). Setup creates
// them, Cleanup removes them — no cross-file state dependency.
test.describe.serial('Serving Management - Lessons', () => {
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

  test.describe('Setup', () => {
    test('should create Lessonius Ministry, Plans, and Team', async () => {
      const addMinistry = page.locator('button').getByText('Add Ministry');
      await addMinistry.click();
      await page.locator('[name="name"]').fill('Lessonius Ministry');
      await page.locator('button').getByText('Add').first().click();
      const verifiedMin = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await expect(verifiedMin).toHaveCount(1, { timeout: 10000 });

      await verifiedMin.click();
      const createPlanType = page.locator('button').getByText('Create Plan Type');
      await expect(createPlanType).toBeVisible({ timeout: 10000 });
      await createPlanType.click();
      await page.locator('[type="text"]').fill('Lessonius Plans');
      await page.locator('button').getByText('Save').click();
      await expect(page.locator('a').getByText('Lessonius Plans')).toHaveCount(1, { timeout: 10000 });

      const addTeamBtn = page.locator('[data-testid="add-team-button"]');
      await expect(addTeamBtn).toBeVisible({ timeout: 10000 });
      await addTeamBtn.click();
      await page.locator('[name="name"]').fill('Lessonius Team');
      await page.locator('button').getByText('Add').last().click();
      const teamLink = page.locator('a').getByText('Lessonius Team');
      await expect(teamLink).toHaveCount(1, { timeout: 10000 });

      // Add Dorothy Jackson to the team so the position-assignment test has a
      // candidate to pick.
      await teamLink.click();
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
      const personSearch = page.locator('[name="personAddText"]');
      await expect(personSearch).toBeVisible({ timeout: 10000 });
      await personSearch.fill('Dorothy');
      await page.locator('[data-testid="person-add-search-button"]').click();
      const addPerson = page.locator('button').getByText('Add').last();
      await expect(addPerson).toBeVisible({ timeout: 10000 });
      await addPerson.click();
      await expect(page.locator('[id="groupMembersBox"] a').getByText('Dorothy Jackson')).toHaveCount(1, { timeout: 10000 });
    });
  });

  test.describe('Lesson Plans', () => {
    // Use the regular New Plan flow — the "Schedule Lesson" dropdown item requires
    // LessonsApi (port 8090) to pick a lesson, which isn't part of the local
    // dev webServer. The downstream tests (Positions/Times/Service Order)
    // operate on a plan regardless of whether it was created as a lesson plan.
    test('should add lesson plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const addBtn = page.locator('[data-testid="add-plan-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const planName = page.locator('[name="name"]');
      await expect(planName).toBeVisible({ timeout: 10000 });
      await planName.fill('Mar 1, 2030');
      const date = page.locator('[id="serviceDate"]');
      await date.fill('2030-03-01');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2030');
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit lesson plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = editIconButton(page).last();
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
    test('should add position to lesson', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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
      const octaviusTeam = page.locator('li').getByText('Lessonius Team');
      await octaviusTeam.click();
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedPosition = page.locator('td button').getByText('Octavian Assignment');
      await expect(verifiedPosition).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit lesson position', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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

    test('should assign person to lesson position', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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

    // Position delete is deferred until after Times tests because the Time form's
    // "Needed Teams" checkbox list is populated from the lesson's positions —
    // deleting the sole position would leave the list empty and block Save.
  });

  test.describe('Times', () => {
    test('should add time to lesson', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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

    test('should edit lesson time', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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

    test('should delete lesson time', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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
    test('should add section to service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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

    test('should edit service order section', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const name = page.locator('[id="label"]');
      await name.fill('Octavius Section');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedSection = page.locator('div span').getByText('Octavius Section');
      await expect(verifiedSection).toHaveCount(1, { timeout: 10000 });
    });

    test('should add song to service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      // "Add Item" on the section row opens a menu with Song/Item/Lesson Action/Add-On options.
      const addBtn = page.getByRole('button', { name: 'Add Item' }).first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const song = page.locator('li').getByText('Song');
      await song.click();
      const searchBar = page.locator('[name="searchText"]');
      await searchBar.fill('Amazing');
      const searchBtn = page.locator('[data-testid="song-search-button"]');
      await searchBtn.click();
      const keySelect = page.getByRole('button', { name: /Traditional key/ });
      await expect(keySelect).toBeVisible({ timeout: 10000 });
      await keySelect.click();
      // The song is rendered as a draggable row in the service order list.
      const verifiedSong = page.getByText('Amazing Grace').first();
      await expect(verifiedSong).toBeVisible({ timeout: 10000 });
    });

    test('should add item to service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      // "Add Item" on the section row opens a menu with Song/Item/Lesson Action/Add-On options.
      const addBtn = page.getByRole('button', { name: 'Add Item' }).first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const item = page.getByRole('menuitem', { name: 'Item', exact: true });
      await item.click();
      const name = page.locator('[name="label"]');
      await name.fill('Octavian Item');
      const minutes = page.locator('[name="minutes"]');
      await minutes.fill('5');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedItem = page.getByText('Octavian Item').first();
      await expect(verifiedItem).toBeVisible({ timeout: 10000 });
    });

    test('should edit service order item', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const name = page.locator('[name="label"]');
      await name.fill('Octavius Item');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedEdit = page.locator('div').getByText('Octavius Item');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    // "Lesson Action" and "Add-On" pick items from the lessons.church content
    // library (LessonsApi on port 8090), which is not part of the local
    // webServer stack. Skip these when LessonsApi isn't available.
    test.skip('should add lesson action to service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      // "Add Item" on the section row opens a menu with Song/Item/Lesson Action/Add-On options.
      const addBtn = page.getByRole('button', { name: 'Add Item' }).first();
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

    test.skip('should add add-on to service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      // "Add Item" on the section row opens a menu with Song/Item/Lesson Action/Add-On options.
      const addBtn = page.getByRole('button', { name: 'Add Item' }).first();
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

    test.skip('should delete add-on from service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Octavian Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = editIconButton(page).last();
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
    test('should delete lesson position', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
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

    test('should delete lesson plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Lessonius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedEdit = page.locator('a').getByText('Octavian Lesson');
      await expect(verifiedEdit).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete Lessonius Ministry', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText('Lessonius Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedRemoved = page.locator('table a').getByText('Lessonius Ministry');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });
});
