import type { Page } from '@playwright/test';
import { loggedInTest as test, expect } from './helpers/test-fixtures';
import { navigateToServing } from './helpers/navigation';
import { login } from './helpers/auth';
import { STORAGE_STATE_PATH } from './global-setup';

// Coverage for ChurchAppsSupport/b1Admin/automations.md.
// The doc itself is sparse (video link only); tests anchor on documented behavior:
// trigger conditions + actions, recurring options, active/inactive toggle.
// Source: src/serving/tasks/automations/{AutomationsPage, components/AutomationEdit, components/AutomationDetails}.tsx

const DISPOSABLE_AUTOMATION = 'Octavian Test Automation';

async function openAutomationsPage(page: import('@playwright/test').Page) {
  await navigateToServing(page);
  await page.goto('/serving/tasks/automations');
  await page.waitForURL(/\/serving\/tasks\/automations/, { timeout: 15000 });
  // Page header heading "Manage Automations" or "Automations" — match by id.
  await page.locator('#page-header-title').waitFor({ state: 'visible', timeout: 15000 });
}

async function clickAddAutomation(page: import('@playwright/test').Page) {
  // The Add button text comes from Locale tasks.automationsPage.addAuto.
  // Looking up by visible button text "Add Automation".
  const addBtn = page.getByRole('button').filter({ hasText: /Add Automation/i }).first();
  await addBtn.click();
  // AutomationEdit drawer renders the title input
  await page.locator('[data-testid="automation-title-input"] input').waitFor({ state: 'visible', timeout: 10000 });
}

async function findAutomationRow(page: import('@playwright/test').Page, title: string) {
  // List items render a heading-level h6 with the title.
  const heading = page.getByRole('heading', { name: title, exact: true }).first();
  await heading.waitFor({ state: 'visible', timeout: 15000 });
  return page.getByRole('listitem').filter({ has: heading }).first();
}

test.describe('Automations page', () => {
  test('renders the page header and Add Automation button', async ({ page }) => {
    await openAutomationsPage(page);
    await expect(page.locator('#page-header-title')).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: /Add Automation/i }).first()).toBeVisible();
  });

  test('opens the AutomationEdit drawer when Add is clicked', async ({ page }) => {
    await openAutomationsPage(page);
    await clickAddAutomation(page);
    await expect(page.locator('[data-testid="automation-title-input"] input')).toBeVisible();
    await expect(page.locator('[data-testid="recurs-select"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Save$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cancel$/ })).toBeVisible();
  });

  test('Recurs dropdown exposes Never / Yearly / Monthly / Weekly', async ({ page }) => {
    await openAutomationsPage(page);
    await clickAddAutomation(page);
    await page.locator('[data-testid="recurs-select"]').click();
    for (const option of ['Never', 'Yearly', 'Monthly', 'Weekly']) {
      await expect(page.locator('li[role="option"]', { hasText: new RegExp(`^${option}$`) })).toBeVisible({ timeout: 10000 });
    }
    await page.keyboard.press('Escape');
  });

  test('Cancel closes the drawer without persisting state', async ({ page }) => {
    await openAutomationsPage(page);
    await clickAddAutomation(page);
    await page.locator('[data-testid="automation-title-input"] input').fill('Should Not Persist');
    await page.getByRole('button', { name: /^Cancel$/ }).click();
    await expect(page.locator('[data-testid="automation-title-input"] input')).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Should Not Persist', exact: true })).toHaveCount(0);
  });
});

test.describe.serial('Automation lifecycle', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('creates a new automation with weekly recurrence', async () => {
    await openAutomationsPage(page);
    await clickAddAutomation(page);
    await page.locator('[data-testid="automation-title-input"] input').fill(DISPOSABLE_AUTOMATION);
    await page.locator('[data-testid="recurs-select"]').click();
    await page.locator('li[role="option"]', { hasText: /^Weekly$/ }).click();
    await page.locator('[role="listbox"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
    await page.getByRole('button', { name: /^Save$/ }).click();
    // After save, the AutomationDetails sidebar opens (handleAdded sets editAutomation).
    // The new automation should also appear in the list.
    await findAutomationRow(page, DISPOSABLE_AUTOMATION);
  });

  test('opens AutomationDetails when the automation list item is clicked', async () => {
    await openAutomationsPage(page);
    const row = await findAutomationRow(page, DISPOSABLE_AUTOMATION);
    await row.click();
    // AutomationDetails renders an Actions section header and a Conditions section.
    await expect(page.getByText(/Actions:/i).first()).toBeVisible({ timeout: 10000 });
    // Recurs chip should reflect "weekly".
    await expect(page.getByText(/recurs.*weekly/i).first()).toBeVisible();
  });

  test('toggles the automation Active state via the edit drawer', async () => {
    await openAutomationsPage(page);
    const initialRow = await findAutomationRow(page, DISPOSABLE_AUTOMATION);
    await initialRow.click();
    // Switch into edit via the EditIcon button in the AutomationDetails header.
    const editIcon = page.locator('button:has(svg[data-testid="EditIcon"])').first();
    await editIcon.click();
    await page.locator('[data-testid="automation-title-input"] input').waitFor({ state: 'visible', timeout: 10000 });
    // Toggle the active switch off (default is active=true after creation)
    const activeSwitch = page.locator('span.MuiSwitch-root input[type="checkbox"]').first();
    await activeSwitch.click();
    await page.getByRole('button', { name: /^Save$/ }).click();
    await page.locator('[data-testid="automation-title-input"] input').waitFor({ state: 'hidden', timeout: 15000 });
    // After toggling off, secondary text in the list should read "Inactive".
    const refreshedRow = await findAutomationRow(page, DISPOSABLE_AUTOMATION);
    await expect(refreshedRow).toContainText(/Inactive/i, { timeout: 10000 });
  });

  test('deletes the automation', async () => {
    await openAutomationsPage(page);
    const row = await findAutomationRow(page, DISPOSABLE_AUTOMATION);
    await row.click();
    // Edit it via the small edit icon to access the AutomationEdit drawer with Delete button.
    const editIcon = page.locator('button:has(svg[data-testid="EditIcon"])').first();
    await editIcon.click();
    await page.getByRole('button', { name: /^Delete$/ }).click();
    await expect(page.getByRole('heading', { name: DISPOSABLE_AUTOMATION, exact: true }))
      .toHaveCount(0, { timeout: 15000 });
  });
});
