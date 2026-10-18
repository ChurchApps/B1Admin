import { test as plainTest } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { openPrimaryNav } from "./helpers/navigation";
import { createNamesOnlyRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";

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

  // #1126: the dashboard header and main menu item read "Dashboard", not "Sunday".
  // The search/jump bar shows getPrimaryLabel() (dashboard.dashboardPage.dash); there is no #page-header-title on this route.
  test("dashboard header and nav item read Dashboard, not Sunday", async ({ page }) => {
    await expect(page.getByTestId("command-palette-section")).toHaveText("Dashboard", { timeout: 10000 });

    await openPrimaryNav(page);
    await expect(page.getByTestId("command-palette").getByRole("button", { name: "Dashboard", exact: true }).first()).toBeVisible();
    await page.keyboard.press("Escape");

    // The bulletin eyebrow stays a calendar line; it must not collapse to the nav label.
    const eyebrow = page.locator('[data-testid="sunday-home"] .om-eyebrow');
    await expect(eyebrow).toBeVisible();
    await expect(eyebrow).toHaveText(
      /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) · (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}/
    );
    expect((await eyebrow.textContent())?.trim()).not.toBe("Dashboard");
  });

  test("My Work from Sunday opens tasks", async ({ page }) => {
    await openPrimaryNav(page);
    const palette = page.getByTestId("command-palette");
    await palette.getByRole("textbox").fill("My Work");
    const myWork = palette.locator(".om-hit", { hasText: "My Work" }).first();
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

// ChurchAppsSupport#1284: a user whose only people permission is View Names is not offered All groups, People, or Attendance.
plainTest.describe("View People Names Only", () => {
  plainTest.use({ storageState: { cookies: [], origins: [] } });
  let roleId = "";
  plainTest.beforeAll(async () => { roleId = await createNamesOnlyRole("Issue 1284 Names Only (dashboard)"); });
  plainTest.afterAll(async () => { await deleteRole(roleId); });

  plainTest("dashboard hides All groups and the People and Attendance hint links", async ({ page }) => {
    await loginAsVolunteer(page);
    const myGroups = page.getByTestId("home-my-groups");
    await expect(myGroups).toBeVisible({ timeout: 15000 });
    await expect(myGroups.getByRole("link", { name: "All groups" })).toHaveCount(0);
    await expect(myGroups.locator('a[href^="/groups/GRP"]').first()).toBeVisible({ timeout: 10000 });

    const hint = page.getByTestId("sunday-live-hint");
    await expect(hint).toBeVisible({ timeout: 15000 });
    await expect(hint.getByRole("link", { name: "People" })).toHaveCount(0);
    await expect(hint.getByRole("link", { name: "Attendance" })).toHaveCount(0);
  });

  plainTest("Sunday card shows the plan name without a link to the plan", async ({ page }) => {
    // On a Sunday the card only looks at today; reset-demo seeds plans from tomorrow on, so look from one day ahead.
    await page.clock.setFixedTime(new Date(Date.now() + 86400000));
    await loginAsVolunteer(page);
    const sermon = page.locator('[data-testid="sunday-home"] h1.om-sermon');
    // volunteer@b1.church is not a plan editor, not in the plan's ministry and not assigned to the plan.
    await expect(sermon).toHaveText(/Schedule|Plan/, { timeout: 15000 });
    await expect(sermon.locator("a")).toHaveCount(0);
  });
});
