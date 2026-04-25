import { loggedInTest as test, expect } from './helpers/test-fixtures';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Dashboard Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the main page header to confirm dashboard rendered.
    await expect(page.locator('h1, h2, h3').getByText('Dashboard').first()).toBeVisible({ timeout: 15000 });
    // Wait for the People search card to render — it's the first thing in the main column.
    await expect(page.locator('#searchText')).toBeVisible({ timeout: 15000 });
  });

  test('should render dashboard widgets', async ({ page }) => {
    // People search card with input and disabled-by-default Search button
    await expect(page.locator('#searchText')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-search-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-search-button"]')).toBeDisabled();

    // Tasks card with Add Task button
    await expect(page.locator('[data-testid="add-task-button"]')).toBeVisible();

    // My Groups list — demo user (Demo User) is a member of multiple groups
    const groupLinks = page.locator('a[href^="/groups/GRP"]');
    await expect(groupLinks.first()).toBeVisible({ timeout: 10000 });
    expect(await groupLinks.count()).toBeGreaterThan(0);
  });

  test('should load group from dashboard', async ({ page }) => {
    // Click the actual group link rather than the nested h6 — h6 may have
    // pointer-events suppressed inside the MUI ListItemButton.
    const firstGroupLink = page.locator('a[href^="/groups/GRP"]').first();
    await expect(firstGroupLink).toBeVisible({ timeout: 10000 });
    await firstGroupLink.click();
    await expect(page).toHaveURL(/\/groups\/GRP\w+/, { timeout: 10000 });
  });

  test('should search people from dashboard', async ({ page }) => {
    const searchBox = page.locator('#searchText');
    await searchBox.fill('Dorothy Jackson');
    const searchBtn = page.locator('[data-testid="dashboard-search-button"]');
    await expect(searchBtn).toBeEnabled();
    await searchBtn.click();
    const results = page.locator('h6').getByText('Dorothy Jackson');
    await expect(results).toBeVisible({ timeout: 10000 });
    await results.click();
    await expect(page).toHaveURL(/\/people\/PER\w+/, { timeout: 10000 });
    const validatedName = page.locator('p').getByText('Dorothy Jackson');
    await expect(validatedName).toHaveCount(1);
  });

  test('should show empty state when no people match search', async ({ page }) => {
    const searchBox = page.locator('#searchText');
    await searchBox.fill('Octavian-NoSuchPerson');
    const searchBtn = page.locator('[data-testid="dashboard-search-button"]');
    await searchBtn.click();
    await expect(page.getByText('No people found matching your search criteria.')).toBeVisible({ timeout: 10000 });
  });

  test.describe.serial('Dashboard Task lifecycle', () => {
    test('should add task from dashboard', async ({ page }) => {
      // Note: this spec runs in parallel with serving-songs-tasks.spec, which also
      // creates a task assigned to Demo User. We use a distinct name here so the
      // two specs don't collide on count assertions. We also can't assert on the
      // "No tasks found" empty state for the same reason.

      const addBtn = page.locator('[data-testid="add-task-button"]');
      await addBtn.click();

      // Use the data-testid for the assignee field rather than input.nth(2),
      // which depends on the order/count of inputs on the page.
      const assignInput = page.locator('[data-testid="assign-to-input"]');
      await expect(assignInput).toBeVisible({ timeout: 10000 });
      await assignInput.click();

      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Demo User');
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('button').getByText('Select');
      await selectBtn.first().click();

      const taskName = page.locator('[name="title"]');
      await taskName.fill('Dashboard Task');
      const taskNotes = page.locator('[name="note"]');
      await taskNotes.fill('Octavian Testing (Playwright)');

      const saveBtn = page.locator('button').getByText('Save');
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();

      // After save, the task should appear under both "Assigned to me" and
      // "Created by me" sections of the dashboard TaskList → 2 link copies.
      const validatedTask = page.locator('a').getByText('Dashboard Task');
      await expect(validatedTask).toHaveCount(2, { timeout: 15000 });
    });

    test('should load task from dashboard', async ({ page }) => {
      const task = page.locator('a').getByText('Dashboard Task').first();
      await expect(task).toBeVisible({ timeout: 10000 });
      await task.click();
      await expect(page).toHaveURL(/\/tasks\/[^/]+/, { timeout: 10000 });
    });
  });

  test('should cancel adding task from dashboard', async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-task-button"]');
    await addBtn.click();
    const assignInput = page.locator('[data-testid="assign-to-input"]');
    await expect(assignInput).toBeVisible({ timeout: 10000 });
    const cancelBtn = page.locator('button').getByText('Cancel');
    await cancelBtn.click();
    await expect(assignInput).toHaveCount(0, { timeout: 10000 });
  });

});
