import type { Page } from '@playwright/test';
import { request } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { login } from './helpers/auth';
import { navigateToServing } from './helpers/navigation';
import { recoverFromViteError } from './helpers/fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

// Event-driven workflow triggers, managed per-workflow from the board. Seed
// (Api/tools/dbScripts/doing/demo.sql) on WFL00000001 "New Visitor Follow-up":
//   WKT1 person.created + WKT2 person.updated (Visitor), WKT3 form.submission.created.
// The engine taps WebhookDispatcher.emit, so any back-end mutation triggers it.
const API_BASE = 'http://localhost:8084';

// Open the triggers manager for the seeded workflow's board.
async function openManager(page: Page) {
  await page.goto('/serving/tasks/workflows/WFL00000001');
  await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
  await page.locator('[data-testid="workflow-board"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('[data-testid="board-triggers-button"]').click();
  await page.locator('[data-testid="add-event-trigger-button"]').waitFor({ state: 'visible', timeout: 10000 });
}

test.describe.serial('Serving Management - Event Triggers', () => {
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

  test('triggers manager opens from the board and lists seeded triggers', async () => {
    await openManager(page);
    await expect(page.getByText('New Visitor Follow-up (created)')).toBeVisible({ timeout: 10000 });
  });

  test('create, then delete, an event trigger (workflow implied)', async () => {
    await openManager(page);
    await page.locator('[data-testid="add-event-trigger-button"]').click();

    await page.locator('[data-testid="trigger-name"] input').fill('Zacchaeus Trigger');
    await page.locator('[data-testid="trigger-event-select"]').click();
    await page.getByRole('option', { name: /Person.*Created/ }).click();

    // No workflow picker — the trigger targets this board's workflow.
    await page.locator('[data-testid="add-condition-button"]').click();
    await page.locator('[data-testid="condition-value-0"]').click();
    await page.getByRole('option', { name: 'Visitor' }).click();

    await page.locator('[data-testid="save-trigger-button"]').click();

    const row = page.locator('li').filter({ hasText: 'Zacchaeus Trigger' });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="remove-event-trigger-"]').click();
    await expect(page.getByText('Zacchaeus Trigger')).toHaveCount(0, { timeout: 10000 });
  });

  test('create a form-submission trigger via the manager', async () => {
    await openManager(page);
    await page.locator('[data-testid="add-event-trigger-button"]').click();

    await page.locator('[data-testid="trigger-name"] input').fill('Zacchaeus Form Trigger');
    await page.locator('[data-testid="trigger-event-select"]').click();
    await page.getByRole('option', { name: /Form.*Submitted/ }).click();

    // The form field's value list is populated from MembershipApi /forms.
    await page.locator('[data-testid="add-condition-button"]').click();
    await page.locator('[data-testid="condition-value-0"]').click();
    await page.getByRole('option', { name: 'Visitor Information Card' }).click();

    await page.locator('[data-testid="save-trigger-button"]').click();
    const row = page.locator('li').filter({ hasText: 'Zacchaeus Form Trigger' });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="remove-event-trigger-"]').click();
    await expect(page.getByText('Zacchaeus Form Trigger')).toHaveCount(0, { timeout: 10000 });
  });

  // The point of the feature: a back-end mutation from ANY front-end fires the
  // trigger. We create a Visitor person through the membership API and assert a
  // card lands on the seeded workflow — no UI path involved.
  test('creating a Visitor person via the API drops a card on the workflow', async () => {
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: 'demo@b1.church', password: 'password' } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === 'CHU00000001') || body.userChurches?.[0];
    const auth = { headers: { Authorization: 'Bearer ' + (uc?.jwt as string) } };

    const created = await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ name: { first: 'Zedediah', last: 'Zacchaeus' }, membershipStatus: 'Visitor', contactInfo: {} }] });
    expect(created.status()).toBe(200);
    const person = (await created.json())[0];
    expect(person?.id).toBeTruthy();

    const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth)).json();
    const card = (board.cards || []).find((c: any) => c.associatedWithId === person.id);
    expect(card).toBeTruthy();
    expect(card.triggerId).toBeTruthy();

    // A second save of the same Visitor must NOT create a second card (oncePerSubject by workflow+subject).
    await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ id: person.id, name: { first: 'Zedediah', last: 'Zacchaeus' }, membershipStatus: 'Visitor', contactInfo: {} }] });
    const board2 = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth)).json();
    expect((board2.cards || []).filter((c: any) => c.associatedWithId === person.id).length).toBe(1);

    await ctx.post(`${API_BASE}/doing/tasks/${card.id}/complete`, { ...auth, data: {} });
    await ctx.delete(`${API_BASE}/membership/people/${person.id}`, auth);
    await ctx.dispose();
  });
});
