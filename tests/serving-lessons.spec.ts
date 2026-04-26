import type { Page } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { dismissSendInviteIfPresent, editIconButton, recoverFromViteError } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToServing } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// "Apollos" names are private to this spec so it runs independently of
// serving-plans.spec.ts (which owns the "Zebedee" namespace). Setup creates
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

  // Setup ends on the Apollos Team page (in /groups). Subsequent tests reach
  // for the "Apollos Ministry" tab on /serving, so navigate back if needed.
  // Also dismiss any lingering SendInviteDialog from the team-add flow.
  test.beforeEach(async () => {
    await dismissSendInviteIfPresent(page, 500);
    // Recover from Vite's "Failed to fetch dynamically imported module" error
    // boundary (stale chunk after HMR) by reloading.
    const viteError = page.locator('text=Failed to fetch dynamically imported module');
    if (await viteError.isVisible({ timeout: 200 }).catch(() => false)) {
      await page.reload();
    }
    // The "Apollos Ministry" tab list lives on /serving (root) only — sub-
    // routes like /serving/planTypes/<id> don't render it.
    if (!/^\/serving\/?$/.test(new URL(page.url()).pathname)) {
      await navigateToServing(page);
    }
  });

  test.describe('Setup', () => {
    test('should create Apollos Ministry, Plans, and Team', async () => {
      const addMinistry = page.locator('button').getByText('Add Ministry');
      await addMinistry.click();
      await page.locator('[name="name"]').fill('Apollos Ministry');
      await page.locator('button').getByText('Add').first().click();
      const verifiedMin = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await expect(verifiedMin).toHaveCount(1, { timeout: 10000 });

      await verifiedMin.click();
      const createPlanType = page.locator('button').getByText('Create Plan Type');
      await expect(createPlanType).toBeVisible({ timeout: 10000 });
      await createPlanType.click();
      await page.locator('[type="text"]').fill('Apollos Plans');
      await page.locator('button').getByText('Save').click();
      await expect(page.locator('a').getByText('Apollos Plans')).toHaveCount(1, { timeout: 10000 });

      const addTeamBtn = page.locator('[data-testid="add-team-button"]');
      await expect(addTeamBtn).toBeVisible({ timeout: 10000 });
      await addTeamBtn.click();
      await page.locator('[name="name"]').fill('Apollos Team');
      await page.locator('button').getByText('Add').last().click();
      const teamLink = page.locator('a').getByText('Apollos Team');
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
      // Dorothy has an email, so the SendInviteDialog opens — dismiss it before
      // the next test in the chain runs.
      await dismissSendInviteIfPresent(page);
      await expect(page.locator('[id="groupMembersBox"] a').getByText('Dorothy Jackson')).toHaveCount(1, { timeout: 10000 });
    });
  });

  test.describe('Lesson Plans', () => {
    // Use the regular New Plan flow — the "Schedule Lesson" dropdown item requires
    // LessonsApi (port 8090) to pick a lesson, which isn't part of the local
    // dev webServer. The downstream tests (Positions/Times/Service Order)
    // operate on a plan regardless of whether it was created as a lesson plan.
    test('should add lesson plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
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
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const date = page.locator('[id="name"]');
      await expect(date).toBeVisible({ timeout: 10000 });
      await date.fill('Zacchaeus Lesson');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedEdit = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });
  });

  test.describe('Positions', () => {
    test('should add position to lesson', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      // Vite occasionally serves a stale PlanPage chunk on this transition;
      // race the success state against the error boundary.
      await recoverFromViteError(page, lesson);
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const addBtn = page.locator('[data-testid="add-position-button"]');
      // The lesson detail page lazy-loads PlanPage.tsx; on a stale chunk
      // (frequent on the second pass through this route), Vite renders the
      // error boundary. Retry the click+recover cycle until addBtn appears.
      for (let i = 0; i < 3; i++) {
        await recoverFromViteError(page, addBtn);
        if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) break;
        await page.reload();
        await page.waitForLoadState("domcontentloaded").catch(() => { });
      }
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Zacchaeus Assignment');
      const volunteerGroup = page.locator('[role="combobox"]').last();
      await volunteerGroup.click();
      const zebedeeTeam = page.locator('li').getByText('Apollos Team');
      await zebedeeTeam.click();
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedPosition = page.locator('td button').getByText('Zacchaeus Assignment');
      await expect(verifiedPosition).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit lesson position', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const assignment = page.locator('td button').getByText('Zacchaeus Assignment');
      await expect(assignment).toBeVisible({ timeout: 10000 });
      await assignment.click();
      const name = page.locator('[name="name"]');
      await name.fill('Zebedee Assignment');
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedEdit = page.locator('td button').getByText('Zebedee Assignment');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should assign person to lesson position', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
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
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const addBtn = page.locator('[data-testid="add-time-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const name = page.locator('[name="displayName"]');
      await name.fill('Zacchaeus Service');
      const team = page.locator('[type="checkbox"]');
      await team.click();
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedTime = page.locator('td button').getByText('Zacchaeus Service');
      await expect(verifiedTime).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit lesson time', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const time = page.locator('td button').getByText('Zacchaeus Service');
      await expect(time).toBeVisible({ timeout: 10000 });
      await time.click();
      const name = page.locator('[name="displayName"]');
      await name.fill('Zebedee Service');
      const saveBtn = page.locator('button').getByText('Save').last();
      await saveBtn.click();
      const verifiedEdit = page.locator('td button').getByText('Zebedee Service');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should delete lesson time', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const time = page.locator('td button').getByText('Zebedee Service');
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
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const addBtn = page.locator('button').getByText('Add Section');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const name = page.locator('[id="label"]');
      await name.fill('Zacchaeus Section');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedSection = page.locator('div span').getByText('Zacchaeus Section');
      await expect(verifiedSection).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit service order section', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const name = page.locator('[id="label"]');
      await name.fill('Zebedee Section');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedSection = page.locator('div span').getByText('Zebedee Section');
      await expect(verifiedSection).toHaveCount(1, { timeout: 10000 });
    });

    test('should add song to service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
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
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
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
      await name.fill('Zacchaeus Item');
      const minutes = page.locator('[name="minutes"]');
      await minutes.fill('5');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedItem = page.getByText('Zacchaeus Item').first();
      await expect(verifiedItem).toBeVisible({ timeout: 10000 });
    });

    test('should edit service order item', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();
      const servOrder = page.locator('[role="tab"]').getByText('Service Order');
      await expect(servOrder).toBeVisible({ timeout: 10000 });
      await servOrder.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const name = page.locator('[name="label"]');
      await name.fill('Zebedee Item');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedEdit = page.locator('div').getByText('Zebedee Item');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    // "Lesson Action" and "Add-On" pick items from the lessons.church content
    // library (LessonsApi on port 8090), which is not part of the local
    // webServer stack. Skip these when LessonsApi isn't available.
    test.skip('should add lesson action to service order', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
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
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
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
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
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
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
      const lesson = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(lesson).toBeVisible({ timeout: 10000 });
      await lesson.click();

      const assignment = page.locator('td button').getByText('Zebedee Assignment');
      await expect(assignment).toBeVisible({ timeout: 10000 });
      await assignment.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await expect(assignment).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete lesson plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Apollos Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedEdit = page.locator('a').getByText('Zacchaeus Lesson');
      await expect(verifiedEdit).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete Apollos Ministry', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText('Apollos Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedRemoved = page.locator('table a').getByText('Apollos Ministry');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });
});
