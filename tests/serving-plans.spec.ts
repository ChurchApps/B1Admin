import type { Page } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { editIconButton, dismissSendInviteIfPresent, confirmDelete } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// ZACCHAEUS/ZEBEDEE are test marker names; the file is one serial chain to avoid state conflicts.
test.describe.serial("Serving Management - Plans", () => {
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

  // Edit/Plan Type flows navigate off-page; re-enter /serving/plans before each test.
  test.beforeEach(async () => {
    await dismissSendInviteIfPresent(page, 500);
    if (!/\/serving\/plans/.test(page.url())) {
      await page.goto("/serving/plans");
      await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    }
  });

  test.describe("Ministry CRUD", () => {
    // Retries would create duplicate tabs and break downstream lookups.
    test.describe.configure({ retries: 0 });

    test("should add ministry", async () => {
      const addBtn = page.locator("button").getByText("Add Ministry");
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await minName.fill("Zacchaeus Ministry");
      const saveBtn = page.locator("button").getByText("Add").first();
      await saveBtn.click();
      const verifiedMin = page.locator('[role="tab"]').getByText("Zacchaeus Ministry");
      await expect(verifiedMin).toHaveCount(1, { timeout: 10000 });
    });

    test("should cancel adding ministry", async () => {
      const addBtn = page.locator("button").getByText("Add Ministry");
      await addBtn.click();
      const minName = page.locator('[name="name"]');
      await expect(minName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("cancel");
      await cancelBtn.click();
      await expect(minName).toHaveCount(0, { timeout: 10000 });
    });

    test("should edit ministry", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zacchaeus Ministry").first();
      await minBtn.click();
      const manageBtn = page.locator("a").getByText("Edit Ministry");
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const minName = page.locator('[name="name"]');
      await expect(minName).toBeVisible({ timeout: 10000 });
      await minName.fill("Zebedee Ministry");
      const saveBtn = page.locator("button").getByText("Save");
      // Wait for cache invalidation before asserting on the banner.
      const groupPost = page.waitForResponse(
        r => r.url().includes("/membership/groups") && r.request().method() === "POST",
        { timeout: 15000 }
      ).catch((): null => null);
      await saveBtn.click();
      await groupPost;
      const verifiedEdit = page.locator("p").getByText("Zebedee Ministry");
      await expect(verifiedEdit).toHaveCount(1, { timeout: 15000 });
    });

    test("should cancel editing ministry", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const manageBtn = page.locator("a").getByText("Edit Ministry");
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const minName = page.locator('[name="name"]');
      await expect(minName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(minName).toHaveCount(0, { timeout: 10000 });
    });

    test("should add person to ministry", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const manageBtn = page.locator("a").getByText("Edit Ministry");
      await manageBtn.click();

      const personSearch = page.locator('[name="personAddText"]');
      await expect(personSearch).toBeVisible({ timeout: 10000 });
      await personSearch.fill("Dorothy");
      const searchBtn = page.locator('[data-testid="person-add-search-button"]');
      await searchBtn.click();
      // Icon-only buttons; text "Add" would substring-match "Add a New Person".
      const addBtn = page.locator('[data-testid^="add-person-button-"]').first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      const memberPost = page.waitForResponse(r => r.url().includes("/groupmembers") && r.request().method() === "POST", { timeout: 15000 }).catch((): null => null);
      await addBtn.click();
      await memberPost;
      const verifiedPerson = page.locator('[id="groupMemberTable"] a').getByText("Dorothy Jackson");
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test("should advanced add person to ministry", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const manageBtn = page.locator("a").getByText("Edit Ministry");
      await manageBtn.click();

      const advBtn = page.locator("button").getByText("Advanced");
      await expect(advBtn).toBeVisible({ timeout: 10000 });
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]');
      // Auto-search on condition change; no Search button.
      const searched = page.waitForResponse(r => r.url().includes("/people") && r.status() === 200, { timeout: 10000 }).catch((): null => null);
      await firstName.fill("Grace");
      await searched;
      const addBtn = page.locator('[data-testid^="add-person-button-"]').first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMemberTable"] a').getByText("Grace Jackson");
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test("should promote person to ministry leader", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const manageBtn = page.locator("a").getByText("Edit Ministry");
      await manageBtn.click();

      const promoteBtn = page.locator('[data-testid^="promote-leader-button-"]').first();
      await expect(promoteBtn).toBeVisible({ timeout: 10000 });
      await promoteBtn.click();
      await page.reload();
      const verifiedPromoted = page.locator('[data-testid^="remove-leader-button-"]');
      await expect(verifiedPromoted).toHaveCount(1, { timeout: 10000 });
    });

    test("should remove person from ministry", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const manageBtn = page.locator("a").getByText("Edit Ministry");
      await manageBtn.click();

      const removeBtn = page.locator('[data-testid^="remove-member-button-"]').first();
      await expect(removeBtn).toBeVisible({ timeout: 10000 });
      await removeBtn.click();
      await confirmDelete(page);
      const verifiedRemoved = page.locator('[id="groupMembersBox"] a').getByText("Dorothy Jackson");
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe("Plan Types", () => {
    // Retries would create duplicate rows and break downstream assertions.
    test.describe.configure({ retries: 0 });

    test("should create plan type", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();

      const addBtn = page.locator("button").getByText("Create Plan Type");
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const typeName = page.locator('[name="name"]');
      await typeName.fill("Zacchaeus Plans");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const verifiedType = page.locator("a").getByText("Zacchaeus Plans");
      await expect(verifiedType).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit plan type", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const typeName = page.locator('[name="name"]');
      await typeName.fill("Zebedee Plans");
      // Reminder editor inside dialog has its own "Save Reminder" button.
      const saveBtn = page.getByRole("button", { name: "Save", exact: true });
      await saveBtn.click();
      const verifiedType = page.locator("a").getByText("Zebedee Plans");
      await expect(verifiedType).toHaveCount(1, { timeout: 10000 });
    });

    test("should cancel editing plan type", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();

      const editBtn = editIconButton(page).last();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const typeName = page.locator('[name="name"]');
      await expect(typeName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("cancel");
      await cancelBtn.click();
      await expect(typeName).toHaveCount(0, { timeout: 10000 });
    });

    test("should add service plan", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const plansBtn = page.locator("a").getByText("Zebedee Plans");
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click();
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const addBtn = page.locator('[data-testid="add-plan-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill("Mar 10, 2030");
      const date = page.locator('[id="serviceDate"]');
      await date.fill("2030-03-01");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const verifiedPlan = page.locator("a").getByText("Mar 10, 2030");
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit service plan", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const plansBtn = page.locator("a").getByText("Zebedee Plans");
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click();
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      // Icon-only Edit button; use aria-label.
      const editBtn = page.locator('button[aria-label="Edit"]').first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const planName = page.locator('[name="name"]');
      await planName.fill("Mar 1, 2030");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const verifiedPlan = page.locator("a").getByText("Mar 1, 2030");
      await expect(verifiedPlan).toHaveCount(1, { timeout: 10000 });
    });

    test("should cancel editing service plan", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const plansBtn = page.locator("a").getByText("Zebedee Plans");
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click();
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button[aria-label="Edit"]').first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const planName = page.locator('[name="name"]');
      await expect(planName).toHaveCount(1, { timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(planName).toHaveCount(0, { timeout: 10000 });
    });

    test("should delete service plan", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const plansBtn = page.locator("a").getByText("Zebedee Plans");
      await expect(plansBtn).toBeVisible({ timeout: 10000 });
      await plansBtn.click();
      await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

      const editBtn = page.locator('button[aria-label="Edit"]').first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      const verifiedPlan = page.locator("a").getByText("Mar 1, 2030");
      await expect(verifiedPlan).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe("Teams", () => {
    test("should add team", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();

      const addBtn = page.locator('[data-testid="add-team-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const teamName = page.locator('[name="name"]');
      await teamName.fill("Zacchaeus Team");
      const saveBtn = page.locator("button").getByText("Add").last();
      await saveBtn.click();
      const verifiedTeam = page.locator("a").getByText("Zacchaeus Team");
      await expect(verifiedTeam).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit team", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const teamBtn = page.locator("a").getByText("Zacchaeus Team");
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click();
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const teamName = page.locator('[name="name"]');
      await teamName.fill("Zebedee Team");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const verifiedHeader = page.locator("p").getByText("Zebedee Team");
      await expect(verifiedHeader).toHaveCount(1, { timeout: 10000 });
    });

    test("should add person to team", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const teamBtn = page.locator("a").getByText("Zebedee Team");
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click();
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const personSearch = page.locator('[name="personAddText"]');
      await expect(personSearch).toBeVisible({ timeout: 10000 });
      await personSearch.fill("Dorothy");
      const searchBtn = page.locator('[data-testid="person-add-search-button"]');
      await searchBtn.click();
      const addBtn = page.locator('[data-testid^="add-person-button-"]').first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText("Dorothy Jackson");
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test("should advanced add person to team", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const teamBtn = page.locator("a").getByText("Zebedee Team");
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click();
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const advBtn = page.locator("button").getByText("Advanced");
      await expect(advBtn).toBeVisible({ timeout: 10000 });
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]');
      // Auto-search on condition change; no Search button.
      const searched = page.waitForResponse(r => r.url().includes("/people") && r.status() === 200, { timeout: 10000 }).catch((): null => null);
      await firstName.fill("Grace");
      await searched;
      const addBtn = page.locator('[data-testid^="add-person-button-"]').first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText("Grace Jackson");
      await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test("should promote person to team leader", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const teamBtn = page.locator("a").getByText("Zebedee Team");
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click();
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const promoteBtn = page.locator('[data-testid^="promote-leader-button-"]').first();
      await expect(promoteBtn).toBeVisible({ timeout: 10000 });
      await promoteBtn.click();
      await page.reload();
      const verifiedPromoted = page.locator('[data-testid^="remove-leader-button-"]');
      await expect(verifiedPromoted).toHaveCount(1, { timeout: 10000 });
    });

    test("should remove person from team", async () => {
      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const teamBtn = page.locator("a").getByText("Zebedee Team");
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click();
      await expect(page).toHaveURL(/\/groups\/[^/]+/);

      const removeBtn = page.locator('[data-testid^="remove-member-button-"]').last();
      await expect(removeBtn).toBeVisible({ timeout: 10000 });
      await removeBtn.click();
      await confirmDelete(page);
      const verifiedRemoved = page.locator('[id="groupMembersBox"] a').getByText("Grace Jackson");
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });

    test("should delete team", async () => {
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("Are you sure");
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const teamBtn = page.locator("a").getByText("Zebedee Team");
      await expect(teamBtn).toBeVisible({ timeout: 10000 });
      await teamBtn.click();
      await expect(page).toHaveURL(/\/groups\/[^/]+/);
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      const verifiedRemoved = page.locator("table a").getByText("Zebedee Team");
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe("Cleanup", () => {
    test("should delete ministry", async () => {
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("Are you sure");
        await dialog.accept();
      });

      const minBtn = page.locator('[role="tab"]').getByText("Zebedee Ministry").first();
      await minBtn.click();
      const manageBtn = page.locator("a").getByText("Edit Ministry");
      await manageBtn.click();
      const editBtn = editIconButton(page).first();
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();

      const deleteBtn = page.locator("button").getByText("Delete");
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      const verifiedRemoved = page.locator("table a").getByText("Zebedee Ministry");
      await expect(verifiedRemoved).toHaveCount(0, { timeout: 10000 });
    });
  });
});

test.describe("Plans page navigation", () => {
  test("Add Ministry button is visible on the Serving Plans page", async ({ page }) => {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    await expect(page.locator("button").getByText("Add Ministry").first()).toBeVisible({ timeout: 15000 });
  });

  test("Plans subnavigation reveals secondary entries (Songs, My Work)", async ({ page }) => {
    await expect(page.locator('[id="secondaryMenu"]').getByText("Songs").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[id="secondaryMenu"]').getByText("My Work").first()).toBeVisible({ timeout: 15000 });
  });

  test("My Work secondary item navigates to /serving/tasks", async ({ page }) => {
    await page.locator('[id="secondaryMenu"]').getByText("My Work").first().click();
    await page.waitForURL(/\/serving\/tasks/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/serving\/tasks/);
  });
});

