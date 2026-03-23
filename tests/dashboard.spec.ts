import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Dashboard Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await expect(page.locator('h6').first()).toBeVisible({ timeout: 15000 });
  });

  /* test('should load dashboard', async ({ page }) => {
    const dashboardHeader = page.locator('h4').getByText('B1.church Dashboard');
    await dashboardHeader.click();
  }); */

  test('should load group from dashboard', async ({ page }) => {
    const firstGroup = page.locator('h6').first();
    await expect(firstGroup).toBeVisible({ timeout: 10000 });
    await firstGroup.click();
    await expect(page).toHaveURL(/\/groups\/GRP\d+/, { timeout: 10000 });
  });

  test('should search people from dashboard', async ({ page }) => {
    const searchBox = page.locator('[id="searchText"]');
    await searchBox.fill('Dorothy Jackson');
    const searchBtn = page.locator('[data-testid="dashboard-search-button"]');
    await searchBtn.click();
    const results = page.locator('h6').getByText('Dorothy Jackson');
    await expect(results).toBeVisible({ timeout: 10000 });
    await results.click();
    await expect(page).toHaveURL(/\/people\/PER\d+/, { timeout: 10000 });
    const validatedName = page.locator('p').getByText('Dorothy Jackson');
    await expect(validatedName).toHaveCount(1);
  });

  test('should add task from dashboard', async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-task-button"]');
    await addBtn.click();
    // nth(2) targets the assignee input in the task form
    const assignInput = page.locator('input').nth(2);
    await assignInput.click();
    const personSearch = page.locator('[name="personAddText"]');
    await personSearch.fill('Demo User');
    const searchBtn = page.locator('[data-testid="search-button"]');
    await searchBtn.click();
    const selectBtn = page.locator('button').getByText('Select');
    await selectBtn.click();
    const taskName = page.locator('[name="title"]');
    await taskName.fill('Test Task');
    const taskNotes = page.locator('[name="note"]');
    await taskNotes.fill('Octavian Testing (Playwright)');
    const saveBtn = page.locator('button').getByText('Save');
    await saveBtn.click();
    const validatedTask = page.locator('a').getByText('Test Task');
    await expect(validatedTask).toHaveCount(2, { timeout: 10000 });
  });

  test('should load task from dashboard', async ({ page }) => {
    const task = page.locator('a').getByText('Test Task').first();
    await task.click();
    await expect(page).toHaveURL(/\/tasks\/[^/]+/, { timeout: 10000 });
  });

  test('should cancel adding task from dashboard', async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-task-button"]');
    await addBtn.click();
    const assignInput = page.locator('input').nth(2);
    await expect(assignInput).toBeVisible({ timeout: 10000 });
    const cancelBtn = page.locator('button').getByText('Cancel');
    await cancelBtn.click();
    await expect(assignInput).toHaveCount(0, { timeout: 10000 });
  });

});
