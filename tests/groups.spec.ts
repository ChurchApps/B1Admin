import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Group Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const peopleHomeBtn = page.locator('[data-testid="nav-item-people"]');
    await peopleHomeBtn.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/people/);
    const groupHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Groups');
    await groupHomeBtn.click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/groups/);
  });

  test.describe('Groups', () => {
    test('should view group details', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();

      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);
    });

    test('should view person details from group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const firstPerson = page.locator('[id="groupMemberTable"] a').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);
    });

    test('should add person to group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const searchInput = page.locator('input[name="personAddText"]');
      await searchInput.fill('Demo User');
      const searchBtn = page.locator('button').getByText('Search').first();
      await searchBtn.click();

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 }).catch(() => { });
      const addBtn = page.locator('button').getByText('Add').first();
      await addBtn.click();
      const validatedPerson = page.locator('[data-testid="display-box-content"] td').getByText('Demo User');
      await expect(validatedPerson).toHaveCount(1);
    });

    test('should advanced add people', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const advBtn = page.locator('button').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]');
      await firstName.fill('Donald');

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 }).catch(() => { });
      await page.waitForTimeout(500);

      const addBtn = page.locator('button').getByText('Add').last();
      await addBtn.click();
      const validatePerson = page.locator('[id="groupMemberTable"]').getByText('Donald Clark');
      await expect(validatePerson).toHaveCount(1);
      const removeBtn = page.locator('button').getByText('person_remove').last();
      await removeBtn.click();
    });

    test('should delete advanced add conditions', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const advBtn = page.locator('button').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      await page.waitForTimeout(500);
      const secondCheck = page.locator('div input[type="checkbox"]').nth(1);
      await secondCheck.click();
      const checkTwo = page.locator('span').getByText('2 active:');
      await expect(checkTwo).toHaveCount(1);
      const deleteLast = page.locator('[d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"]').last();
      await deleteLast.click();
      const checkOne = page.locator('span').getByText('1 active:');
      await expect(checkOne).toHaveCount(1);
      await secondCheck.click();
      await expect(checkTwo).toHaveCount(1);
      const clearAll = page.locator('span').getByText("Clear All");
      await clearAll.click();
      await expect(checkTwo).toHaveCount(0);
    });

    test('should remove person from group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const removeBtn = page.locator('button').getByText('person_remove').last();
      await removeBtn.click();
      await page.waitForTimeout(500);
      const validateRemoval = page.locator('[id="groupMemberTable"]').getByText('Donald Clark');
      await expect(validateRemoval).toHaveCount(0);
    });

    test('should send a message to group', async ({ page }) => {
      //SENDING VALIDATION- get dad to fix his end
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const messageBtn = page.locator('button').getByText('edit_square');
      await messageBtn.click();
      const messageBox = page.locator('textarea').first();
      await messageBox.fill('Test Message Sent.');
      const sendBtn = page.locator('button').getByText('Send');
      await sendBtn.click();
      //vv add validation checking that the message got sent (Currently does not send)
      const userBtn = page.locator('[id="user-menu-button"]');
      await userBtn.click();
      const messagesBtn = page.locator('[data-testid="nav-item-messages"]');
      await messagesBtn.click();
    });

    test('should show templates above group message sender', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      await page.waitForTimeout(500);
      const messageBtn = page.locator('button').getByText('edit_square');
      await messageBtn.click();
      const templatesBtn = page.locator('button').getByText('Show Templates');
      await templatesBtn.click();
      const templates = page.locator('[name="templates"]');
      await expect(templates).toHaveCount(1);
    });

    test('should cancel editing group details', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(2000);
      await expect(nameEdit).toHaveCount(0);
    });

    test('should edit group details', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      await page.waitForTimeout(2000);
      const nameEdit = page.locator('[name="name"]');
      await nameEdit.fill('Elementary (2-5)');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const title = page.locator('p').first();
      await expect(title).toContainText('Elementary (2-5)');
    });
  });

  test.describe('Sessions', () => {
    test('should cancel adding session to group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator('button').getByText('Sessions');
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateEntry = page.locator('[data-testid="session-date-input"]');
      await expect(dateEntry).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(dateEntry).toHaveCount(0);
    });

    test('should add session to group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      await page.waitForTimeout(500);
      const sessionsBtn = page.locator('button').getByText('Sessions');
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill('2025-09-01');
      await page.waitForTimeout(500);
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const sessionCard = page.locator('span').getByText('Active');
      await expect(sessionCard).toHaveCount(1);
    });

    test('should add person to session', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator('button').getByText('Sessions');
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill('2025-10-01');
      await page.waitForTimeout(500);
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const viewBtn = page.locator('button').getByText('View').first();
      await viewBtn.click();
      const addBtn = page.locator('button[data-testid="add-member-button"]').first();
      await addBtn.click();
      const addedPerson = page.locator('[id="groupMemberTable"] td a');
      await expect(addedPerson).toHaveCount(1);
    });

    test('should remove person from session', async ({ page }) => {
      await page.waitForTimeout(500);
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator('button').getByText('Sessions');
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill('2025-11-01');
      await page.waitForTimeout(500);
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const viewBtn = page.locator('button').getByText('View').first();
      await viewBtn.click();
      const addBtn = page.locator('button[data-testid="add-member-button"]').first();
      await addBtn.click();
      const addedPerson = page.locator('[id="groupMemberTable"] td a');
      await expect(addedPerson).toHaveCount(1);
      const removeBtn = page.locator('button').getByText('Remove').first();
      await removeBtn.click();
      await page.waitForTimeout(2000);
      await expect(addedPerson).toHaveCount(0);
    });

    test('should cancel adding group', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Group');
      await addBtn.click();
      const nameInput = page.locator('input[id="groupName"]');
      await expect(nameInput).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(nameInput).toHaveCount(0);
    });

    test('should add group', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Group');
      await addBtn.click();
      const categorySelect = page.locator('div[role="combobox"]');
      await categorySelect.click();
      const newCat = page.locator('li[data-value="__ADD_NEW__"]');
      await newCat.click();
      const categoryInput = page.locator('input').first();
      await categoryInput.fill('Test Category');
      const nameInput = page.locator('[name="name"]');
      await nameInput.fill('Octavian Test Group');
      const saveBtn = page.locator('button').getByText('Add').last();
      await saveBtn.click();
      const validateGroup = page.locator('table tbody tr a').getByText('Octavian Test Group');
      await expect(validateGroup).toHaveCount(1);
    });

    test('should delete group', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);
      //delete
      await page.waitForTimeout(2000);
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      //OUTDATED- returns to group homepage, now happens automatically:
      /* const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
      await menuBtn.click();
      const peopleHomeBtn = page.locator('[data-testid="nav-item-people"]');
      await peopleHomeBtn.click();
      await page.waitForTimeout(5000);
      await expect(page).toHaveURL(/\/people/);
      const groupHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Groups');
      await groupHomeBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/groups/); */
      //check for group still existing
      const deletedGroup = page.locator('table tbody tr a').getByText('Elementary (3-5)');
      const editedDeletedGroup = page.locator('table tbody tr a').getByText('Elementary (2-5)');
      const delGroups = deletedGroup.or(editedDeletedGroup);
      await expect(delGroups).toHaveCount(0);
    });
  });

});