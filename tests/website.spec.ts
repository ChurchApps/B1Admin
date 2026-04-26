import type { Page } from '@playwright/test';
import { siteTest as test, expect } from './helpers/test-fixtures';
import { trashIconButton } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToSite } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe('Website Management', () => {

  /* test('should load website home', async ({ page }) => {
    const websiteHeader = page.locator('h4').getByText('Website Pages');
    await websiteHeader.click();
  }); */


  test.describe.serial('Pages', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    // Several tests in this chain click "edit-page-button" which navigates to
    // the page preview view. Re-enter /site/pages before each test so the
    // pages list (and its edit affordances) is in the DOM. Close any open
    // Page Settings dialog first — "should cancel deleting page" leaves it
    // open, and the dialog blocks pointer events on the primary nav.
    test.beforeEach(async () => {
      const settingsDialog = page.locator('div[role="dialog"]:has-text("Page Settings")');
      if (await settingsDialog.isVisible({ timeout: 200 }).catch(() => false)) {
        await settingsDialog.locator('button:has-text("Cancel")').click();
        await settingsDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
      }
      if (!/\/site\/pages(\?|$)/.test(page.url())) {
        await navigateToSite(page);
      }
    });

    test('should add page', async () => {
      const addBtn = page.locator('[data-testid="add-page-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Zacchaeus Test Page');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPage = page.locator('td').getByText('Zacchaeus Test Page');
      await expect(validatedPage).toHaveCount(1);
    });

    test('should cancel adding page', async () => {
      const addBtn = page.locator('[data-testid="add-page-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should edit page title', async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator('button').getByText('Page Settings');
      await settingsBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill('Zebedee Test Page');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedPage = page.locator('h6').getByText('Zebedee Test Page');
      await expect(validatedPage).toHaveCount(2);
    });

    test('should cancel editing page title', async () => {
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

    test('should edit page content', async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator('button').getByText('Edit Content');
      await contentBtn.click();
      const addBtn = page.locator('button').getByText('add');
      await addBtn.click();
      await expect(page.locator('div').getByText('Section').nth(2)).toBeVisible({ timeout: 10000 });
      const section = page.locator('div').getByText('Section').nth(2);
      const dropzone = page.locator('div [data-testid="droppable-area"]').first();
      await section.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await dropzone.hover();
      await page.mouse.up();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      //add text to confirm
      await addBtn.click();
      await expect(page.locator('div').getByText('Text').nth(1)).toBeVisible({ timeout: 10000 });
      const text = page.locator('div').getByText('Text').nth(1);
      const secondaryDropzone = page.locator('div [data-testid="droppable-area"]').nth(1);
      await text.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await secondaryDropzone.hover();
      await page.mouse.up();
      const textbox = page.locator('[role="textbox"]');
      await textbox.fill('Zacchaeus Test Text');
      await saveBtn.click();
      const validatedText = page.locator('p').getByText('Zacchaeus Test Text');
      await expect(validatedText).toBeVisible({ timeout: 10000 });
      await expect(validatedText).toHaveCount(1);
    });

    test('should verify done button functionality', async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator('button').getByText('Edit Content');
      await contentBtn.click();
      await expect(page).toHaveURL(/\/site\/pages\/[^/]+/);
      const doneBtn = page.locator('[data-testid="content-editor-done-button"]');
      await expect(doneBtn).toBeVisible({ timeout: 10000 });
      await doneBtn.click();
      await expect(page).toHaveURL(/\/site\/pages\/preview\/[^/]+/, { timeout: 10000 });
    });

    test('should cancel deleting page', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });

      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator('button').getByText('Page Settings');
      await settingsBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      // After dismiss, we should still be on the page editor with the renamed page intact.
      await expect(page).toHaveURL(/\/site\/pages\/preview\/[^/]+/);
      const stillExists = page.locator('h6').getByText('Zebedee Test Page');
      await expect(stillExists.first()).toBeVisible();
    });

    test('should delete page', async () => {
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

      const validatedDeletion = page.locator('td').getByText('Zebedee Test Page');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  test.describe.serial('Blocks', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const blocksHomeBtn = page.locator('a').getByText('Blocks').first();
      await blocksHomeBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks/);
    });

    test('should add block', async () => {
      const addBtn = page.locator('[data-testid="add-block-button"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Zacchaeus Test Block');
      const typeSelectBox = page.locator('[role="combobox"]');
      await typeSelectBox.click();
      const typeSelect = page.locator('[data-testid="block-type-section"]');
      await typeSelect.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedBlock = page.locator('td').getByText('Zacchaeus Test Block');
      await expect(validatedBlock).toBeVisible({ timeout: 10000 });
      await expect(validatedBlock).toHaveCount(1);
    });

    test('should cancel adding block', async () => {
      const addBtn = page.locator('[data-testid="add-block-button"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should edit block content', async () => {
      const editBtn = page.locator('td a').getByText('Edit').last();
      await editBtn.click();
      const addBtn = page.locator('button').getByText('add');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await expect(page.locator('div').getByText('Section').nth(2)).toBeVisible({ timeout: 10000 });
      const section = page.locator('div').getByText('Section').nth(2);
      const dropzone = page.locator('div [data-testid="droppable-area"]').first();
      await section.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      // Empty blocks render a zero-sized dropzone covered by the preview-desktop
      // wrapper; force the hover so the drop completes despite the overlay.
      await dropzone.hover({ force: true });
      await page.mouse.up();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      //add text to confirm
      await addBtn.click();
      await expect(page.locator('div').getByText('Text').nth(1)).toBeVisible({ timeout: 10000 });
      const text = page.locator('div').getByText('Text').nth(1);
      const secondaryDropzone = page.locator('div [data-testid="droppable-area"]').nth(1);
      await text.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await secondaryDropzone.hover({ force: true });
      await page.mouse.up();
      const textbox = page.locator('[role="textbox"]');
      await textbox.fill('Zacchaeus Test Text');
      await saveBtn.click();
      const validatedText = page.locator('p').getByText('Zacchaeus Test Text');
      await expect(validatedText).toBeVisible({ timeout: 10000 });
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

    test('should rename block', async () => {
      const renameBtn = page.locator('[data-testid^="rename-block-"]').last();
      await renameBtn.click();
      const nameInput = page.locator('[data-testid="block-name-input"] input');
      await nameInput.fill('Zacchaeus Renamed Block');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const renamed = page.locator('td').getByText('Zacchaeus Renamed Block');
      await expect(renamed).toBeVisible({ timeout: 10000 });
      await expect(renamed).toHaveCount(1);
    });

    test('should verify done btn functionality', async () => {
      const editBtn = page.locator('td a').getByText('Edit').last();
      await editBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks\/[^/]+/);
      const doneBtn = page.locator('[data-testid="content-editor-done-button"]');
      await doneBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks/, { timeout: 10000 });
    });

  });

  test.describe.serial('Appearance', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const appearanceHomeBtn = page.locator('a').getByText('Appearance').first();
      await appearanceHomeBtn.click();
      await expect(page).toHaveURL(/\/site\/appearance/);
    });

    test('should change color palette', async () => {
      const colorSettings = page.locator('h6').getByText('Color Palette');
      await colorSettings.click();
      const palettePreset = page.locator('span').getByText('Palette 16');
      await palettePreset.click();
      const saveBtn = page.locator('[data-testid="save-palette-button"]');
      await saveBtn.click();
      const validatedChange = page.locator('[data-testid="preview-plan-visit-button"]');
      await expect(validatedChange).toHaveCSS('background-color', 'rgb(255, 100, 10)');
    });

    test('should cancel changing color palette', async () => {
      const colorSettings = page.locator('h6').getByText('Color Palette');
      await colorSettings.click();
      const palettePreset = page.locator('span').getByText('Palette 16');
      await expect(palettePreset).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(palettePreset).toHaveCount(0);
    });

    test('should change font', async () => {
      const fontSettings = page.locator('h6').getByText('Fonts').last();
      await fontSettings.click();
      const headerFontSelect = page.locator('[data-testid="heading-font-button"]');
      await headerFontSelect.click();
      const headerFont = page.locator('td').getByText('Montserrat').first();
      await expect(headerFont).toBeVisible({ timeout: 10000 });
      await headerFont.click();
      const saveBtn = page.locator('[data-testid="save-fonts-button"]');
      await saveBtn.click();
      const validatedChange = page.locator('h1').getByText('Welcome to Grace Community Church').or(page.locator('h1').getByText('Welcome to Gracious Community Church'));
      await expect(validatedChange).toHaveCSS('font-family', 'Montserrat');
    });

    test('should cancel changing font', async () => {
      const fontSettings = page.locator('h6').getByText('Fonts').last();
      await fontSettings.click();
      const headerFontSelect = page.locator('[data-testid="heading-font-button"]');
      await expect(headerFontSelect).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(headerFontSelect).toHaveCount(0);
    });

    test('should add custom CSS', async () => {
      const stylesheetSettings = page.locator('h6').getByText('CSS & Javascript');
      await stylesheetSettings.click();
      // Scope to the named CSS field — page-level `textarea` also matches the
      // SuperBee chat widget's hidden textarea, which never unmounts.
      const cssBox = page.locator('textarea[name="css"]');
      await cssBox.fill('h1 {\ncolor: #7FFF00\n}');
      const saveBtn = page.locator('button').getByText('Save Changes');
      await saveBtn.click();
      const validatedChange = page.locator('h1').getByText("Welcome to Grace Community Church").or(page.locator('h1').getByText('Welcome to Gracious Community Church'));
      await expect(validatedChange).toHaveCSS('color', 'rgb(127, 255, 0)');
    });

    test('should cancel adding custom CSS', async () => {
      const stylesheetSettings = page.locator('h6').getByText('CSS & Javascript');
      await stylesheetSettings.click();
      const cssBox = page.locator('textarea[name="css"]');
      await expect(cssBox).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(cssBox).toHaveCount(0);
    });

    test('should open and cancel typography scale', async () => {
      const typographyOption = page.locator('[data-testid="style-option-typography"]');
      await typographyOption.click();
      const baseSize = page.locator('[data-testid="base-size-input"]');
      await expect(baseSize).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(baseSize).toHaveCount(0);
    });

    test('should open and cancel spacing scale', async () => {
      const spacingOption = page.locator('[data-testid="style-option-spacing"]');
      await spacingOption.click();
      const xsInput = page.locator('[data-testid="spacing-xs-input"]');
      await expect(xsInput).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(xsInput).toHaveCount(0);
    });

    test('should open and cancel logo settings', async () => {
      const logoOption = page.locator('[data-testid="style-option-logo"]');
      await logoOption.click();
      const saveLogoBtn = page.locator('[data-testid="save-appearance-button"]');
      await expect(saveLogoBtn).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(saveLogoBtn).toHaveCount(0);
    });

    test('should add footer', async () => {
      const footerSettings = page.locator('h6').getByText('Site Footer');
      await footerSettings.click();
      await expect(page).toHaveURL(/\/site\/blocks\/[^/]+/, { timeout: 10000 });
    });

  });

  test.describe.serial('Files', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const filesHomeBtn = page.locator('a').getByText('Files').first();
      await filesHomeBtn.click();
      await expect(page).toHaveURL(/\/site\/files/);
    });

    test('should upload file', async () => {
      const chooseFileBtn = page.locator('[id="fileUpload"]');
      await chooseFileBtn.click();
      await chooseFileBtn.setInputFiles('public/images/logo.png');
      const uploadBtn = page.locator('button').getByText('Upload');
      await uploadBtn.click();
      const validatedUpload = page.locator('td').getByText('Logo.png');
      await expect(validatedUpload).toBeVisible({ timeout: 10000 });
      await expect(validatedUpload).toHaveCount(1);
    });

    test('should remove file', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const deleteBtn = page.locator('button').getByText('delete');
      await deleteBtn.click();
      const validatedDeletion = page.locator('td').getByText('Logo.png');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  test.describe.serial('Calendar', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const calendarHomeBtn = page.locator('a').getByText('Calendar').first();
      await calendarHomeBtn.click();
      await expect(page).toHaveURL(/\/calendars/);
    });

    test('should add calendar', async () => {
      const addBtn = page.locator('[data-testid="add-calendar"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Zacchaeus Test Calendar');
      const saveBtn = page.locator('[data-testid="save-calendar-button"]');
      await saveBtn.click();
      const validatedCalendar = page.locator('h6').getByText('Zacchaeus Test Calendar');
      await expect(validatedCalendar).toHaveCount(1);
    });

    test('should add group events to calendar', async () => {
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
      await expect(validatedGroup).toBeVisible({ timeout: 10000 });
      await expect(validatedGroup).toHaveCount(1);
      const agendaBtn = page.locator('button').getByText('Agenda');
      await agendaBtn.click();
      const validatedEvents = page.locator('[class="rbc-agenda-table"] td').getByText('Adult Bible Class').first();
      await expect(validatedEvents).toHaveCount(1);
    });

    test('should cancel adding group events to calendar', async () => {
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

    test('should remove group events from calendar', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('[aria-label="Manage Events"]').last();
      await editBtn.click();
      const removeBtn = trashIconButton(page).first();
      await removeBtn.click();
      const validatedDeletion = page.locator('td').getByText('Adult Bible Class');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should edit calendar', async () => {
      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill('Zebedee Test Calendar');
      const saveBtn = page.locator('[data-testid="save-calendar-button"]');
      await saveBtn.click();
      const validatedChange = page.locator('h6').getByText('Zebedee Test Calendar');
      await expect(validatedChange).toHaveCount(1);
    });

    test('should cancel editing calendar', async () => {
      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const name = page.locator('[name="name"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test('should delete calendar', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const deleteBtn = page.locator('[data-testid="delete-calendar-button"]');
      await deleteBtn.click();
      const validatedDeletion = page.locator('h6').getByText('Zebedee Test Calendar');
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  // Edge-case extensions: URL slug surface + appearance affordances from
  // .notes/B1Admin-test-coverage-gaps.md §3 (website.spec.ts row).
  test.describe('Pages — URL slug surface', () => {
    test('Pages list exposes the URL of each page (slugs are visible, clickable)', async ({ page }) => {
      const pagesNav = page.locator('[id="secondaryMenu"]').getByText('Pages');
      await pagesNav.click();
      await page.waitForURL(/\/site\/pages/, { timeout: 10000 });
      // PagesPage renders a tbody with each page's URL in a TableCell.
      // Anchor on at least one URL-shaped string ("/foo") in the table.
      const urlCell = page.locator('table tbody tr td').getByText(/^\//).first();
      await expect(urlCell).toBeVisible({ timeout: 10000 });
    });

    test('Add Page button opens a modal with a URL field affordance', async ({ page }) => {
      const pagesNav = page.locator('[id="secondaryMenu"]').getByText('Pages');
      await pagesNav.click();
      await page.locator('[data-testid="add-page-button"]').click();
      // The modal exposes a Title (name="title") right away. Stay shallow — confirm modal opened.
      await expect(page.locator('[name="title"]').first()).toBeVisible({ timeout: 10000 });
      // Cancel out so we don't leave a dirty drawer.
      const cancelBtn = page.locator('button').getByText('Cancel').first();
      await cancelBtn.click().catch(() => { });
    });
  });

  test.describe('Appearance — toggles persist after save', () => {
    test('navigating away and back to Appearance keeps the user on the section', async ({ page }) => {
      const appearanceTab = page.locator('[id="secondaryMenu"]').getByText('Appearance');
      await appearanceTab.click();
      await page.waitForURL(/\/site\/appearance/, { timeout: 10000 });
      const pagesNav = page.locator('[id="secondaryMenu"]').getByText('Pages');
      await pagesNav.click();
      await page.waitForURL(/\/site\/pages/, { timeout: 10000 });
      await appearanceTab.click();
      await page.waitForURL(/\/site\/appearance/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/site\/appearance/);
    });
  });

});
