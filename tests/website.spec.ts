import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Website Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const websiteHomeBtn = page.locator('[data-testid="nav-item-website"]');
    await websiteHomeBtn.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/site\/pages/);
  });

  /* test('should load website home', async ({ page }) => {
    const websiteHeader = page.locator('h4').getByText('Website Pages');
    await websiteHeader.click();
  }); */


  test.describe('Pages', () => {
    test('should add page', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-page-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Octavian Test Page');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPage = page.locator('td').getByText('Octavian Test Page');
      await expect(validatedPage).toHaveCount(1);
    });

    test('should cancel adding page', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-page-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should edit page title', async ({ page }) => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator('button').getByText('Page Settings');
      await settingsBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Octavius Test Page');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPage = page.locator('h6').getByText('Octavius Test Page');
      await expect(validatedPage).toHaveCount(1);
    });

    test('should cancel editing page title', async ({ page }) => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator('button').getByText('Page Settings');
      await settingsBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should edit page content', async ({ page }) => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator('button').getByText('Edit Content');
      await contentBtn.click();
      const addBtn = page.locator('button').getByText('add');
      await addBtn.click();
      const section = page.locator('div').getByText('Section').last();
      const dropzone = page.locator('[data-testid="droppable-area"]').first();
      await section.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await dropzone.hover();
      await page.mouse.up();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      //add text to confirm
      await addBtn.click();
      const text = page.locator('div').getByText('Text').first();
      const secondaryDropzone = page.locator('[data-testid="droppable-area"]').nth(1);
      await text.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await secondaryDropzone.hover();
      await page.mouse.up();
      const textbox = page.locator('[role="textbox"]');
      await textbox.fill('Octavian Test Text');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const validatedText = page.locator('p').getByText('Octavian Test Text');
      await expect(validatedText).toHaveCount(1);
    });

    test('DOES NOT WORK should verify page preview', async ({ page }) => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      await page.waitForTimeout(5000);
      const validatedText = page.locator('p').getByText('Octavian Test Text');
      await expect(validatedText).toHaveCount(1);
    });

    test('should verify done button functionality', async ({ page }) => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator('button').getByText('Edit Content');
      await contentBtn.click();
      await expect(page).toHaveURL(/\/site\/pages\/[^/]+/);
      const doneBtn = page.locator('[data-testid="content-editor-done-button"]');
      await doneBtn.click();
      await expect(page).toHaveURL(/\/site\/pages\/preview\/[^/]+/);
    });

    test('should delete page', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator('button').getByText('Page Settings');
      await settingsBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();

      const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
      await menuBtn.click();
      const websiteHomeBtn = page.locator('[data-testid="nav-item-website"]');
      await websiteHomeBtn.click();
      await page.waitForTimeout(5000);
      await expect(page).toHaveURL(/\/site\/pages/);

      const validatedDeletion = page.locator('td').getByText('Octavius Test Page');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  test.describe('Blocks', () => {
    test.beforeEach(async ({ page }) => {
      const blocksHomeBtn = page.locator('a').getByText('Blocks').first();
      await blocksHomeBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/site\/blocks/);
    });

    test('should add block', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-block-button"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Octavian Test Block');
      const typeSelectBox = page.locator('[role="combobox"]');
      await typeSelectBox.click();
      const typeSelect = page.locator('[data-testid="block-type-section"]');
      await typeSelect.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedBlock = page.locator('td').getByText('Octavian Test Block');
      await expect(validatedBlock).toHaveCount(1);
    });

    test('should cancel adding block', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-block-button"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should edit block content', async ({ page }) => {
      const editBtn = page.locator('td a').getByText('Edit').nth(6);
      await editBtn.click();
      const addBtn = page.locator('button').getByText('add');
      await addBtn.click();
      const section = page.locator('div').getByText('Section').last();
      const dropzone = page.locator('[data-testid="droppable-area"]').first();
      await section.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await dropzone.hover();
      await page.mouse.up();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      //add text to confirm
      await addBtn.click();
      const text = page.locator('div').getByText('Text').first();
      const secondaryDropzone = page.locator('[data-testid="droppable-area"]').nth(1);
      await text.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await secondaryDropzone.hover();
      await page.mouse.up();
      const textbox = page.locator('[role="textbox"]');
      await textbox.fill('Octavian Test Text');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const validatedText = page.locator('p').getByText('Octavian Test Text');
      await expect(validatedText).toHaveCount(1);
    });

    /*test('UNFINISHED should view mobile preview of block content', async ({ page }) => {
      const editBtn = page.locator('td a').getByText('Edit').nth(6);
      await editBtn.click();
      const webBox = page.locator('div [class="MuiContainer-root MuiContainer-maxWidthLg css-5c1adp-MuiContainer-root"]');
      await expect(webBox).toHaveCount(1);
      const mobileBtn = page.locator('button').getByText('Mobile');
      await mobileBtn.click();
      const mobileBox = page.locator('div [class="MuiContainer-root MuiContainer-maxWidthLg css-lnoso8-MuiContainer-root"]');
      await expect(mobileBox).toHaveCount(1);
    });*/

    test('should verify done btn functionality', async ({ page }) => {
      const editBtn = page.locator('td a').getByText('Edit').nth(6);
      await editBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks\/[^/]+/);
      const doneBtn = page.locator('[data-testid="content-editor-done-button"]');
      await doneBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks/);
    });

  });

  test.describe('Appearance', () => {
    test.beforeEach(async ({ page }) => {
      const appearanceHomeBtn = page.locator('a').getByText('Appearance').first();
      await appearanceHomeBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/site\/appearance/);
    });

    test('should change color palette', async ({ page }) => {
      const colorSettings = page.locator('h6').getByText('Color Palette');
      await colorSettings.click();
      const palettePreset = page.locator('span').getByText('Palette 16');
      await palettePreset.click();
      const saveBtn = page.locator('[data-testid="save-palette-button"]');
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const validatedChange = page.locator('[data-testid="preview-plan-visit-button"]');
      await expect(validatedChange).toHaveCSS('background-color', 'rgb(255, 100, 10)');
    });

    test('should cancel changing color palette', async ({ page }) => {
      const colorSettings = page.locator('h6').getByText('Color Palette');
      await colorSettings.click();
      const palettePreset = page.locator('span').getByText('Palette 16');
      await expect(palettePreset).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(2000);
      await expect(palettePreset).toHaveCount(0);
    });

    test('should change font', async ({ page }) => {
      const fontSettings = page.locator('h6').getByText('Fonts');
      await fontSettings.click();
      const headerFontSelect = page.locator('[data-testid="heading-font-button"]');
      await headerFontSelect.click();
      await page.waitForTimeout(500);
      const headerFont = page.locator('td').getByText('Montserrat').first();
      await headerFont.click();
      const saveBtn = page.locator('[data-testid="save-fonts-button"]');
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const validatedChange = page.locator('h1').getByText('Welcome to Grace Community Church');
      await expect(validatedChange).toHaveCSS('font-family', 'Montserrat');
    });

    test('should cancel changing font', async ({ page }) => {
      const fontSettings = page.locator('h6').getByText('Fonts');
      await fontSettings.click();
      const headerFontSelect = page.locator('[data-testid="heading-font-button"]');
      await expect(headerFontSelect).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(2000);
      await expect(headerFontSelect).toHaveCount(0);
    });

    test('DOES NOT WORK should add custom CSS', async ({ page }) => {
      const stylesheetSettings = page.locator('h6').getByText('CSS & Javascript');
      await stylesheetSettings.click();
      const cssBox = page.locator('textarea').first();
      await cssBox.fill('h1 {\ncolor: #7FFF00\n}');
      const saveBtn = page.locator('button').getByText('Save Changes');
      await saveBtn.click();
      await page.waitForTimeout(2000);
      const validatedChange = page.locator('h1').getByText("Welcome to Grace Community Church");
      await expect(validatedChange).toHaveCSS('color', 'rgb(127, 255, 0)');
    });

    test('should cancel adding custom CSS', async ({ page }) => {
      const stylesheetSettings = page.locator('h6').getByText('CSS & Javascript');
      await stylesheetSettings.click();
      const cssBox = page.locator('textarea').first();
      await expect(cssBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(2000);
      await expect(cssBox).toHaveCount(0);
    });

    test('should add footer', async ({ page }) => {
      const footerSettings = page.locator('h6').getByText('Site Footer');
      await footerSettings.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/site\/blocks\/[^/]+/);
    });

  });

  test.describe('Files', () => {
    test.beforeEach(async ({ page }) => {
      const filesHomeBtn = page.locator('a').getByText('Files').first();
      await filesHomeBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/site\/files/);
    });

    test('should upload file', async ({ page }) => {
      const chooseFileBtn = page.locator('[id="fileUpload"]');
      await chooseFileBtn.click();
      await chooseFileBtn.setInputFiles('public/images/logo.png');
      const uploadBtn = page.locator('button').getByText('Upload');
      await uploadBtn.click();
      await page.waitForTimeout(2000);
      const validatedUpload = page.locator('td').getByText('Logo.png');
      await expect(validatedUpload).toHaveCount(1);
    });

    test('should remove file', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const deleteBtn = page.locator('button').getByText('delete');
      await deleteBtn.click();
      await page.waitForTimeout(200);
      const validatedDeletion = page.locator('td').getByText('Logo.png');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  test.describe('Calendar', () => {
    test.beforeEach(async ({ page }) => {
      const calendarHomeBtn = page.locator('a').getByText('Calendar').first();
      await calendarHomeBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/calendars/);
    });

    test('should add calendar', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-calendar"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Octavian Test Calendar');
      const saveBtn = page.locator('[data-testid="save-calendar-button"]');
      await saveBtn.click();
      const validatedCalendar = page.locator('h6').getByText('Octavian Test Calendar');
      await expect(validatedCalendar).toHaveCount(1);
    });

    test('should add group events to calendar', async ({ page }) => {
      const editBtn = page.locator('[aria-label="Manage Events"]').last();
      await editBtn.click();
      const addBtn = page.locator('[data-testid="calendar-add-event-button"]');
      await addBtn.click();
      const groupSelectBox = page.locator('[role="combobox"]');
      await groupSelectBox.click();
      const groupSelect = page.locator('li').getByText('Adult Bible Class');
      await groupSelect.click();
      const saveBtn = page.locator('[data-testid="calendar-edit-save-button"]');
      await saveBtn.click();
      const validatedGroup = page.locator('td').getByText('Adult Bible Class');
      await expect(validatedGroup).toHaveCount(1);
      const agendaBtn = page.locator('button').getByText('Agenda');
      await agendaBtn.click();
      const validatedEvents = page.locator('[class="rbc-agenda-table"] td');
      await expect(validatedEvents).toHaveCount(9);
    });

    test('should cancel adding group events to calendar', async ({ page }) => {
      const editBtn = page.locator('[aria-label="Manage Events"]').last();
      await editBtn.click();
      const addBtn = page.locator('[data-testid="calendar-add-event-button"]');
      await addBtn.click();
      const groupSelectBox = page.locator('[role="combobox"]');
      await expect(groupSelectBox).toHaveCount(1);
      const cancelBtn = page.locator('[data-testid="calendar-edit-cancel-button"]');
      await cancelBtn.click();
      await expect(groupSelectBox).toHaveCount(0);
    });

    test('should remove group events from calendar', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('[aria-label="Manage Events"]').last();
      await editBtn.click();
      const removeBtn = page.locator('[aria-label="Adult Bible Class"]');
      await removeBtn.click();
      const validatedDeletion = page.locator('td').getByText('Adult Bible Class');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should edit calendar', async ({ page }) => {
      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Octavius Test Calendar');
      const saveBtn = page.locator('[data-testid="save-calendar-button"]');
      await saveBtn.click();
      const validatedChange = page.locator('h6').getByText('Octavius Test Calendar');
      await expect(validatedChange).toHaveCount(1);
    });

    test('should cancel editing calendar', async ({ page }) => {
      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const name = page.locator('[name="name"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete calendar', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const deleteBtn = page.locator('[data-testid="delete-calendar-button"]');
      await deleteBtn.click();
      const validatedDeletion = page.locator('h6').getByText('Octavius Test Calendar');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

});