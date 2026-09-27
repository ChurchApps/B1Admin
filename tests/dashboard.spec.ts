import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { openPrimaryNav } from "./helpers/navigation";

test.describe("Sunday home", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sunday-home")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="add-task-button"]')).toBeVisible({ timeout: 15000 });
  });

  test("should render sunday, groups, and tasks", async ({ page }) => {
    await expect(page.getByTestId("sunday-home")).toBeVisible();
    await expect(page.locator("#searchText")).toHaveCount(0);
    await expect(page.locator('[data-testid="add-task-button"]')).toBeVisible();

    const groupLinks = page.locator('a[href^="/groups/GRP"]');
    await expect(groupLinks.first()).toBeVisible({ timeout: 10000 });
    expect(await groupLinks.count()).toBeGreaterThan(0);
  });

  // #1126: the dashboard header and primary nav item read "Dashboard", not "Sunday".
  // The shell renders getPrimaryLabel() (dashboard.dashboardPage.dash) into #primaryNavButton h2;
  // there is no #page-header-title on this route.
  test("dashboard header and nav item read Dashboard, not Sunday", async ({ page }) => {
    await expect(page.locator("#primaryNavButton h2")).toHaveText("Dashboard", { timeout: 10000 });

    // Header.tsx stamps nav-item-dashboard on the item labelled components.wrapper.dash,
    // which only exists once the primary drawer is open.
    const navItem = page.locator('[data-testid="nav-item-dashboard"]');
    if (!(await navItem.first().isVisible().catch(() => false))) await openPrimaryNav(page);
    await expect(navItem.first()).toBeVisible({ timeout: 10000 });
    await expect(navItem.first().locator(".MuiListItemText-primary")).toHaveText(/^dashboard$/i);

    // The bulletin eyebrow stays a calendar line; it must not collapse to the nav label.
    const eyebrow = page.locator('[data-testid="sunday-home"] .om-eyebrow');
    await expect(eyebrow).toBeVisible();
    await expect(eyebrow).toHaveText(
      /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) · (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}/
    );
    expect((await eyebrow.textContent())?.trim()).not.toBe("Dashboard");
  });

  test("My Work from Sunday opens tasks", async ({ page }) => {
    const myWork = page.locator('[id="secondaryMenu"]').getByText("My Work", { exact: true }).first();
    await expect(myWork).toBeVisible({ timeout: 10000 });
    await myWork.click();
    await expect(page).toHaveURL(/\/serving\/tasks/, { timeout: 10000 });
  });

  test("should load group from dashboard", async ({ page }) => {
    const firstGroupLink = page.locator('a[href^="/groups/GRP"]').first();
    await expect(firstGroupLink).toBeVisible({ timeout: 10000 });
    await firstGroupLink.click();
    await expect(page).toHaveURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000 });
  });

  test.describe.serial("Dashboard Task lifecycle", () => {
    test("should add task from dashboard", async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-task-button"]');
      await addBtn.click();

      const assignInput = page.locator('[data-testid="assign-to-input"]');
      await expect(assignInput).toBeVisible({ timeout: 10000 });
      await assignInput.click();

      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill("Demo User");
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('[data-testid^="add-person-"]').first();
      await selectBtn.click();

      const taskName = page.locator('[name="title"]');
      await taskName.fill("Dashboard Task");
      const taskNotes = page.locator('[name="note"]');
      await taskNotes.fill("Zacchaeus Testing (Playwright)");

      const saveBtn = page.locator("button").getByText("Save");
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();

      const validatedTask = page.locator("a").getByText("Dashboard Task");
      await expect(validatedTask).toHaveCount(1, { timeout: 15000 });
    });

    test("should load task from dashboard", async ({ page }) => {
      const task = page.locator("a").getByText("Dashboard Task").first();
      await expect(task).toBeVisible({ timeout: 10000 });
      await task.click();
      await expect(page).toHaveURL(/\/tasks\/[^/]+/, { timeout: 10000 });
    });
  });

  test("should cancel adding task from dashboard", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-task-button"]');
    await addBtn.click();
    const assignInput = page.locator('[data-testid="assign-to-input"]');
    await expect(assignInput).toBeVisible({ timeout: 10000 });
    const cancelBtn = page.locator("button").getByText("Cancel");
    await cancelBtn.click();
    await expect(assignInput).toHaveCount(0, { timeout: 10000 });
  });
});
