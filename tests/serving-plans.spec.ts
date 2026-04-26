import type { Page } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { editIconButton, dismissSendInviteIfPresent } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToServing } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
// Entire file is one chain: create Zacchaeus Ministry -> rename to Zebedee ->
// add plan types/teams under it -> tear down in reverse. Every test pivots on
// the shared Zebedee Ministry tab.
test.describe.serial('Serving Management - Plans', () => {
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

  // All tests pivot on the Zebedee Ministry tab on /serving (root). Edit
  // Ministry / Edit Plan Type flows navigate off /serving (to /groups or
  // /serving/planTypes), so re-enter /serving before each test. Also dismiss
  // any leftover SendInviteDialog (e.g. from adding Dorothy with an email).
  test.beforeEach(async () => {
    await dismissSendInviteIfPresent(page, 500);
    if (!/\/serving(?!\/)/.test(page.url())) {
      await navigateToServing(page);
    }
  });

  test.describe('Ministry CRUD', () => {

    test('should add ministry', async () => {
      const addBtn = page.locator('button').getByText('Add Ministry');
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await minName.fill('Zacchaeus Ministry');
      const saveBtn = page.locator('button').getByText('Add').first();
      await saveBtn.click();
      const verifiedMin = page.locator('[role="tab"]').getByText('Zacchaeus Ministry');
      await expect(verifiedMin).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel adding ministry', async () => {
      const addBtn = page.locator('button').getByText('Add Ministry');
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await expect(minName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('cancel');
      await cancelBtn.click();
      await expect(minName).toHaveCount(0, { timeout: 10000 });
    });

    test('should edit ministry', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zacchaeus Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const minName = page.locator('[name="name"]');
      await expect(minName).toBeVisible({ timeout: 10000 });
      await minName.fill('Zebedee Ministry');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedEdit = page.locator('p').getByText('Zebedee Ministry');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing ministry', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const minName = page.locator('[name="name"]');
      await expect(minName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(minName).toHaveCount(0, { timeout: 10000 });
    });

    test('should add person to ministry', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();

      const personSearch = page.locator('[name="personAddText"]');
      await expect(personSearch).toBeVisible({ timeout: 10000 });
      await personSearch.fill('Dorothy');
      const searchBtn = page.locator('[data-testid="person-add-search-button"]');
      await searchBtn.click();
      const addBtn = page.locator('button').getByText('Add').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMemberTable"] a').getByText('Dorothy Jackson');
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test('should advanced add person to ministry', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();

      const advBtn = page.locator('button').getByText('Advanced');
      await expect(advBtn).toBeVisible({ timeout: 10000 });
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
      const addBtn = page.locator('button').getByText('Add');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMemberTable"] a').getByText('Grace Jackson');
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test('should promote person to ministry leader', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();

      const promoteBtn = page.locator('button').getByText('key').first();
      await expect(promoteBtn).toBeVisible({ timeout: 10000 });
      await promoteBtn.click();
      await page.reload();
      const verifiedPromoted = page.locator('button').getByText('key_off');
      await expect(verifiedPromoted).toHaveCount(1, { timeout: 10000 });
    });

    test('should remove person from ministry', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();

      const removeBtn = page.locator('button').getByText('person_remove').first();
      await expect(removeBtn).toBeVisible({ timeout: 10000 });
      await removeBtn.click();
      const verifiedRemoved = page.locator('[id="groupMembersBox"] a').getByText('Dorothy Jackson');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Plan Types', () => {
    test('should create plan type', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();

      const addBtn = page.locator('button').getByText('Create Plan Type');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const typeName = page.locator('[type="text"]');
      await typeName.fill('Zacchaeus Plans');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedType = page.locator('a').getByText('Zacchaeus Plans');
      await expect(verifiedType).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit plan type', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const typeName = page.locator('[type="text"]');
      await typeName.fill('Zebedee Plans');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedType = page.locator('a').getByText('Zebedee Plans');
      await expect(verifiedType).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing plan type', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const typeName = page.locator('[type="text"]');
      await expect(typeName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('cancel');
      await cancelBtn.click();
      await expect(typeName).toHaveCount(0, { timeout: 10000 });
    });

    test('should add service plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Zebedee Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const addBtn = page.locator('[data-testid="add-plan-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill('Mar 10, 2030');
      const date = page.locator('[id="serviceDate"]');
      await date.fill('2030-03-01');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 10, 2030');
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit service plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Zebedee Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button').getByText('Edit');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill('Mar 1, 2030');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2030');
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing service plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Zebedee Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button').getByText('Edit');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const planName = page.locator('[name="name"]');
      await expect(planName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(planName).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete service plan', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Zebedee Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button').getByText('Edit');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2030');
      await expect(verifiedPlan).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Teams', () => {
    test('should add team', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();

      const addBtn = page.locator('[data-testid="add-team-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const teamName = page.locator('[name="name"]');
      await teamName.fill('Zacchaeus Team');
      const saveBtn = page.locator('button').getByText('Add').last();
      await saveBtn.click();
      const verifiedTeam = page.locator('a').getByText('Zacchaeus Team');
      await expect(verifiedTeam).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit team', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Zacchaeus Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const teamName = page.locator('[name="name"]');
      await teamName.fill('Zebedee Team');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedHeader = page.locator('p').getByText('Zebedee Team');
      await expect(verifiedHeader).toHaveCount(1, { timeout: 10000 });
    });

    test('should add person to team', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Zebedee Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const personSearch = page.locator('[name="personAddText"]');
      await expect(personSearch).toBeVisible({ timeout: 10000 });
      await personSearch.fill('Dorothy');
      const searchBtn = page.locator('[data-testid="person-add-search-button"]');
      await searchBtn.click();
      const addBtn = page.locator('button').getByText('Add').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText('Dorothy Jackson');
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test('should advanced add person to team', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Zebedee Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const advBtn = page.locator('button').getByText('Advanced');
      await expect(advBtn).toBeVisible({ timeout: 10000 });
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
      const addBtn = page.locator('button').getByText('Add');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText('Grace Jackson');
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test('should promote person to team leader', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Zebedee Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const promoteBtn = page.locator('button').getByText('key').first();
      await expect(promoteBtn).toBeVisible({ timeout: 10000 });
      await promoteBtn.click();
      await page.reload();
      const verifiedPromoted = page.locator('button').getByText('key_off');
      await expect(verifiedPromoted).toHaveCount(1, { timeout: 10000 });
    });

    test('should remove person from team', async () => {
      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Zebedee Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const removeBtn = page.locator('button').getByText('person_remove').last();
      await expect(removeBtn).toBeVisible({ timeout: 10000 });
      await removeBtn.click();
      const verifiedRemoved = page.locator('[id="groupMembersBox"] a').getByText('Grace Jackson');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete team', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Zebedee Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const verifiedRemoved = page.locator('table a').getByText('Zebedee Team');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Cleanup', () => {
    test('should delete ministry', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText('Zebedee Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedRemoved = page.locator('table a').getByText('Zebedee Ministry');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });
});

// Edge-case extensions: Plans page navigation surface (independent of Zebedee chain).
test.describe('Plans page navigation', () => {
  test('Add Ministry button is visible on the Serving Plans page', async ({ page }) => {
    await expect(page.locator('button').getByText('Add Ministry').first()).toBeVisible({ timeout: 15000 });
  });

  test('Plans subnavigation reveals secondary entries (Songs, Tasks)', async ({ page }) => {
    // SecondaryMenu surfaces entries based on the active primary section.
    await expect(page.locator('[id="secondaryMenu"]').getByText('Songs').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[id="secondaryMenu"]').getByText('Tasks').first()).toBeVisible({ timeout: 15000 });
  });

  test('Tasks secondary item navigates to /serving/tasks', async ({ page }) => {
    await page.locator('[id="secondaryMenu"]').getByText('Tasks').first().click();
    await page.waitForURL(/\/serving\/tasks/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/serving\/tasks/);
  });
});

