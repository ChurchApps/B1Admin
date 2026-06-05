import type { Page } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { login } from './helpers/auth';
import { navigateToServing, navigateToPeople } from './helpers/navigation';
import { openKnownPerson, SEED_PEOPLE, recoverFromViteError } from './helpers/fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

// Planning-Center-style Workflows / Cards. Seed data (Api/tools/dbScripts/doing/demo.sql):
//   WFL00000001 "New Visitor Follow-up" with steps Greet/Call/Connect to Group,
//   WFL00000002 "Membership Class". Cards TSK00000101..105; TSK102 is overdue,
//   TSK103 snoozed, TSK104 assigned to Demo User (for My Cards).
// ZACCHAEUS is the marker name for rows these tests create.

async function gotoWorkflows(page: Page) {
  await page.locator('[id="secondaryMenu"] a').getByText('Workflows').click();
  await expect(page).toHaveURL(/\/serving\/tasks\/workflows/, { timeout: 10000 });
  await recoverFromViteError(page, page.locator('[data-testid="add-workflow-button"]'));
}

async function openSeedBoard(page: Page) {
  await gotoWorkflows(page);
  const row = page.locator('[data-testid="workflow-row-WFL00000001"]');
  await row.waitFor({ state: 'visible', timeout: 10000 });
  await row.click();
  await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/WFL00000001/, { timeout: 10000 });
  await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
  await page.locator('[data-testid="workflow-board"]').waitFor({ state: 'visible', timeout: 15000 });
}

test.describe.serial('Serving Management - Workflows', () => {
  test.describe.configure({ retries: 0 });

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

  test('workflows list shows seeded workflows', async () => {
    await gotoWorkflows(page);
    await expect(page.locator('[data-testid="workflow-row-WFL00000001"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="workflow-row-WFL00000002"]')).toBeVisible({ timeout: 10000 });
  });

  test('board renders seeded steps and cards', async () => {
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000001"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-column-WFS00000002"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-column-WFS00000003"]')).toBeVisible();
    // Greet column holds the two seeded "new visitor" cards.
    await expect(page.locator('[data-testid="workflow-card-TSK00000101"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-card-TSK00000102"]')).toBeVisible();
  });

  test('overdue card shows overdue styling', async () => {
    await openSeedBoard(page);
    // TSK00000102 has a past dueDate and no snooze -> overdue chip.
    await expect(page.locator('[data-testid="card-overdue-TSK00000102"]')).toBeVisible({ timeout: 10000 });
  });

  test('snoozed card shows snoozed styling', async () => {
    await openSeedBoard(page);
    // TSK00000103 has snoozedUntil in the future -> snoozed chip.
    await expect(page.locator('[data-testid="card-snoozed-TSK00000103"]')).toBeVisible({ timeout: 10000 });
  });

  test('move a card to another step and persist', async () => {
    await openSeedBoard(page);
    // Open the card drawer for TSK00000101 (in Greet) and move it to "Call".
    await page.locator('[data-testid="workflow-card-TSK00000101"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-step-select"]').click();
    await page.getByRole('option', { name: 'Call' }).click();
    // Re-open the board fresh and confirm the card now lives under the Call column.
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000002"] [data-testid="workflow-card-TSK00000101"]')).toBeVisible({ timeout: 10000 });
  });

  test('snooze a card from the drawer', async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="workflow-card-TSK00000101"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-snooze-button"]').click();
    await page.locator('[data-testid="snooze-1"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="card-snoozed-TSK00000101"]')).toBeVisible({ timeout: 10000 });
  });

  test('complete a card removes it from the board', async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="workflow-card-TSK00000105"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    // TSK00000105 is on the 2nd workflow; complete TSK00000101 here instead.
    await page.locator('[data-testid="workflow-card-TSK00000101"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-complete-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-card-TSK00000101"]')).toHaveCount(0, { timeout: 10000 });
  });

  test('create a new workflow', async () => {
    await gotoWorkflows(page);
    await page.locator('[data-testid="add-workflow-button"]').click();
    const nameInput = page.locator('[data-testid="workflow-name-input"] input');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('Zacchaeus Workflow');
    await page.locator('[data-testid="workflow-save-button"]').click();
    // Saving navigates to the new board (ids may contain _ and -).
    await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/[\w-]+$/, { timeout: 15000 });
  });

  test('add a step to the new workflow', async () => {
    await gotoWorkflows(page);
    await page.getByText('Zacchaeus Workflow').first().click();
    await page.locator('[data-testid="add-first-step-button"], [data-testid="add-step-button"]').first().click();
    const stepName = page.locator('[data-testid="step-name-input"] input');
    await stepName.waitFor({ state: 'visible', timeout: 10000 });
    await stepName.fill('Greet');
    await page.locator('[data-testid="step-save-button"]').click();
    // The new column appears with the step name.
    await expect(page.locator('[data-testid="workflow-board"]').getByText('Greet').first()).toBeVisible({ timeout: 10000 });
  });

  test('My Cards shows the demo user assigned card', async () => {
    await page.goto('/serving/tasks/workflows/mine');
    await recoverFromViteError(page, page.locator('[data-testid="my-cards-list"]'));
    await page.locator('[data-testid="my-cards-list"]').waitFor({ state: 'visible', timeout: 15000 });
    // TSK00000104 (James Wilson) is assigned to Demo User.
    await expect(page.locator('[data-testid="workflow-card-TSK00000104"]')).toBeVisible({ timeout: 10000 });
  });

  test('reports page renders for a workflow', async () => {
    await page.goto('/serving/tasks/workflows/WFL00000001/reports');
    await recoverFromViteError(page, page.locator('[data-testid="workflow-reports"]'));
    await page.locator('[data-testid="workflow-reports"]').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.locator('[data-testid="report-overdue-count"]')).toBeVisible({ timeout: 10000 });
  });

  test('add a person to a workflow from the Person page', async () => {
    await openKnownPerson(page, SEED_PEOPLE.DOROTHY);
    await page.locator('[data-testid="add-to-workflow-button"]').click();
    await page.locator('[data-testid="add-to-workflow-select"]').click();
    await page.getByRole('option', { name: 'New Visitor Follow-up' }).click();
    await page.locator('[data-testid="add-to-workflow-confirm"]').click();
    await expect(page.locator('[data-testid="add-to-workflow-success"]')).toBeVisible({ timeout: 10000 });
    // Close the dialog so its backdrop doesn't block the next test.
    await page.locator('[role="dialog"] button').getByText('Close').click();
  });

  test('automation can use the Add to Workflow action', async () => {
    // Navigate straight to the automations page by URL (prior test ended on a Person page).
    await page.goto('/serving/tasks/automations');
    await recoverFromViteError(page, page.locator('button').getByText('Add Automation'));
    await expect(page).toHaveURL(/\/tasks\/automations/, { timeout: 10000 });

    // Create an automation, then add an addToWorkflow action to it.
    await page.locator('button').getByText('Add Automation').click();
    const autoName = page.locator('[name="title"]');
    await autoName.waitFor({ state: 'visible', timeout: 10000 });
    await autoName.fill('Zacchaeus Workflow Automation');
    await page.locator('button').getByText('Save').click();
    await expect(page.locator('h6').getByText('Zacchaeus Workflow Automation')).toBeVisible({ timeout: 10000 });

    await page.locator('h6').getByText('Zacchaeus Workflow Automation').click();
    await page.locator('button').getByText('Add Action').click();
    await page.locator('[data-testid="action-type-select"]').click();
    await page.getByRole('option', { name: 'Add to Workflow' }).click();
    await page.locator('[data-testid="action-workflow-select"]').click();
    await page.getByRole('option', { name: 'New Visitor Follow-up' }).click();
    await page.locator('button').getByText('Save').click();
    await expect(page.locator('p').getByText('Add to Workflow')).toBeVisible({ timeout: 10000 });
  });

  test('configure a form trigger on a workflow', async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="board-triggers-button"]').click();
    // Seeded trigger uses the "Visitor Information Card" form.
    await expect(page.getByRole('dialog').getByText('Visitor Information Card')).toBeVisible({ timeout: 10000 });
    // Add a second trigger for "VBS Registration".
    await page.locator('[data-testid="trigger-form-select"]').click();
    await page.getByRole('option', { name: 'VBS Registration' }).click();
    await page.locator('[data-testid="add-trigger-button"]').click();
    await expect(page.getByRole('dialog').getByText('VBS Registration')).toBeVisible({ timeout: 10000 });
    // Close the dialog so its backdrop doesn't block the next test's navigation.
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  });

  test('bulk add people to a workflow from People', async () => {
    await navigateToPeople(page);
    for (const name of [SEED_PEOPLE.DONALD, SEED_PEOPLE.CAROL]) {
      const row = page.locator('table tbody tr').filter({ hasText: name }).first();
      await row.waitFor({ state: 'visible', timeout: 10000 });
      await row.getByRole('checkbox').check();
    }
    await page.getByTestId('bulk-actions-button').click();
    await page.getByTestId('bulk-action-add-workflow').click();
    await page.locator('[data-testid="bulk-workflow-select"]').click();
    await page.getByRole('option', { name: 'New Visitor Follow-up' }).click();
    await page.locator('[data-testid="bulk-workflow-apply"]').click();
    await expect(page.getByText(/Added 2 people to the workflow/i)).toBeVisible({ timeout: 10000 });
  });
});
