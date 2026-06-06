import type { Page } from '@playwright/test';
import { request } from '@playwright/test';
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
  // Navigate by URL rather than the secondary menu — robust even when the prior
  // test left us outside the Serving area (e.g. on the People page).
  await page.goto('/serving/tasks/workflows');
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

// Open a specific workflow board directly by id (used by the routing tests).
async function openBoardById(page: Page, workflowId: string) {
  await page.goto('/serving/tasks/workflows/' + workflowId);
  await expect(page).toHaveURL(new RegExp('/serving/tasks/workflows/' + workflowId), { timeout: 10000 });
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
    // The Add button now opens a menu (Blank / templates); pick Blank for the form.
    await page.locator('[data-testid="add-workflow-blank"]').click();
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

  // ---- Hardening features (permissions, pinned, skip/sendBack, bulk, duplicate, templates, group-add) ----

  test('duplicate a workflow copies it with its steps', async () => {
    await gotoWorkflows(page);
    await page.locator('[data-testid="duplicate-workflow-WFL00000001"]').click();
    // The copy appears in the list with a "(copy)" suffix.
    await expect(page.getByText('New Visitor Follow-up (copy)').first()).toBeVisible({ timeout: 10000 });
  });

  test('create a workflow from a starter template', async () => {
    await gotoWorkflows(page);
    await page.locator('[data-testid="add-workflow-button"]').click();
    await page.locator('[data-testid="add-workflow-template-newVisitor"]').click();
    // Creating from a template navigates straight to the new board, pre-seeded with steps.
    await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/[\w-]+$/, { timeout: 15000 });
    await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
    await expect(page.locator('[data-testid="workflow-board"]').getByText('Send welcome email').first()).toBeVisible({ timeout: 10000 });
  });

  test('adding a group to a step creates a card per member', async () => {
    await openSeedBoard(page);
    const countLocator = page.locator('[data-testid="step-count-WFS00000001"]');
    const before = parseInt(((await countLocator.innerText()).trim() || '0'), 10);

    await page.locator('[data-testid="add-card-WFS00000001"]').click();
    // Switch the picker to the Group tab and choose "Young Families Group" (GRP00000014, ~6 members).
    await page.getByRole('dialog').getByRole('tab', { name: /Group/i }).click();
    const search = page.getByRole('dialog').getByRole('textbox').first();
    const groupButton = page.locator('[data-testid="select-group-button-GRP00000014"]');
    // Retry the search until the row appears (the group list loads asynchronously).
    await expect(async () => {
      await search.fill('Young Families');
      await search.press('Enter');
      await expect(groupButton).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });
    await groupButton.click();

    await openSeedBoard(page);
    const after = parseInt(((await page.locator('[data-testid="step-count-WFS00000001"]').innerText()).trim() || '0'), 10);
    expect(after).toBeGreaterThan(before);
  });

  test('pinned assignment keeps the owner across step changes', async () => {
    await openSeedBoard(page);
    // TSK00000104 (James Wilson) is on "Connect to Group" assigned to Demo User.
    await page.locator('[data-testid="workflow-card-TSK00000104"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-pin-button"]').click();
    // Move it to "Call" — whose default assignee is Michael Davis. Pinned should keep Demo User.
    await page.locator('[data-testid="card-step-select"]').click();
    await page.getByRole('option', { name: 'Call' }).click();

    await openSeedBoard(page);
    const moved = page.locator('[data-testid="workflow-column-WFS00000002"] [data-testid="workflow-card-TSK00000104"]');
    await expect(moved).toBeVisible({ timeout: 10000 });
    await expect(moved).toContainText('Demo User');
    await expect(page.locator('[data-testid="card-pinned-TSK00000104"]')).toBeVisible();
  });

  test('skip advances and send back retreats a card', async () => {
    await openSeedBoard(page);
    // TSK00000102 is on "Greet" (WFS1). Skip -> "Call" (WFS2).
    await page.locator('[data-testid="workflow-card-TSK00000102"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-skip-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000002"] [data-testid="workflow-card-TSK00000102"]')).toBeVisible({ timeout: 10000 });

    // Now send it back -> "Greet" (WFS1).
    await page.locator('[data-testid="workflow-card-TSK00000102"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-sendback-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-column-WFS00000001"] [data-testid="workflow-card-TSK00000102"]')).toBeVisible({ timeout: 10000 });
  });

  test('bulk complete removes selected cards from the board', async () => {
    await openSeedBoard(page);
    await page.locator('[data-testid="card-select-TSK00000102"]').getByRole('checkbox').check();
    await page.locator('[data-testid="card-select-TSK00000103"]').getByRole('checkbox').check();
    await page.locator('[data-testid="bulk-action-bar"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="bulk-complete-button"]').click();
    await openSeedBoard(page);
    await expect(page.locator('[data-testid="workflow-card-TSK00000102"]')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('[data-testid="workflow-card-TSK00000103"]')).toHaveCount(0, { timeout: 10000 });
  });

  test('permission tiers are enforced at the API (view / edit-assigned / admin)', async () => {
    const API_BASE = 'http://localhost:8084';
    const ctx = await request.newContext();
    // Log in as the seeded "Workflow Volunteer" — DoingApi/Doing/View only, person PER00000069.
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: 'volunteer@b1.church', password: 'password' } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const jwt = body.userChurches?.[0]?.jwt as string;
    expect(jwt).toBeTruthy();
    const auth = { headers: { Authorization: 'Bearer ' + jwt } };

    // View tier: can load the board.
    const board = await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth);
    expect(board.status()).toBe(200);

    // Edit-assigned tier: can act on a card assigned to them (TSK00000105 -> PER00000069)...
    const own = await ctx.post(`${API_BASE}/doing/tasks/TSK00000105/pin`, { ...auth, data: { pinned: true } });
    expect(own.status()).toBe(200);
    // ...but NOT a card assigned to someone else (TSK00000104 -> Demo User).
    const other = await ctx.post(`${API_BASE}/doing/tasks/TSK00000104/pin`, { ...auth, data: { pinned: true } });
    expect(other.status()).toBe(401);

    // Admin tier: managing workflow definitions is denied without Doing/Admin.
    const dup = await ctx.post(`${API_BASE}/doing/workflows/WFL00000001/duplicate`, { ...auth, data: {} });
    expect(dup.status()).toBe(401);

    await ctx.dispose();
  });

  // ---- Conditional routing (outcome buttons + automatic personMatch routing) ----

  test('the board annotates each step with its conditional routes', async () => {
    await openBoardById(page, 'WFL00000003');
    // The "Contact" step (WFS6) shows its two outcome routes under the column header.
    const reached = page.locator('[data-testid="route-annotation-WSR00000001"]');
    await expect(reached).toBeVisible({ timeout: 10000 });
    await expect(reached).toContainText('Reached');
    await expect(reached).toContainText('Scheduled');
    await expect(page.locator('[data-testid="route-annotation-WSR00000002"]')).toContainText('Not Interested');

    // The Membership Class "Invited" step shows its automatic (personMatch) route.
    await openBoardById(page, 'WFL00000002');
    await expect(page.locator('[data-testid="route-annotation-WSR00000003"]')).toBeVisible({ timeout: 10000 });
  });

  test('completing with an outcome routes the card to the target step', async () => {
    await openBoardById(page, 'WFL00000003');
    // TSK00000106 sits on "Contact" (WFS6), whose "Reached" outcome -> "Scheduled" (WFS7).
    await page.locator('[data-testid="workflow-card-TSK00000106"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-outcome-WSR00000001"]').click();
    await openBoardById(page, 'WFL00000003');
    await expect(page.locator('[data-testid="workflow-column-WFS00000007"] [data-testid="workflow-card-TSK00000106"]')).toBeVisible({ timeout: 10000 });
  });

  test('an outcome with no target step closes the card', async () => {
    await openBoardById(page, 'WFL00000003');
    // TSK00000107 on "Contact" (WFS6); the "Not Interested" outcome has no target -> closes.
    await page.locator('[data-testid="workflow-card-TSK00000107"]').click();
    await page.locator('[data-testid="workflow-card-drawer"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('[data-testid="card-outcome-WSR00000002"]').click();
    await openBoardById(page, 'WFL00000003');
    await expect(page.locator('[data-testid="workflow-card-TSK00000107"]')).toHaveCount(0, { timeout: 10000 });
  });

  test('configure a new outcome from the step editor', async () => {
    await openBoardById(page, 'WFL00000003');
    // Edit the "Scheduled" step (WFS7, no seeded outcomes) and add an outcome button.
    await page.locator('[data-testid="edit-step-WFS00000007"]').click();
    await page.locator('[data-testid="add-outcome-button"]').click();
    // A new outcome row appears with an editable label field.
    await expect(page.locator('[data-testid^="outcome-route-"]').first()).toBeVisible({ timeout: 10000 });
    const label = page.locator('[data-testid^="outcome-label-"] input').first();
    await label.fill('Welcomed');
    await label.blur();
    // Reopen the editor and confirm the outcome persisted.
    await openBoardById(page, 'WFL00000003');
    await page.locator('[data-testid="edit-step-WFS00000007"]').click();
    await expect(page.locator('[data-testid^="outcome-label-"] input').first()).toHaveValue('Welcomed', { timeout: 10000 });
  });

  // ---- Architecture invariants (cleanup regression guards) ----

  test('cards stay out of plain-task surfaces and the generic save endpoint (API)', async () => {
    const API_BASE = 'http://localhost:8084';
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: 'demo@b1.church', password: 'password' } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === 'CHU00000001') || body.userChurches?.[0];
    const auth = { headers: { Authorization: 'Bearer ' + (uc?.jwt as string) } };

    // The generic task endpoint must refuse to create/mutate a workflow card —
    // cards have to go through the card endpoints (which run routing + per-card perms).
    const blocked = await ctx.post(`${API_BASE}/doing/tasks`, { ...auth, data: [{ title: 'Sneaky card', status: 'Open', workflowId: 'WFL00000001', stepId: 'WFS00000001' }] });
    expect(blocked.status()).toBe(400);

    // The plain task list excludes workflow cards (they live on the board / My Cards).
    const list = await ctx.get(`${API_BASE}/doing/tasks`, auth);
    expect(list.status()).toBe(200);
    const tasks = await list.json();
    expect(Array.isArray(tasks)).toBeTruthy();
    expect((tasks as any[]).some((t) => t.workflowId)).toBeFalsy();

    await ctx.dispose();
  });

  test('a manual send-back does not re-trigger the target step onEnter route (API)', async () => {
    const API_BASE = 'http://localhost:8084';
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: 'demo@b1.church', password: 'password' } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === 'CHU00000001') || body.userChurches?.[0];
    const auth = { headers: { Authorization: 'Bearer ' + (uc?.jwt as string) } };

    // John Smith matches WSR00000003 on "Invited" (WFS4) -> auto-routes to "Attended" (WFS5).
    const added = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: 'WFL00000002', stepId: 'WFS00000004', associatedWith: { type: 'person', id: 'PER00000001', label: 'John Smith' } } });
    const card = await added.json();
    expect(card.stepId).toBe('WFS00000005');

    // Sending it back to "Invited" must keep it there — the onEnter route is suppressed
    // for an explicit manual move, so it does NOT bounce forward to "Attended" again.
    const back = await ctx.post(`${API_BASE}/doing/tasks/${card.id}/sendBack`, { ...auth, data: {} });
    expect(back.status()).toBe(200);
    expect((await back.json()).stepId).toBe('WFS00000004');

    // Clean up the card created by this test.
    await ctx.post(`${API_BASE}/doing/tasks/${card.id}/complete`, { ...auth, data: {} });
    await ctx.dispose();
  });

  test('a personMatch route auto-advances a matching card on entry (API)', async () => {
    const API_BASE = 'http://localhost:8084';
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: 'demo@b1.church', password: 'password' } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === 'CHU00000001') || body.userChurches?.[0];
    const jwt = uc?.jwt as string;
    expect(jwt).toBeTruthy();
    const auth = { headers: { Authorization: 'Bearer ' + jwt } };

    // John Smith (PER00000001, lastName "Smith") matches WSR00000003 -> jumps to "Attended" (WFS5).
    const matchRes = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: 'WFL00000002', stepId: 'WFS00000004', associatedWith: { type: 'person', id: 'PER00000001', label: 'John Smith' } } });
    expect(matchRes.status()).toBe(200);
    expect((await matchRes.json()).stepId).toBe('WFS00000005');

    // Robert Johnson (PER00000006, lastName "Johnson") does not match -> stays on "Invited" (WFS4).
    const noMatchRes = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId: 'WFL00000002', stepId: 'WFS00000004', associatedWith: { type: 'person', id: 'PER00000006', label: 'Robert Johnson' } } });
    expect(noMatchRes.status()).toBe(200);
    expect((await noMatchRes.json()).stepId).toBe('WFS00000004');

    await ctx.dispose();
  });
});
