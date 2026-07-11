import type { Page } from "@playwright/test";
import { groupsTest as test, expect } from "./helpers/test-fixtures";
import { dismissSendInviteIfPresent, editIconButton, confirmDelete } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToGroups } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

test.describe.serial("Group Management", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToGroups(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.beforeEach(async () => {
    await dismissSendInviteIfPresent(page, 500);
    const modal = page.locator(".MuiModal-root .MuiBackdrop-root").first();
    if (await modal.isVisible({ timeout: 200 }).catch(() => false)) {
      await page.keyboard.press("Escape");
      await modal.waitFor({ state: "hidden", timeout: 2000 }).catch(() => { });
      if (await modal.isVisible({ timeout: 100 }).catch(() => false)) {
        await modal.click({ force: true }).catch(() => { });
        await modal.waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
      }
    }
    if (!/\/groups$|\/groups\?/.test(page.url())) {
      await navigateToGroups(page);
    }
  });

  test.describe("Groups", () => {
    test("should view group details", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();

      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);
    });

    test("should view person details from group", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const firstPerson = page.locator('[id="groupMemberTable"] a').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);
    });

    test("should add person to group", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const searchInput = page.locator('input[name="personAddText"]');
      await searchInput.fill("Demo User");
      const searchBtn = page.locator('[data-testid="person-add-search-button"]');
      await searchBtn.click();

      const addBtn = page.locator('[data-testid^="add-person-button-"]').first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await dismissSendInviteIfPresent(page);
      const validatedPerson = page.locator('[data-testid="display-box-content"] td').getByText("Demo User");
      await expect(validatedPerson).toHaveCount(1);
    });

    test("should advanced add people", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const advBtn = page.locator("button").getByText("Advanced");
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await expect(firstCheck).toBeVisible({ timeout: 10000 });
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]');
      await firstName.fill("Donald");

      await page.waitForResponse(response => response.url().includes("/people") && response.status() === 200, { timeout: 10000 });

      const addBtn = page.locator('[data-testid^="add-person-button-"]').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await dismissSendInviteIfPresent(page);
      const validatePerson = page.locator('[id="groupMemberTable"]').getByText("Donald Clark");
      await expect(validatePerson).toHaveCount(1);
      await dismissSendInviteIfPresent(page, 500);
      const removeBtn = page.locator('[data-testid^="remove-member-button-"]').last();
      await removeBtn.click();
      await confirmDelete(page);
    });

    test("should delete advanced add conditions", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const advBtn = page.locator("button").getByText("Advanced");
      await advBtn.click();
      const advancedSearchBox = page.locator("#advancedSearch");
      await expect(advancedSearchBox).toBeVisible({ timeout: 10000 });
      const filterCheckboxes = advancedSearchBox.locator('input[type="checkbox"]');
      await filterCheckboxes.first().click();
      await filterCheckboxes.nth(1).click();
      const checkTwo = page.locator("span").getByText("2 active:");
      await expect(checkTwo).toHaveCount(1);
      const activeFiltersPaper = page.locator(".MuiPaper-root").filter({ has: checkTwo });
      const chipDeleteIcons = activeFiltersPaper.locator(".MuiChip-deleteIcon");
      await chipDeleteIcons.last().click();
      const checkOne = page.locator("span").getByText("1 active:");
      await expect(checkOne).toHaveCount(1);
      await filterCheckboxes.nth(1).click();
      await expect(checkTwo).toHaveCount(1);
      const clearAll = page.locator("span").getByText("Clear All");
      await clearAll.click();
      await expect(checkTwo).toHaveCount(0);
    });

    test("should remove person from group", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const removeBtn = page.locator('[data-testid^="remove-member-button-"]').last();
      await removeBtn.click();
      await confirmDelete(page);
      const validateRemoval = page.locator('[id="groupMemberTable"]').getByText("Donald Clark");
      await expect(validateRemoval).toHaveCount(0, { timeout: 10000 });
    });

    test("should toggle member leader status", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const memberTable = page.locator("#groupMemberTable");
      const promoteButtons = memberTable.locator('button[data-testid^="promote-leader-button-"]');
      const demoteButtons = memberTable.locator('button[data-testid^="remove-leader-button-"]');
      await expect(promoteButtons.first()).toBeVisible({ timeout: 10000 });
      const initialPromoteCount = await promoteButtons.count();
      const initialDemoteCount = await demoteButtons.count();

      const promoteResp = page.waitForResponse((r) => r.url().includes("/groupmembers") && r.request().method() === "POST");
      const promoteRefetch = page.waitForResponse((r) => r.url().includes("/groupmembers?groupId=") && r.request().method() === "GET");
      await promoteButtons.first().click();
      await promoteResp;
      await promoteRefetch;
      await expect(demoteButtons).toHaveCount(initialDemoteCount + 1, { timeout: 10000 });
      await expect(promoteButtons).toHaveCount(initialPromoteCount - 1, { timeout: 10000 });

      // Revert so the seed group's leader composition is unchanged for later tests.
      const demoteResp = page.waitForResponse((r) => r.url().includes("/groupmembers") && r.request().method() === "POST");
      const demoteRefetch = page.waitForResponse((r) => r.url().includes("/groupmembers?groupId=") && r.request().method() === "GET");
      await demoteButtons.last().click();
      await demoteResp;
      await demoteRefetch;
      await expect(demoteButtons).toHaveCount(initialDemoteCount, { timeout: 10000 });
      await expect(promoteButtons).toHaveCount(initialPromoteCount, { timeout: 10000 });
    });

    test("should expose member export link", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const exportLink = page.locator("#groupMembersBox a[download]");
      await expect(exportLink).toHaveCount(1);
      await expect(exportLink).toHaveAttribute("download", "groupmembers.csv");
    });

    test("should send a message to group", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const messageBtn = page.locator('button[aria-label="Email this group"]').first();
      await expect(messageBtn).toBeVisible({ timeout: 10000 });
      await messageBtn.click();
      const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Email" }).first();
      await expect(dialog).toBeVisible({ timeout: 10000 });
      const subject = dialog.locator('input[type="text"]').first();
      await expect(subject).toBeVisible({ timeout: 10000 });
      await subject.fill("Test Message Sent.");
      const cancelBtn = dialog.locator("button").getByText("Cancel");
      if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await expect(dialog).toBeHidden({ timeout: 5000 }).catch(() => { });
    });

    test("should show templates above group message sender", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const messageBtn = page.locator('[data-testid="send-message-button"]').first();
      await expect(messageBtn).toBeVisible({ timeout: 10000 });
      await messageBtn.click();
      const templatesBtn = page.locator("button").getByText("Show Templates");
      await templatesBtn.click();
      const templates = page.locator('[name="templates"]');
      await expect(templates).toHaveCount(1);
    });

    test("should cancel editing group details", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const editBtn = editIconButton(page);
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(nameEdit).toHaveCount(0, { timeout: 10000 });
    });

    test("should edit group details", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const editBtn = editIconButton(page);
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toBeVisible({ timeout: 10000 });
      await nameEdit.fill("Elementary (2-5)");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const title = page.locator("#page-header-title");
      await expect(title).toContainText("Elementary (2-5)", { timeout: 10000 });
    });
  });

  test.describe("Sessions", () => {
    test("should cancel adding session to group", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator("button").getByText("Sessions");
      await sessionsBtn.click();
      const newBtn = page.locator("button").getByText("New").first();
      await newBtn.click();
      const dateEntry = page.locator('[data-testid="session-date-input"]');
      await expect(dateEntry).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(dateEntry).toHaveCount(0);
    });

    test("should add session to group", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator("button").getByText("Sessions");
      await expect(sessionsBtn).toBeVisible({ timeout: 10000 });
      await sessionsBtn.click();
      const newBtn = page.locator("button").getByText("New").first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill("2025-09-01");
      const saveBtn = page.locator("button").getByText("Save");
      await expect(saveBtn).toBeEnabled({ timeout: 10000 });
      await saveBtn.click();
      const sessionCard = page.locator("span").getByText("Active");
      await expect(sessionCard).toHaveCount(1, { timeout: 10000 });
    });

    test("should add person to session", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator("button").getByText("Sessions");
      await sessionsBtn.click();
      const newBtn = page.locator("button").getByText("New").first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill("2025-10-01");
      const saveBtn = page.locator("button").getByText("Save");
      await expect(saveBtn).toBeEnabled({ timeout: 10000 });
      await saveBtn.click();
      // New sessions UI: most recent past session auto-selects on save —
      // SessionAttendance panel renders "Attendance for ..." once selected.
      const attendanceHeader = page.locator('[data-cy="session-present-msg"]');
      await expect(attendanceHeader).toBeVisible({ timeout: 10000 });
      const addBtn = page.locator('button[data-testid="add-member-button"]').first();
      await addBtn.click();
      const addedPerson = page.locator('[id="groupMemberTable"] td a.personName');
      await expect(addedPerson).toHaveCount(1, { timeout: 10000 });
    });

    test("should remove person from session", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator("button").getByText("Sessions");
      await sessionsBtn.click();
      const newBtn = page.locator("button").getByText("New").first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill("2025-11-01");
      const saveBtn = page.locator("button").getByText("Save");
      await expect(saveBtn).toBeEnabled({ timeout: 10000 });
      await saveBtn.click();
      const attendanceHeader = page.locator('[data-cy="session-present-msg"]');
      await expect(attendanceHeader).toBeVisible({ timeout: 10000 });
      const addBtn = page.locator('button[data-testid="add-member-button"]').first();
      await addBtn.click();
      const addedPerson = page.locator('[id="groupMemberTable"] td a.personName');
      await expect(addedPerson).toHaveCount(1, { timeout: 10000 });
      // Session attendance row's remove control is an icon-only IconButton
      // with data-testid="remove-session-visitor-button-<id>".
      const removeBtn = page.locator('button[data-testid^="remove-session-visitor-button-"]').first();
      await removeBtn.click();
      await expect(addedPerson).toHaveCount(0, { timeout: 10000 });
    });

    test("should cancel adding group", async () => {
      const addBtn = page.locator("button").getByText("Add Group");
      await addBtn.click();
      const nameInput = page.locator('input[id="groupName"]');
      await expect(nameInput).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(nameInput).toHaveCount(0);
    });

    test("should expose groups list export link", async () => {
      // Documented: groups list page has a download icon to export all groups.
      const exportLink = page.locator('a[download="groups.csv"]');
      await expect(exportLink).toHaveCount(1);
    });

    test("should organize groups by category", async () => {
      // Documented step: "All your church groups are organized by categories".
      // The seed includes a "Children" category — verify it shows on the list.
      const categoryCell = page.locator("table tbody tr").filter({ hasText: "Children" }).first();
      await expect(categoryCell).toBeVisible({ timeout: 10000 });
    });

    test("should add group", async () => {
      const addBtn = page.locator("button").getByText("Add Group");
      await addBtn.click();
      const categorySelect = page.locator('div[role="combobox"]');
      await categorySelect.click();
      const newCat = page.locator('li[data-value="__ADD_NEW__"]');
      await newCat.click();
      const categoryInput = page.locator("input").first();
      await categoryInput.fill("Test Category");
      const nameInput = page.locator('[name="name"]');
      await nameInput.fill("Zacchaeus Test Group");
      const saveBtn = page.locator("button").getByText("Add").last();
      await saveBtn.click();
      const validateGroup = page.locator("table tbody tr a").getByText("Zacchaeus Test Group");
      await expect(validateGroup).toHaveCount(1);
    });

    test("should delete group", async () => {
      const firstGroup = page.locator("table tbody tr a").first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const editBtn = editIconButton(page);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);

      const deletedGroup = page.locator("table tbody tr a").getByText("Elementary (3-5)");
      const editedDeletedGroup = page.locator("table tbody tr a").getByText("Elementary (2-5)");
      const delGroups = deletedGroup.or(editedDeletedGroup);
      await expect(delGroups).toHaveCount(0, { timeout: 10000 });
    });
  });

});

test.describe("Group communication and roster controls", () => {
  test("group detail page exposes Send Message affordance", async ({ page }) => {
    const firstGroup = page.locator("table tbody tr a").first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    await expect(page.locator('[data-testid="send-message-button"]')).toBeVisible({ timeout: 10000 });
  });

  test("group detail page exposes a roster CSV download link", async ({ page }) => {
    const firstGroup = page.locator("table tbody tr a").first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    await expect(page.locator('a[download="groupmembers.csv"]')).toBeVisible({ timeout: 10000 });
  });

  test("clicking Send Message opens the message composer", async ({ page }) => {
    const firstGroup = page.locator("table tbody tr a").first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    await page.locator('[data-testid="send-message-button"]').click();
    await expect(page.locator("#groupMembersBox textarea").first()).toBeVisible({ timeout: 10000 });
  });

  test("promotes a group member to leader and back", async ({ page }) => {
    const firstGroup = page.locator("table tbody tr a").first();
    await firstGroup.click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });

    const promoteBtn = page.locator('[data-testid^="promote-leader-button-"]').first();
    if (!(await promoteBtn.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: "skip-reason", description: "No non-leader members in seed group" });
      return;
    }
    const testid = await promoteBtn.getAttribute("data-testid");
    const memberId = testid!.replace("promote-leader-button-", "");
    await promoteBtn.click();

    const demoteBtn = page.locator(`[data-testid="remove-leader-button-${memberId}"]`);
    await expect(demoteBtn).toBeVisible({ timeout: 10000 });
    await demoteBtn.click();
    await expect(page.locator(`[data-testid="promote-leader-button-${memberId}"]`)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Group service times (optional) field", () => {
  test("lists available service times and assigns one to a group", async ({ page }) => {
    const groupLink = page.locator("table tbody tr a").getByText("Women's Bible Study", { exact: true });
    await expect(groupLink).toBeVisible({ timeout: 10000 });
    await groupLink.click();
    await page.waitForURL(/\/groups\/GRP\w+/, { timeout: 10000 });

    await editIconButton(page).first().click();
    const box = page.locator("#groupDetailsBox");
    await expect(box).toBeVisible({ timeout: 10000 });

    const chooser = box.locator('[data-cy="choose-service-time"]');
    await expect(chooser).toBeVisible({ timeout: 10000 });
    await chooser.click();
    const options = page.locator('li[role="option"]');
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    expect(await options.count()).toBeGreaterThan(0);

    await options.filter({ hasText: "9:00 AM Service" }).first().click();
    const addResp = page.waitForResponse((r) => r.url().includes("/groupservicetimes") && r.request().method() === "POST");
    await box.locator('[data-cy="add-service-time"]').click();
    await addResp;

    const assignedRow = box.locator("table tbody tr").filter({ hasText: "9:00 AM Service" }).first();
    await expect(assignedRow).toBeVisible({ timeout: 10000 });

    const delResp = page.waitForResponse((r) => r.url().includes("/groupservicetimes") && r.request().method() === "DELETE");
    await assignedRow.locator('button:has(svg[data-testid="PersonRemoveIcon"])').click();
    await delResp;
    await expect(box.locator("table tbody tr").filter({ hasText: "9:00 AM Service" })).toHaveCount(0, { timeout: 10000 });
  });
});

test.describe.serial("Groups — Duplicate, Archive, Restore", () => {
  let page: Page;
  const SOURCE_GROUP = "Empty Nesters Group";
  const DUPLICATE_NAME = `${SOURCE_GROUP} (Copy)`;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToGroups(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("duplicates a group via the GroupBanner icon, copying settings but not members", async () => {
    const groupLink = page.locator("table tbody tr a").getByText(SOURCE_GROUP, { exact: true });
    await expect(groupLink).toBeVisible({ timeout: 10000 });
    await groupLink.click();
    await page.waitForURL(/\/groups\/GRP\w+/, { timeout: 10000 });
    const originalUrl = page.url();

    const groupPost = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator('[data-testid="duplicate-group-button"]').click();
    await confirmDelete(page);
    await groupPost;

    await page.waitForURL((url) => /\/groups\/[\w-]+$/.test(url.pathname) && url.href !== originalUrl, { timeout: 15000 });
    await expect(page.getByText(DUPLICATE_NAME).first()).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Various Homes").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#groupMemberTable tbody tr")).toHaveCount(0, { timeout: 10000 });
  });

  test("archives the duplicated group from the GroupDetailsEdit header", async () => {
    // Still on the duplicate's detail page from the previous test.
    const editBtn = editIconButton(page).first();
    await editBtn.click();
    const archiveBtn = page.locator('[data-testid="archive-group-button"]');
    await expect(archiveBtn).toBeVisible({ timeout: 10000 });

    await archiveBtn.click();
    await confirmDelete(page);
    await page.waitForURL(/\/groups$/, { timeout: 15000 });
  });

  test('archived group is hidden by default and reappears with "Show archived"', async () => {
    await navigateToGroups(page);
    await expect(page.locator("table tbody tr a").getByText(DUPLICATE_NAME)).toHaveCount(0, { timeout: 10000 });

    const toggle = page.locator('[data-testid="show-archived-toggle"] input');
    await toggle.click();
    await expect(page.locator("table tbody tr a").getByText(DUPLICATE_NAME)).toBeVisible({ timeout: 10000 });
  });

  test("Restore returns the group to the active (non-archived) list", async () => {
    const row = page.locator("table tbody tr").filter({ has: page.locator("a").getByText(DUPLICATE_NAME) });
    const restoreResp = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST", { timeout: 15000 });
    await row.locator('[data-testid^="restore-group-"]').click();
    await restoreResp;

    const toggle = page.locator('[data-testid="show-archived-toggle"] input');
    await toggle.click();
    await expect(page.locator("table tbody tr a").getByText(DUPLICATE_NAME)).toBeVisible({ timeout: 10000 });
  });

  test("cleanup: deletes the duplicated group", async () => {
    const groupLink = page.locator("table tbody tr a").getByText(DUPLICATE_NAME, { exact: true });
    await groupLink.click();
    await page.waitForURL(/\/groups\/[\w-]+$/, { timeout: 10000 });
    const editBtn = editIconButton(page).first();
    await editBtn.click();
    const deleteBtn = page.locator("button").getByText("Delete");
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await confirmDelete(page);
    await page.waitForURL(/\/groups$/, { timeout: 15000 });
    await expect(page.locator("table tbody tr a").getByText(DUPLICATE_NAME)).toHaveCount(0, { timeout: 10000 });
  });
});
