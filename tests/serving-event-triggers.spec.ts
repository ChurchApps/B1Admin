import type { Page } from '@playwright/test';
import { request } from '@playwright/test';
import { servingTest as test, expect } from './helpers/test-fixtures';
import { login } from './helpers/auth';
import { navigateToServing } from './helpers/navigation';
import { recoverFromViteError } from './helpers/fixtures';
import { STORAGE_STATE_PATH } from './global-setup';

// Event-driven workflow triggers. Seed (Api/tools/dbScripts/doing/demo.sql):
//   WKT00000001 person.created + WKT00000002 person.updated, both add a Guest to
//   WFL00000001 "New Visitor Follow-up". The engine taps WebhookDispatcher.emit,
//   so any back-end mutation path (here: POST /membership/people) triggers it.
const API_BASE = 'http://localhost:8084';

async function gotoTriggers(page: Page) {
  await page.goto('/serving/tasks/workflows/triggers');
  await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/triggers/, { timeout: 10000 });
  await recoverFromViteError(page, page.locator('[data-testid="add-event-trigger-button"]'));
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

  test('triggers page reachable from the workflows header', async () => {
    await page.goto('/serving/tasks/workflows');
    await recoverFromViteError(page, page.locator('[data-testid="event-triggers-button"]'));
    await page.locator('[data-testid="event-triggers-button"]').click();
    await expect(page).toHaveURL(/\/serving\/tasks\/workflows\/triggers/, { timeout: 10000 });
    // The seeded Guest triggers are listed.
    await expect(page.getByText('New Guest Follow-up (created)')).toBeVisible({ timeout: 10000 });
  });

  test('create, then delete, an event trigger', async () => {
    await gotoTriggers(page);
    await page.locator('[data-testid="add-event-trigger-button"]').click();

    await page.locator('[data-testid="trigger-name"] input').fill('Zacchaeus Trigger');

    await page.locator('[data-testid="trigger-event-select"]').click();
    await page.getByRole('option', { name: /Person.*Created/ }).click();

    await page.locator('[data-testid="trigger-workflow-select"]').click();
    await page.getByRole('option', { name: 'New Visitor Follow-up' }).click();

    // Add one condition: membershipStatus is Guest (field + operator default correctly).
    await page.locator('[data-testid="add-condition-button"]').click();
    await page.locator('[data-testid="condition-value-0"]').click();
    await page.getByRole('option', { name: 'Guest' }).click();

    await page.locator('[data-testid="save-trigger-button"]').click();

    const row = page.locator('li').filter({ hasText: 'Zacchaeus Trigger' });
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.locator('[data-testid^="remove-event-trigger-"]').click();
    await expect(page.getByText('Zacchaeus Trigger')).toHaveCount(0, { timeout: 10000 });
  });

  // The point of the feature: a back-end mutation from ANY front-end fires the
  // trigger. We create a Guest person through the membership API and assert a
  // card lands on the seeded workflow — no UI path involved.
  test('creating a Guest person via the API drops a card on the workflow', async () => {
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: 'demo@b1.church', password: 'password' } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === 'CHU00000001') || body.userChurches?.[0];
    const auth = { headers: { Authorization: 'Bearer ' + (uc?.jwt as string) } };

    const created = await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ name: { first: 'Zedediah', last: 'Zacchaeus' }, membershipStatus: 'Guest', contactInfo: {} }] });
    expect(created.status()).toBe(200);
    const person = (await created.json())[0];
    expect(person?.id).toBeTruthy();

    // emit() runs the trigger synchronously inside the save, so the card exists now.
    const board = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth)).json();
    const card = (board.cards || []).find((c: any) => c.associatedWithId === person.id);
    expect(card).toBeTruthy();
    expect(card.triggerId).toBeTruthy();

    // A second save of the same Guest must NOT create a second card (oncePerSubject).
    await ctx.post(`${API_BASE}/membership/people`, { ...auth, data: [{ id: person.id, name: { first: 'Zedediah', last: 'Zacchaeus' }, membershipStatus: 'Guest', contactInfo: {} }] });
    const board2 = await (await ctx.get(`${API_BASE}/doing/tasks/board/WFL00000001`, auth)).json();
    expect((board2.cards || []).filter((c: any) => c.associatedWithId === person.id).length).toBe(1);

    // cleanup: close the card, delete the person.
    await ctx.post(`${API_BASE}/doing/tasks/${card.id}/complete`, { ...auth, data: {} });
    await ctx.delete(`${API_BASE}/membership/people/${person.id}`, auth);
    await ctx.dispose();
  });
});
