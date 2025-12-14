import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const settingsHomeBtn = page.locator('[data-testid="nav-item-settings"]');
    await settingsHomeBtn.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/settings/);
  });

  /* test('should load settings home', async ({ page }) => {
    const settingsHeader = page.locator('h4').getByText('Grace Community Church');
    await settingsHeader.click();
  }); */
  test.describe('General Settings', () => {
    test('should edit church', async ({ page }) => {
      //RESET: const settingsHeader = page.locator('h4').getByText('Grace Community Church');
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const churchName = page.locator('[name="churchName"]');
      await churchName.fill('Grace Community Church Lol');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const settingHeaderTwo = page.locator('h4').getByText('Grace Community Church Lol');
      await expect(settingHeaderTwo).toHaveCount(1);
      // RESET:
      /* editBtn.click();
      churchName.fill('Grace Community Church');
      saveBtn.click();
      await expect(settingsHeader).toHaveCount(1); */
    });

    test('should cancel editing church', async ({ page }) => {
      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const churchName = page.locator('[name="churchName"]');
      await expect(churchName).toHaveCount(1)
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(churchName).toHaveCount(0);
    });

    test('should create role', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-role-button"]');
      await addBtn.click();
      const custom = page.locator('li').getByText('Add Custom Role');
      await custom.click();
      const roleName = page.locator('[name="roleName"]');
      await roleName.fill('Octavian Test Role');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedRole = page.locator('a').getByText('Octavian Test Role');
      await expect(validatedRole).toHaveCount(1);
    });

    test('should add person to role', async ({ page }) => {
      const role = page.locator('a').getByText('Octavian Test Role');
      await role.click();
      const addBtn = page.locator('[data-testid="add-role-member-button"]');
      await addBtn.click();
      const searchBox = page.locator('[name="personAddText"]');
      await searchBox.fill('Demo User');
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('button').getByText('Select');
      await selectBtn.click();
      await page.waitForTimeout(500);
      const validatedPerson = page.locator('td').getByText('Demo User');
      await expect(validatedPerson).toHaveCount(1);
    });

    test('should edit role', async ({ page }) => {
      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const roleName = page.locator('[name="roleName"]');
      await roleName.fill('Octavius Test Role');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedRole = page.locator('a').getByText('Octavius Test Role');
      await expect(validatedRole).toHaveCount(1);
    });

    test('should cancel editing role', async ({ page }) => {
      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const roleName = page.locator('[name="roleName"]');
      await expect(roleName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(roleName).toHaveCount(0);
    });

    test('should delete role', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.locator('a').getByText('Octavius Test Role');
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

  test.describe('Mobile Settings', () => {
    test('should create mobile app tab', async ({ page }) => {
      const mobileTab = page.locator('[id="secondaryMenu"]').getByText('Mobile Apps');
      await mobileTab.click();

      const addBtn = page.locator('button').getByText('Add Tab');
      await addBtn.click();
      const tabName = page.locator('[name="text"]');
      await tabName.fill('Octavian Test Tab')
      const url = page.locator('[name="url"]');
      await url.fill('https://pony.town/');
      const saveBtn = page.locator('button').getByText('Save Tab');
      await saveBtn.click();
      const validatedTab = page.locator('h6').getByText('Octavian Test Tab');
      await expect(validatedTab).toHaveCount(1);
    });

    test('should edit mobile app tab', async ({ page }) => {
      const mobileTab = page.locator('[id="secondaryMenu"]').getByText('Mobile Apps');
      await mobileTab.click();

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const tabName = page.locator('[name="text"]');
      await tabName.fill('Octavius Test Tab')
      const saveBtn = page.locator('button').getByText('Save Tab');
      await saveBtn.click();
      const validatedTab = page.locator('h6').getByText('Octavius Test Tab');
      await expect(validatedTab).toHaveCount(1);
    });

    test('should cancel edit mobile app tab', async ({ page }) => {
      const mobileTab = page.locator('[id="secondaryMenu"]').getByText('Mobile Apps');
      await mobileTab.click();

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const tabName = page.locator('[name="text"]');
      await expect(tabName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(tabName).toHaveCount(0);
    });

    test('should delete mobile app tab', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const mobileTab = page.locator('[id="secondaryMenu"]').getByText('Mobile Apps');
      await mobileTab.click();

      const editBtn = page.locator('[d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.locator('h6').getByText('Octavius Test Tab');
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

  test.describe('Form Settings', () => {
    test.beforeEach(async ({ page }) => {
      const formTab = page.locator('[id="secondaryMenu"]').getByText('Form');
      await formTab.click();
    });

    test('should create form', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-form-button"]');
      await addBtn.click();
      const formName = page.locator('[name="name"]');
      await formName.fill('Octavian Test Form');
      const association = page.locator('[id="mui-component-select-contentType"]');
      await association.click();
      const selAssociation = page.locator('li').getByText('Stand Alone');
      await selAssociation.click();
      const restriction = page.locator('[id="mui-component-select-restricted"]');
      await restriction.click();
      const selRestriction = page.locator('li').getByText('Public');
      await selRestriction.click();
      const thanksMsg = page.locator('[name="thankYouMessage"]');
      await thanksMsg.fill('Thanks from Octavian');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedForm = page.locator('a').getByText('Octavian Test Form');
      await expect(validatedForm).toHaveCount(1);
    });

    test('should edit form', async ({ page }) => {
      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      await page.waitForTimeout(2000);
      const formName = page.locator('[name="name"]');
      await formName.fill('Octavius Test Form');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedForm = page.locator('a').getByText('Octavius Test Form');
      await expect(validatedForm).toHaveCount(1);
    });

    test('should cancel editing form', async ({ page }) => {
      const editBtn = page.locator('button').getByText('edit').first();
      await editBtn.click();
      const formName = page.locator('[name="name"]');
      await expect(formName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(formName).toHaveCount(0);
    });

    test('should add form questions', async ({ page }) => {
      const form = page.locator('a').getByText('Octavius Test Form');
      await form.click();

      const addBtn = page.locator('button').getByText('Add Question');
      await addBtn.click();
      const selectBox = page.locator('[role="combobox"]').first();
      await selectBox.click();
      const multChoice = page.locator('li').getByText('Multiple Choice');
      await multChoice.click();
      const title = page.locator('[id="title"]');
      await title.fill('I support playwright testing. True or False?');
      const desc = page.locator('[id="title"]');
      await desc.fill('I support playwright testing. True or False?');
      const value = page.locator('[name="choiceValue"]');
      await value.fill('True');
      const choice = page.locator('[name="choiceText"]');
      await choice.fill('True');
      const addOpBtn = page.locator('[id="addQuestionChoiceButton"]');
      await addOpBtn.click();
      await value.fill('False');
      await choice.fill('False');
      await addOpBtn.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();

      const validatedAddition = page.locator('td button').getByText('I support playwright testing. True or False?');
      await expect(validatedAddition).toHaveCount(1);
    });

    test('should edit form questions', async ({ page }) => {
      const form = page.locator('a').getByText('Octavius Test Form');
      await form.click();

      const question = page.locator('td button').getByText('I support playwright testing. True or False?');
      await question.click();
      await page.waitForTimeout(2000);
      const title = page.locator('[id="title"]');
      await title.fill('True or False? I support playwright testing.');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();

      const validatedEdit = page.locator('td button').getByText('True or False? I support playwright testing.');
      await expect(validatedEdit).toHaveCount(1);
    });

    test('should cancel editing form questions', async ({ page }) => {
      const form = page.locator('a').getByText('Octavius Test Form');
      await form.click();

      const question = page.locator('td button').getByText('True or False? I support playwright testing.');
      await question.click();
      await page.waitForTimeout(2000);
      const title = page.locator('[id="title"]');
      await expect(title).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(title).toHaveCount(0);
    });

    test('should delete form questions', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const form = page.locator('a').getByText('Octavius Test Form');
      await form.click();

      const question = page.locator('td button').getByText('True or False? I support playwright testing.');
      await question.click();
      await page.waitForTimeout(2000);
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await expect(question).toHaveCount(0);
    });

    test('should add form members', async ({ page }) => {
      const form = page.locator('a').getByText('Octavius Test Form');
      await form.click();
      const membersTab = page.locator('[role="tab"]').getByText('Form Members');
      await membersTab.click();

      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Dorothy Jackson');
      const searchBtn = page.locator('[id="searchButton"]');
      await searchBtn.click();
      const addBtn = page.locator('button').getByText('Select');
      await addBtn.click();

      const validatedAddition = page.locator('td a').getByText('Dorothy Jackson');
      await expect(validatedAddition).toHaveCount(1);
    });

    test('should remove form members', async ({ page }) => {
      const form = page.locator('a').getByText('Octavius Test Form');
      await form.click();
      const membersTab = page.locator('[role="tab"]').getByText('Form Members');
      await membersTab.click();

      const removeBtn = page.locator('button').getByText('Remove').last();
      await removeBtn.click();
      const validatedDeletion = page.locator('td a').getByText('Dorothy Jackson');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should delete form', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      await page.waitForTimeout(2000);
      const deleteBtn = page.locator('button').getByText('Delete').first();
      await deleteBtn.click();
      await page.waitForTimeout(2000);
      const validatedDeletion = page.locator('a').getByText('Octavius Test Form');
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

});