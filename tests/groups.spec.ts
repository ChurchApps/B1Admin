import { groupsTest as test, expect } from './helpers/test-fixtures';
import { editIconButton, closeIconButton } from './helpers/fixtures';

// Cross-describe chain: Groups 'edit group details' renames first group to
// 'Elementary (2-5)' which Sessions 'delete group' then deletes. Many tests
// also mutate the same "first group" row, so the whole file runs serially.
test.describe.serial('Group Management', () => {
  test.describe('Groups', () => {
    test('should view group details', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();

      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);
    });

    test('should view person details from group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const firstPerson = page.locator('[id="groupMemberTable"] a').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);
    });

    test('should add person to group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const searchInput = page.locator('input[name="personAddText"]');
      await searchInput.fill('Demo User');
      const searchBtn = page.locator('button').getByText('Search').first();
      await searchBtn.click();

      const addBtn = page.locator('button').getByText('Add').first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const validatedPerson = page.locator('[data-testid="display-box-content"] td').getByText('Demo User');
      await expect(validatedPerson).toHaveCount(1);
    });

    test('should advanced add people', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const advBtn = page.locator('button').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await expect(firstCheck).toBeVisible({ timeout: 10000 });
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]');
      await firstName.fill('Donald');

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 });

      const addBtn = page.locator('button').getByText('Add').last();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const dismissal = page.locator('button').getByText('No Thanks');
      await expect(dismissal).toBeVisible({ timeout: 10000 });
      await dismissal.click();
      const validatePerson = page.locator('[id="groupMemberTable"]').getByText('Donald Clark');
      await expect(validatePerson).toHaveCount(1);
      const removeBtn = page.locator('button').getByText('person_remove').last();
      await removeBtn.click();
    });

    test('should delete advanced add conditions', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const advBtn = page.locator('button').getByText('Advanced');
      await advBtn.click();
      const advancedSearchBox = page.locator('#advancedSearch');
      await expect(advancedSearchBox).toBeVisible({ timeout: 10000 });
      const filterCheckboxes = advancedSearchBox.locator('input[type="checkbox"]');
      await filterCheckboxes.first().click();
      await filterCheckboxes.nth(1).click();
      const checkTwo = page.locator('span').getByText('2 active:');
      await expect(checkTwo).toHaveCount(1);
      // Active-filter chips render their delete icon as a span inside the chip
      // (MUI Chip deleteIcon), not a <button>. Scope to the active filters
      // paper to avoid matching chat-panel close buttons elsewhere on the page.
      const activeFiltersPaper = page.locator('.MuiPaper-root').filter({ has: checkTwo });
      const chipDeleteIcons = activeFiltersPaper.locator('.MuiChip-deleteIcon');
      await chipDeleteIcons.last().click();
      const checkOne = page.locator('span').getByText('1 active:');
      await expect(checkOne).toHaveCount(1);
      await filterCheckboxes.nth(1).click();
      await expect(checkTwo).toHaveCount(1);
      const clearAll = page.locator('span').getByText("Clear All");
      await clearAll.click();
      await expect(checkTwo).toHaveCount(0);
    });

    test('should remove person from group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const removeBtn = page.locator('button').getByText('person_remove').last();
      await removeBtn.click();
      const validateRemoval = page.locator('[id="groupMemberTable"]').getByText('Donald Clark');
      await expect(validateRemoval).toHaveCount(0, { timeout: 10000 });
    });

    test('should toggle member leader status', async ({ page }) => {
      // Documented step: "Use the green key icon to designate group leaders".
      // Promote a non-leader, verify the row re-renders as a leader, then revert.
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const memberTable = page.locator('#groupMemberTable');
      const promoteButtons = memberTable.locator('button[data-testid^="promote-leader-button-"]');
      const demoteButtons = memberTable.locator('button[data-testid^="remove-leader-button-"]');
      await expect(promoteButtons.first()).toBeVisible({ timeout: 10000 });
      const initialPromoteCount = await promoteButtons.count();
      const initialDemoteCount = await demoteButtons.count();

      const promoteResp = page.waitForResponse((r) => r.url().includes('/groupmembers') && r.request().method() === 'POST');
      const promoteRefetch = page.waitForResponse((r) => r.url().includes('/groupmembers?groupId=') && r.request().method() === 'GET');
      await promoteButtons.first().click();
      await promoteResp;
      await promoteRefetch;
      await expect(demoteButtons).toHaveCount(initialDemoteCount + 1, { timeout: 10000 });
      await expect(promoteButtons).toHaveCount(initialPromoteCount - 1, { timeout: 10000 });

      // Revert so the seed group's leader composition is unchanged for later tests.
      const demoteResp = page.waitForResponse((r) => r.url().includes('/groupmembers') && r.request().method() === 'POST');
      const demoteRefetch = page.waitForResponse((r) => r.url().includes('/groupmembers?groupId=') && r.request().method() === 'GET');
      await demoteButtons.last().click();
      await demoteResp;
      await demoteRefetch;
      await expect(demoteButtons).toHaveCount(initialDemoteCount, { timeout: 10000 });
      await expect(promoteButtons).toHaveCount(initialPromoteCount, { timeout: 10000 });
    });

    test('should expose member export link', async ({ page }) => {
      // Documented step: "To export your group data, click the download icon".
      // Verify the export link is rendered on the Members tab; full download
      // capture is out of scope for this unit (CSV is generated client-side).
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const exportLink = page.locator('#groupMembersBox a[download]');
      await expect(exportLink).toHaveCount(1);
      await expect(exportLink).toHaveAttribute('download', 'groupmembers.csv');
    });

    test('should send a message to group', async ({ page }) => {
      //SENDING VALIDATION- get dad to fix his end
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const messageBtn = page.locator('button').getByText('edit_square');
      await messageBtn.click();
      const messageBox = page.locator('textarea').first();
      await messageBox.fill('Test Message Sent.');
      const sendBtn = page.locator('button').getByText('Send');
      await sendBtn.click();
      //vv add validation checking that the message got sent (Currently does not send)
      const userBtn = page.locator('[id="user-menu-button"]');
      await userBtn.click();
      const messagesBtn = page.locator('[data-testid="nav-item-messages"]');
      await messagesBtn.click();
    });

    test('should show templates above group message sender', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const messageBtn = page.locator('button').getByText('edit_square');
      await expect(messageBtn).toBeVisible({ timeout: 10000 });
      await messageBtn.click();
      const templatesBtn = page.locator('button').getByText('Show Templates');
      await templatesBtn.click();
      const templates = page.locator('[name="templates"]');
      await expect(templates).toHaveCount(1);
    });

    test('should cancel editing group details', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const editBtn = editIconButton(page);
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(nameEdit).toHaveCount(0, { timeout: 10000 });
    });

    test('should edit group details', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const editBtn = editIconButton(page);
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toBeVisible({ timeout: 10000 });
      await nameEdit.fill('Elementary (2-5)');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const title = page.locator('p').first();
      await expect(title).toContainText('Elementary (2-5)', { timeout: 10000 });
    });
  });

  test.describe('Sessions', () => {
    test('should cancel adding session to group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator('button').getByText('Sessions');
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateEntry = page.locator('[data-testid="session-date-input"]');
      await expect(dateEntry).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(dateEntry).toHaveCount(0);
    });

    test('should add session to group', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator('button').getByText('Sessions');
      await expect(sessionsBtn).toBeVisible({ timeout: 10000 });
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill('2025-09-01');
      const saveBtn = page.locator('button').getByText('Save');
      await expect(saveBtn).toBeEnabled({ timeout: 10000 });
      await saveBtn.click();
      const sessionCard = page.locator('span').getByText('Active');
      await expect(sessionCard).toHaveCount(1, { timeout: 10000 });
    });

    test('should add person to session', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator('button').getByText('Sessions');
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill('2025-10-01');
      const saveBtn = page.locator('button').getByText('Save');
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

    test('should remove person from session', async ({ page }) => {
      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const sessionsBtn = page.locator('button').getByText('Sessions');
      await sessionsBtn.click();
      const newBtn = page.locator('button').getByText('New').first();
      await newBtn.click();
      const dateBox = page.locator('[type="date"]');
      await dateBox.fill('2025-11-01');
      const saveBtn = page.locator('button').getByText('Save');
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

    test('should cancel adding group', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Group');
      await addBtn.click();
      const nameInput = page.locator('input[id="groupName"]');
      await expect(nameInput).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(nameInput).toHaveCount(0);
    });

    test('should expose groups list export link', async ({ page }) => {
      // Documented: groups list page has a download icon to export all groups.
      const exportLink = page.locator('a[download="groups.csv"]');
      await expect(exportLink).toHaveCount(1);
    });

    test('should organize groups by category', async ({ page }) => {
      // Documented step: "All your church groups are organized by categories".
      // The seed includes a "Children" category — verify it shows on the list.
      const categoryCell = page.locator('table tbody tr').filter({ hasText: 'Children' }).first();
      await expect(categoryCell).toBeVisible({ timeout: 10000 });
    });

    test('should add group', async ({ page }) => {
      const addBtn = page.locator('button').getByText('Add Group');
      await addBtn.click();
      const categorySelect = page.locator('div[role="combobox"]');
      await categorySelect.click();
      const newCat = page.locator('li[data-value="__ADD_NEW__"]');
      await newCat.click();
      const categoryInput = page.locator('input').first();
      await categoryInput.fill('Test Category');
      const nameInput = page.locator('[name="name"]');
      await nameInput.fill('Octavian Test Group');
      const saveBtn = page.locator('button').getByText('Add').last();
      await saveBtn.click();
      const validateGroup = page.locator('table tbody tr a').getByText('Octavian Test Group');
      await expect(validateGroup).toHaveCount(1);
    });

    test('should delete group', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const firstGroup = page.locator('table tbody tr a').first();
      await firstGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);
      //delete
      const editBtn = editIconButton(page);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      //check for group still existing
      const deletedGroup = page.locator('table tbody tr a').getByText('Elementary (3-5)');
      const editedDeletedGroup = page.locator('table tbody tr a').getByText('Elementary (2-5)');
      const delGroups = deletedGroup.or(editedDeletedGroup);
      await expect(delGroups).toHaveCount(0, { timeout: 10000 });
    });
  });

});
