import type { Page } from '@playwright/test';
import { settingsTest as test, expect } from './helpers/test-fixtures';
import { navigateToForms } from './helpers/navigation';
import { login } from './helpers/auth';
import { STORAGE_STATE_PATH } from './global-setup';

// Coverage for ChurchAppsSupport/b1Admin/forms.md.
// Forms live under Settings → Forms. Two contentTypes:
//   - "person": data-collection forms attached to a person profile.
//   - "form":   stand-alone forms with public URLs and access-window options.
// FormEdit (FormEdit.tsx) is the create/edit drawer; Form.tsx renders
// the questions table; FormQuestionEdit drives question CRUD.

const DISPOSABLE_PERSON_FORM = 'Zacchaeus Test Person Form';
const DISPOSABLE_STANDALONE_FORM = 'Zacchaeus Test Standalone Form';

async function selectMuiOption(page: import('@playwright/test').Page, openLocator: ReturnType<import('@playwright/test').Page['locator']>, optionText: string) {
  await openLocator.click();
  const option = page.locator('li[role="option"]', { hasText: optionText }).first();
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
  // wait for the listbox to detach so subsequent clicks don't re-target it
  await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => { });
}

async function openFormsPage(page: import('@playwright/test').Page) {
  // settingsTest fixture leaves us on /settings; explicitly navigate to forms.
  await navigateToForms(page);
  await expect(page).toHaveURL(/\/forms/, { timeout: 15000 });
  // Add Form button is the canonical signal that the page rendered.
  await page.locator('[data-testid="add-form-button"]').waitFor({ state: 'visible', timeout: 15000 });
}

async function clickAddForm(page: import('@playwright/test').Page) {
  await page.locator('[data-testid="add-form-button"]').click();
  await page.locator('[data-testid="form-name-input"] input').waitFor({ state: 'visible', timeout: 10000 });
}

async function saveFormDrawer(page: import('@playwright/test').Page) {
  // InputBox in apphelper renders a button with text "Save" in the formBox container.
  await page.locator('#formBox button', { hasText: /^Save$/ }).click();
  // After save, drawer closes (formBox detaches).
  await page.locator('#formBox').waitFor({ state: 'hidden', timeout: 15000 });
}

// No beforeAll cleanup: it would run once per worker and race with describe.serial
// blocks in other workers. The pretest reset-demo handles fresh state, and the
// final lifecycle test deletes the disposable form.

test.describe('Forms page', () => {
  test('should render Forms list with Add Form button', async ({ page }) => {
    await openFormsPage(page);
    await expect(page.locator('[data-testid="add-form-button"]')).toBeVisible();
    // Forms card header text comes from forms.formsPage.forms locale
    await expect(page.getByRole('heading', { name: /^Forms$/ }).first()).toBeVisible();
  });

  test('should require a name when creating a form', async ({ page }) => {
    await openFormsPage(page);
    await clickAddForm(page);
    // Submit empty
    await page.locator('#formBox button', { hasText: /^Save$/ }).click();
    // Drawer must remain open and an error must appear.
    await expect(page.locator('#formBox')).toBeVisible();
    // ErrorMessages renders as alerts inside the drawer.
    await expect(page.locator('#formBox').getByRole('alert').first()).toBeVisible({ timeout: 5000 });
    // Cancel out so the drawer doesn't pollute later tests.
    await page.locator('#formBox button', { hasText: /^Cancel$/ }).click();
    await page.locator('#formBox').waitFor({ state: 'hidden', timeout: 10000 });
  });
});

test.describe.serial('People-associated form lifecycle', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('creates a People-associated form', async () => {
    await openFormsPage(page);
    await clickAddForm(page);
    await page.locator('[data-testid="form-name-input"] input').fill(DISPOSABLE_PERSON_FORM);
    // Default contentType is "person", but click anyway to verify selector works.
    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), 'People');
    await saveFormDrawer(page);
    // Form should appear in the active list with a clickable link.
    const row = page.locator('table tbody tr').filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    // People-type forms have no public URL — second column should be empty.
    const urlCell = row.locator('td').nth(1);
    await expect(urlCell).toHaveText('');
  });

  test('opens the form and shows the Add Question button', async () => {
    await openFormsPage(page);
    await page.locator('table tbody tr').filter({ hasText: DISPOSABLE_PERSON_FORM }).first()
      .locator('a', { hasText: DISPOSABLE_PERSON_FORM }).click();
    await page.waitForURL(/\/forms\/[\w-]+/, { timeout: 10000 });
    await expect(page.locator('button[aria-label="addQuestion"]')).toBeVisible({ timeout: 10000 });
  });

  test('adds a required Email question', async () => {
    await openFormsPage(page);
    await page.locator('table tbody tr').filter({ hasText: DISPOSABLE_PERSON_FORM }).first()
      .locator('a', { hasText: DISPOSABLE_PERSON_FORM }).click();
    await page.waitForURL(/\/forms\/[\w-]+/, { timeout: 10000 });
    await page.locator('button[aria-label="addQuestion"]').click();
    await page.locator('[data-testid="question-title-input"] input').waitFor({ state: 'visible', timeout: 10000 });

    // Switch provider to Email — the FormControl wraps the Select; click the label-bearing combobox.
    const providerSelect = page.locator('#questionBox').getByLabel('Provider');
    await selectMuiOption(page, providerSelect, 'Email');

    await page.locator('[data-testid="question-title-input"] input').fill('Email Address');
    await page.locator('[data-testid="question-required-checkbox"]').check();

    await page.locator('#questionBox button', { hasText: /^Save$/ }).click();
    await page.locator('#questionBox').waitFor({ state: 'hidden', timeout: 15000 });

    // Question table should now show our row with type Email and Required = Yes.
    const qRow = page.locator('table tbody tr').filter({ hasText: 'Email Address' }).first();
    await expect(qRow).toBeVisible({ timeout: 10000 });
    await expect(qRow).toContainText('Email');
    await expect(qRow).toContainText(/Yes/);
  });

  test('archives, restores, and deletes the form', async () => {
    // Archive
    await openFormsPage(page);
    const row = page.locator('table tbody tr').filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    page.once('dialog', async d => { await d.accept(); });
    await row.locator('[data-testid^="archive-form-button-"]').click();

    // Switch to Archived Forms tab (visible once archivedCount > 0)
    const archivedTab = page.locator('button[role="tab"]', { hasText: 'Archived Forms' }).first();
    await archivedTab.waitFor({ state: 'visible', timeout: 10000 });
    await archivedTab.click();
    const archivedRow = page.locator('table tbody tr').filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    await expect(archivedRow).toBeVisible({ timeout: 10000 });

    // Restore
    const restoreBtn = archivedRow.locator('[data-testid^="restore-form-button-"]');
    await restoreBtn.waitFor({ state: 'visible', timeout: 10000 });
    page.once('dialog', async d => { await d.accept(); });
    await restoreBtn.click();

    // Re-open Forms page; form should be back on the active tab
    await openFormsPage(page);
    const activeRow = page.locator('table tbody tr').filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    await expect(activeRow).toBeVisible({ timeout: 10000 });

    // Delete via the FormEdit drawer.
    await activeRow.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator('#formBox').waitFor({ state: 'visible', timeout: 10000 });
    page.once('dialog', async d => { await d.accept(); });
    await page.locator('#formBox button', { hasText: /^Delete$/ }).click();
    await page.locator('#formBox').waitFor({ state: 'hidden', timeout: 15000 });
    await openFormsPage(page);
    await expect(page.locator('table tbody tr').filter({ hasText: DISPOSABLE_PERSON_FORM }))
      .toHaveCount(0, { timeout: 10000 });
  });
});

test.describe.serial('Stand Alone form lifecycle', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('creates a Stand Alone form with availability dates', async () => {
    await openFormsPage(page);
    await clickAddForm(page);
    await page.locator('[data-testid="form-name-input"] input').fill(DISPOSABLE_STANDALONE_FORM);
    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), 'Stand Alone');
    // Once contentType=form, additional dropdowns appear: Access (Public/Restricted) + Available?
    await selectMuiOption(page, page.locator('[data-testid="access-level-select"]'), 'Public');
    // Available timeframe select is the 4th combobox in the drawer (after contentType, access, available)
    // Targeting by FormControl text since MUI Select / InputLabel association doesn't always work with getByLabel
    const availabilityFormControl = page.locator('#formBox div.MuiFormControl-root', { hasText: 'Set Form Availability Timeframe' });
    await selectMuiOption(page, availabilityFormControl.locator('[role="combobox"]'), 'Yes');

    // Fill date range. forms.md step 25 references availability windows.
    const startInput = page.locator('#formBox input[type="date"]').first();
    const endInput = page.locator('#formBox input[type="date"]').nth(1);
    await startInput.fill('2026-01-01');
    await endInput.fill('2026-12-31');

    await saveFormDrawer(page);
    const row = page.locator('table tbody tr').filter({ hasText: DISPOSABLE_STANDALONE_FORM }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    // Stand-alone forms render a public URL link in the URL column.
    await expect(row.locator('td a').filter({ hasText: /\/forms\// }).first()).toBeVisible();
  });

  test('deletes the stand alone form', async () => {
    await openFormsPage(page);
    const row = page.locator('table tbody tr').filter({ hasText: DISPOSABLE_STANDALONE_FORM }).first();
    await row.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator('#formBox').waitFor({ state: 'visible', timeout: 10000 });
    page.once('dialog', async d => { await d.accept(); });
    await page.locator('#formBox button', { hasText: /^Delete$/ }).click();
    await page.locator('#formBox').waitFor({ state: 'hidden', timeout: 15000 });
    await openFormsPage(page);
    await expect(page.locator('table tbody tr').filter({ hasText: DISPOSABLE_STANDALONE_FORM }))
      .toHaveCount(0, { timeout: 10000 });
  });
});
