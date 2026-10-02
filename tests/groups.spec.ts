import { request, type Page } from "@playwright/test";
import { groupsTest as test, loggedInTest, expect } from "./helpers/test-fixtures";
import { dismissSendInviteIfPresent, editIconButton, confirmDelete, openSeedGroup, SESSION_GROUP } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToGroups } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

async function openSessionOn(page: Page, date: string) {
  await openSeedGroup(page, SESSION_GROUP);
  await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);
  await page.locator("button").getByText("Sessions").click();
  await page.locator("button").getByText("New").first().click();
  await page.locator('[data-testid="session-date-input"] input').fill(date);
  const saveBtn = page.getByRole("button", { name: "Save", exact: true });
  await expect(saveBtn).toBeEnabled({ timeout: 10000 });
  await saveBtn.click();
  await selectSession(page, date);
}

// Session list labels are MM/DD/YYYY.
async function selectSession(page: Page, date: string) {
  const [y, m, d] = date.split("-");
  const label = `${m}/${d}/${y}`;
  const item = page.getByRole("button").filter({ hasText: label }).first();
  await item.click({ timeout: 10000 });
  await expect(item).toContainText("Active", { timeout: 10000 });
  await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 10000 });
}

async function saveAttendance(page: Page) {
  await page.locator('[data-testid="save-attendance-button"]').click();
  await expect(page.locator('[data-testid="attendance-save-message"]')).toHaveText("Attendance saved.", { timeout: 10000 });
}

// Demo: these groups all meet at the Wednesday "7:00 PM Service" (SST00000004).
const WEDNESDAY_GROUPS = ["GRP00000003", "GRP00000007", "GRP00000008", "GRP00000009", "GRP00000010"];

async function wednesdaySessionCounts(date: string) {
  const apiBase = process.env.API_BASE || "http://localhost:8084";
  const ctx = await request.newContext();
  const login = await (await ctx.post(`${apiBase}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const jwt = login.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
  const sessions = await (await ctx.get(`${apiBase}/attendance/sessions`, { headers: { Authorization: "Bearer " + jwt } })).json();
  const counts = WEDNESDAY_GROUPS.map((groupId) => sessions.filter((s: { groupId: string; serviceTimeId: string; sessionDate: string }) => s.groupId === groupId && s.serviceTimeId === "SST00000004" && s.sessionDate.startsWith(date)).length);
  await ctx.dispose();
  return counts;
}

async function addSessionForAllGroups(page: Page, group: string, date: string) {
  await openSeedGroup(page, group);
  await page.locator("button").getByText("Sessions").click();
  await page.locator("button").getByText("New").first().click();
  const box = page.locator('[data-cy="add-session-box"]');
  await box.getByRole("combobox").click();
  await page.getByRole("option", { name: "7:00 PM Service" }).click();
  await box.locator('[data-testid="session-date-input"] input').fill(date);
  await expect(box.getByText("Also add for the other 4 groups in Wednesday Evening Service - 7:00 PM Service")).toBeVisible({ timeout: 10000 });
  await box.locator('[data-testid="session-all-groups"]').check();
  const saved = page.waitForResponse((r) => r.url().includes("/attendance/sessions") && r.request().method() === "POST");
  await box.getByRole("button", { name: "Save", exact: true }).click();
  expect((await saved).ok()).toBeTruthy();
}

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
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/);
    });

    test("should view person details from group", async () => {
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const firstPerson = page.locator('[id="groupMemberTable"] a').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/(?!demographics|lists)[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
      await expect(page).toHaveURL(/\/people\/(?!demographics|lists)[^/?#]+/);
    });

    test("should add person to group", async () => {
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const searchInput = page.locator('input[name="personAddText"]');
      await searchInput.fill("Demo User");
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();

      const addBtn = page.locator('[data-testid^="add-person-button-"]').first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await dismissSendInviteIfPresent(page);
      const validatedPerson = page.locator('[data-testid="display-box-content"] td').getByText("Demo User");
      await expect(validatedPerson).toHaveCount(1);
    });

    test("adds a newly created person straight to the group", async () => {
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const last = `Newcomer${Date.now()}`;
      await page.locator('input[name="personAddText"]').fill(`Zelda ${last}`);
      await page.locator('[data-testid="search-button"]').click();
      await page.locator("#personAddBox").getByRole("button", { name: /Add (a )?New Person/ }).click();

      const dialog = page.getByRole("dialog").filter({ hasText: /Add (a )?New Person/ });
      await dialog.locator('input[name="first"]').fill("Zelda");
      await dialog.locator('input[name="last"]').fill(last);
      const memberSaved = page.waitForResponse((r) => r.url().includes("/groupmembers") && r.request().method() === "POST");
      await dialog.getByRole("button", { name: "Add", exact: true }).click();
      await expect(dialog).toBeHidden();
      expect((await memberSaved).ok()).toBeTruthy();

      await expect(page.locator("#groupMemberTable").getByText(`Zelda ${last}`)).toHaveCount(1);
    });

    test("should advanced add people", async () => {
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

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
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

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
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const removeBtn = page.locator('[data-testid^="remove-member-button-"]').last();
      await removeBtn.click();
      await confirmDelete(page);
      const validateRemoval = page.locator('[id="groupMemberTable"]').getByText("Donald Clark");
      await expect(validateRemoval).toHaveCount(0, { timeout: 10000 });
    });

    test("should toggle member leader status", async () => {
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

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
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const exportLink = page.locator("#groupMembersBox a[download]");
      await expect(exportLink).toHaveCount(1);
      await expect(exportLink).toHaveAttribute("download", "groupmembers.csv");
    });

    test("should send a message to group", async () => {
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

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
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const messageBtn = page.locator('[data-testid="send-message-button"]').first();
      await expect(messageBtn).toBeVisible({ timeout: 10000 });
      await messageBtn.click();
      const templatesBtn = page.locator("button").getByText("Show Templates");
      await templatesBtn.click();
      const templates = page.locator('[name="templates"]');
      await expect(templates).toHaveCount(1);
    });

    test("should cancel editing group details", async () => {
      await openSeedGroup(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const editBtn = editIconButton(page);
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(nameEdit).toHaveCount(0, { timeout: 10000 });
    });

    test("should edit group details", async () => {
      await openSeedGroup(page, "Elementary (3-5)");
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const editBtn = editIconButton(page);
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toBeVisible({ timeout: 10000 });
      await nameEdit.fill("Elementary (2-5)");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const title = page.locator("#page-header-title");
      await expect(title).toContainText("Elementary (2-5)", { timeout: 10000 });
      await editIconButton(page).click();
      await expect(page.locator('[name="name"]')).toBeVisible({ timeout: 10000 });
      await page.locator('[name="name"]').fill("Elementary (3-5)");
      await page.locator("button").getByText("Save").click();
      await expect(title).toContainText("Elementary (3-5)", { timeout: 10000 });
    });
  });

  test.describe("Sessions", () => {
    test("should cancel adding session to group", async () => {
      await openSeedGroup(page, SESSION_GROUP);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const sessionsBtn = page.locator("button").getByText("Sessions");
      await sessionsBtn.click();
      await expect(page.locator('[data-testid="sessions-setup-hint"]')).toContainText("People → Attendance → Setup", { timeout: 10000 });
      const newBtn = page.locator("button").getByText("New").first();
      await newBtn.click();
      const dateEntry = page.locator('[data-testid="session-date-input"]');
      await expect(dateEntry).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(dateEntry).toHaveCount(0);
    });

    test("should add session to group", async () => {
      await openSeedGroup(page, SESSION_GROUP);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const sessionsBtn = page.locator("button").getByText("Sessions");
      await expect(sessionsBtn).toBeVisible({ timeout: 10000 });
      await sessionsBtn.click();
      const newBtn = page.locator("button").getByText("New").first();
      await newBtn.click();
      const dateBox = page.locator('[data-testid="session-date-input"]');
      await dateBox.locator("input").fill("2025-09-01");
      const saveBtn = page.getByRole("button", { name: "Save", exact: true });
      await expect(saveBtn).toBeEnabled({ timeout: 10000 });
      await saveBtn.click();
      const sessionCard = page.locator("span").getByText("Active");
      await expect(sessionCard).toHaveCount(1, { timeout: 10000 });
    });

    test("adds a session for every group in the service time at once, without duplicates", async () => {
      const date = "2027-02-17";
      const before = await wednesdaySessionCounts(date);
      await addSessionForAllGroups(page, "Wednesday Prayer Service", date);
      // The group you're on always gets the new session; every other class gets one if it doesn't already have it.
      const afterFirst = before.map((c, i) => (i === 0 ? c + 1 : Math.max(c, 1)));
      await expect.poll(() => wednesdaySessionCounts(date)).toEqual(afterFirst);
      // Running it again from another class skips groups that already have the session.
      await addSessionForAllGroups(page, "Preschool (3-5)", date);
      await expect.poll(() => wednesdaySessionCounts(date)).toEqual(afterFirst.map((c, i) => (i === 2 ? c + 1 : c)));
    });

    test("lists which groups at the service time still need attendance", async () => {
      // Wednesday Prayer Service has attendance on 3/11/2026; the other four Wednesday classes have none.
      const apiBase = process.env.API_BASE || "http://localhost:8084";
      const ctx = await request.newContext();
      const loginRes = await (await ctx.post(`${apiBase}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
      const jwt = loginRes.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
      const headers = { Authorization: "Bearer " + jwt };
      const sRes = await ctx.post(`${apiBase}/attendance/sessions`, { headers, data: [{ groupId: "GRP00000003", serviceTimeId: "SST00000004", sessionDate: "2026-03-11" }] });
      const session = (await sRes.json())[0];
      await ctx.post(`${apiBase}/attendance/visitsessions/log`, { headers, data: { personId: "PER00000001", visitSessions: [{ sessionId: session.id }] } });
      await ctx.dispose();

      await openSeedGroup(page, "Wednesday Prayer Service");
      await page.locator("button").getByText("Sessions").click();
      await page.getByRole("button", { name: "2026", exact: true }).click();
      await selectSession(page, "2026-03-11");
      await page.locator('[data-testid="session-attendance-status-button"]').click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("Who still needs attendance");
      await expect(dialog.locator('[data-testid="session-status-summary"]')).toHaveText("1 of 5 groups entered", { timeout: 10000 });
      const rows = dialog.locator('[data-testid="session-status-row"]');
      await expect(rows).toHaveCount(5);
      // Not-entered groups come first, then the ones already done.
      await expect(rows.first()).toContainText("Not entered");
      await expect(rows.filter({ hasText: "Nursery (0-2)" })).toContainText("Not entered");
      await expect(rows.last()).toContainText("Wednesday Prayer Service");
      await expect(rows.last()).toContainText("Entered (1)");
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toHaveCount(0);
    });

    test("should add person to session", async () => {
      await openSessionOn(page, "2025-10-01");
      await page.getByRole("checkbox", { name: "William Anderson" }).check();
      await saveAttendance(page);
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("1 of 3 present");
      await expect(page.getByRole("checkbox", { name: "William Anderson" })).toBeChecked();
    });

    test("should remove person from session", async () => {
      await openSessionOn(page, "2025-11-01");
      const william = page.getByRole("checkbox", { name: "William Anderson" });
      await william.check();
      await saveAttendance(page);
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("1 of 3 present");
      await william.uncheck();
      await saveAttendance(page);
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("0 of 3 present");
      await expect(william).not.toBeChecked();
    });

    test("records the whole class roster with one Save", async () => {
      await openSessionOn(page, "2025-12-07");
      const rows = page.locator('[data-testid="session-roster-row"]');
      await expect(rows).toHaveCount(3, { timeout: 10000 });
      await page.locator('[data-testid="attendance-select-all"]').click();
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("3 of 3 present");
      await page.getByRole("checkbox", { name: "George Thompson" }).uncheck();
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("2 of 3 present");
      await saveAttendance(page);

      // Reload: the saved state comes back from the API, not local state.
      await page.reload();
      await page.locator("button").getByText("Sessions").click();
      await selectSession(page, "2025-12-07");
      await expect(page.getByRole("checkbox", { name: "William Anderson" })).toBeChecked({ timeout: 10000 });
      await expect(page.getByRole("checkbox", { name: "Margaret Thompson" })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: "George Thompson" })).not.toBeChecked();
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("2 of 3 present");
    });

    test("prints a class roll sheet for the group", async () => {
      await openSeedGroup(page, SESSION_GROUP);
      await expect(page.locator('[data-testid="print-roster-button"]')).toBeVisible({ timeout: 10000 });
      const groupId = new URL(page.url()).pathname.split("/").pop();
      await page.goto("/groups/print-roster?groupId=" + groupId + "&date=2025-12-07");
      await expect(page.locator("h1.roster-title")).toHaveText(SESSION_GROUP, { timeout: 10000 });
      // Two columns: read down the left column, then the right.
      await expect(page.locator('[data-testid="roster-member"]')).toHaveCount(3);
      await expect(page.locator('td[data-testid="roster-member"]:not(.roster-split)')).toHaveText(["William Anderson", "George Thompson"]);
      await expect(page.locator('td.roster-split[data-testid="roster-member"]')).toHaveText(["Margaret Thompson"]);
      // The session date sits on its own line right under the group name.
      await expect(page.locator('h1.roster-title + [data-testid="roster-date"]')).toContainText("December 7, 2025");
      // The print route has no app chrome; go back so later tests can use the nav.
      await page.goBack();
      await expect(page.locator("#primaryNavButton")).toBeVisible({ timeout: 15000 });
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
      await openSeedGroup(page, "Zacchaeus Test Group");
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const editBtn = editIconButton(page);
      await expect(editBtn).toBeVisible({ timeout: 10000 });
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);

      await expect(page.locator("table tbody tr a").getByText("Zacchaeus Test Group")).toHaveCount(0, { timeout: 10000 });
    });
  });

});

test.describe("Group communication and roster controls", () => {
  test("group detail page exposes Send Message affordance", async ({ page }) => {
    await openSeedGroup(page);
    await expect(page.locator('[data-testid="send-message-button"]')).toBeVisible({ timeout: 10000 });
  });

  test("group detail page exposes a roster CSV download link", async ({ page }) => {
    await openSeedGroup(page);
    await expect(page.locator('a[download="groupmembers.csv"]')).toBeVisible({ timeout: 10000 });
  });

  test("clicking Send Message opens the message composer", async ({ page }) => {
    await openSeedGroup(page);
    await page.locator('[data-testid="send-message-button"]').click();
    await expect(page.locator("#groupMembersBox textarea").first()).toBeVisible({ timeout: 10000 });
  });

  test("promotes a group member to leader and back", async ({ page }) => {
    await openSeedGroup(page);

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
    await openSeedGroup(page, "Women's Bible Study");

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
  test.describe.configure({ retries: 0 });
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
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
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
    if (!/\/groups\/?(\?|$)/.test(page.url())) await navigateToGroups(page);
    await expect(page.locator("table tbody tr a").getByText(DUPLICATE_NAME)).toHaveCount(0, { timeout: 10000 });

    const toggle = page.locator('[data-testid="show-archived-toggle"] input');
    await toggle.click();
    await expect(page.locator("table tbody tr a").getByText(DUPLICATE_NAME).first()).toBeVisible({ timeout: 10000 });
  });

  test("Restore returns the group to the active (non-archived) list", async () => {
    const row = page.locator("table tbody tr").filter({ has: page.locator("a").getByText(DUPLICATE_NAME) });
    const restoreResp = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST", { timeout: 15000 });
    await row.locator('[data-testid^="restore-group-"]').click();
    await expect(page.locator('div[role="dialog"]').last()).toContainText(DUPLICATE_NAME, { timeout: 10000 });
    await confirmDelete(page);
    await restoreResp;

    const toggle = page.locator('[data-testid="show-archived-toggle"] input');
    await toggle.click();
    await expect(page.locator("table tbody tr a").getByText(DUPLICATE_NAME).first()).toBeVisible({ timeout: 10000 });
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

test.describe.serial("Groups — Chat feed toggles", () => {
  let page: Page;
  // Adult Bible Class: a standard group whose chat the B1App specs also exercise.
  const GROUP_NAME = "Adult Bible Class";
  // Senior Adults: no spec edits it, so its toggles are still the seed defaults.
  const UNTOUCHED_GROUP = "Senior Adults";
  const feedSelect = (name: "discussions" | "announcements") => page.locator(`[data-testid="${name}-enabled-select"]`);
  const chooseOption = async (name: "discussions" | "announcements", option: "Yes" | "No") => {
    await feedSelect(name).click();
    await page.locator('li[role="option"]').filter({ hasText: new RegExp(`^${option}$`) }).click();
  };
  const saveGroup = async () => {
    const savePost = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST");
    await page.locator("#groupDetailsBox button").filter({ hasText: /^save$/i }).first().click();
    await savePost;
  };
  const expectFeedChip = async (name: "discussions" | "announcements", on: boolean) => {
    const chip = page.locator(`[data-testid="group-chat-${name}-chip"]`);
    await expect(chip).toBeVisible({ timeout: 10000 });
    await expect(chip.locator(`[data-testid="${on ? "CheckCircleIcon" : "CancelIcon"}"]`)).toBeVisible();
  };
  const openEdit = async () => {
    await page.locator('[data-testid="edit-group-button"]').click();
    await expect(feedSelect("discussions")).toBeVisible({ timeout: 10000 });
  };

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToGroups(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("both chat feeds default to on", async () => {
    await openSeedGroup(page, UNTOUCHED_GROUP);
    await expectFeedChip("discussions", true);
    await expectFeedChip("announcements", true);
    await openEdit();
    await expect(feedSelect("discussions")).toContainText(/Yes/);
    await expect(feedSelect("announcements")).toContainText(/Yes/);
  });

  test("turning discussions off persists and shows on the details view", async () => {
    await navigateToGroups(page);
    await openSeedGroup(page, GROUP_NAME);
    await openEdit();
    await chooseOption("discussions", "No");
    await chooseOption("announcements", "Yes");
    await saveGroup();
    await expectFeedChip("discussions", false);
    await expectFeedChip("announcements", true);

    await page.reload();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
    await openEdit();
    await expect(feedSelect("discussions")).toContainText(/No/);
    await expect(feedSelect("announcements")).toContainText(/Yes/);
  });

  test("turning discussions back on restores the seed default", async () => {
    await chooseOption("discussions", "Yes");
    await saveGroup();
    await expectFeedChip("discussions", true);
    await expectFeedChip("announcements", true);
  });
});

// ChurchAppsSupport#1178: "Print All Classes" showed "No classes found to print."
// /groups/search joins attendance tables from the membership module, which fails
// in production where each module has its own database. Locally one shared DB hides
// that, so answer the cross-module search the way production does.
loggedInTest("print all classes for a service time prints every group in it", async ({ page }) => {
  await page.route("**/membership/groups/search**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Table 'membership.groupServiceTimes' doesn't exist" }) }));
  // Demo seed: five groups meet at the Wednesday 7:00 PM service time.
  await page.goto("/groups/print-roster?serviceTimeId=SST00000004&date=2025-12-03");
  await expect(page.locator("h1.roster-title")).toHaveText(
    ["Elementary (3-5)", "Elementary (K-2)", "Nursery (0-2)", "Preschool (3-5)", "Wednesday Prayer Service"],
    { timeout: 15000 }
  );
});
