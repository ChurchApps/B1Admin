import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Serving Management - Plans', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const servingHomeBtn = page.locator('[data-testid="nav-item-serving"]');
    await servingHomeBtn.click();
    await expect(page).toHaveURL(/\/serving/);
  });

  test.describe('Ministry CRUD', () => {
    test('should add ministry', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Ministry');
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await minName.fill('Octavian Ministry');
      const saveBtn = page.locator('button').getByText('Add').first();
      await saveBtn.click();
      const verifiedMin = page.locator('[role="tab"]').getByText('Octavian Ministry');
      await expect(verifiedMin).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel adding ministry', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Ministry');
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await expect(minName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('cancel');
      await cancelBtn.click();
      await expect(minName).toHaveCount(0, { timeout: 10000 });
    });

    test('should edit ministry', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavian Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = page.locator('button span').getByText('edit').first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const minName = page.locator('[name="name"]');
      await expect(minName).toBeVisible({ timeout: 10000 });
      await minName.fill('Octavius Ministry');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedEdit = page.locator('p').getByText('Octavius Ministry');
      await expect(verifiedEdit).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing ministry', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = page.locator('button span').getByText('edit').first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const minName = page.locator('[name="name"]');
      await expect(minName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(minName).toHaveCount(0, { timeout: 10000 });
    });

    test('should add person to ministry', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
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

    test('should advanced add person to ministry', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
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

    test('should promote person to ministry leader', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
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

    test('should remove person from ministry', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
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
    test('should create plan type', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();

      const addBtn = page.locator('button').getByText('Create Plan Type');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const typeName = page.locator('[type="text"]');
      await typeName.fill('Octavian Plans');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedType = page.locator('a').getByText('Octavian Plans');
      await expect(verifiedType).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit plan type', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();

      const editBtn = page.locator('button span').getByText('edit').last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const typeName = page.locator('[type="text"]');
      await typeName.fill('Octavius Plans');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedType = page.locator('a').getByText('Octavius Plans');
      await expect(verifiedType).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing plan type', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();

      const editBtn = page.locator('button span').getByText('edit').last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const typeName = page.locator('[type="text"]');
      await expect(typeName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('cancel');
      await cancelBtn.click();
      await expect(typeName).toHaveCount(0, { timeout: 10000 });
    });

    test('should add service plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const addBtn = page.locator('[data-testid="add-plan-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill('Mar 10, 2025');
      const date = page.locator('[id="serviceDate"]');
      await date.fill('2025-03-01');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 10, 2025');
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit service plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button').getByText('Edit');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill('Mar 1, 2025');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2025');
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test('should cancel editing service plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
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

    test('should delete service plan', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const plansBtn = page.locator('a').getByText('Octavius Plans');
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click()
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button').getByText('Edit');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const verifiedPlan = page.locator('a').getByText('Mar 1, 2025');
      await expect(verifiedPlan).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Teams', () => {
    test('should add team', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();

      const addBtn = page.locator('[data-testid="add-team-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const teamName = page.locator('[name="name"]');
      await teamName.fill('Octavian Team');
      const saveBtn = page.locator('button').getByText('Add').last();
      await saveBtn.click();
      const verifiedTeam = page.locator('a').getByText('Octavian Team');
      await expect(verifiedTeam).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit team', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Octavian Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
      const editBtn = page.locator('button span').getByText('edit');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const teamName = page.locator('[name="name"]');
      await teamName.fill('Octavius Team');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedHeader = page.locator('p').getByText('Octavius Team');
      await expect(verifiedHeader).toHaveCount(1, { timeout: 10000 });
    });

    test('should add person to team', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Octavius Team');
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

    test('should advanced add person to team', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Octavius Team');
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

    test('should promote person to team leader', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Octavius Team');
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

    test('should remove person from team', async ({ page }) => {
      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Octavius Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const removeBtn = page.locator('button').getByText('person_remove').last();
      await expect(removeBtn).toBeVisible({ timeout: 10000 });
      await removeBtn.click();
      const verifiedRemoved = page.locator('[id="groupMembersBox"] a').getByText('Grace Jackson');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete team', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const teamBtn = page.locator('a').getByText('Octavius Team');
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click()
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
      const editBtn = page.locator('button span').getByText('edit');
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const verifiedRemoved = page.locator('table a').getByText('Octavius Team');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe('Cleanup', () => {
    test('should delete ministry', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText('Octavius Ministry');
      await minBtn.click();
      const manageBtn = page.locator('a').getByText('Edit Ministry');
      await manageBtn.click();
      const editBtn = page.locator('button span').getByText('edit').first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const deleteBtn = page.locator('button').getByText('Delete');
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedRemoved = page.locator('table a').getByText('Octavius Ministry');
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });
});
