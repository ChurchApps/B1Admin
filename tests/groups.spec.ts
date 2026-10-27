import { request, test as plainTest, type APIRequestContext, type Page, type Route } from "@playwright/test";
import { groupsTest as test, loggedInTest, expect } from "./helpers/test-fixtures";
import { dismissSendInviteIfPresent, confirmDelete, openSeedGroup, SESSION_GROUP } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToGroups, openPrimaryNav } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { mockChurchLogo } from "./helpers/print-logo";
import { createLimitedRole, createNamesOnlyRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";

// The group record opens on its summary plate; members and sessions are ?view= slices.
async function openSeedMembers(page: Page, name?: string) {
  await openSeedGroup(page, name);
  await page.getByTestId("group-all-members").click();
  await expect(page.locator("#groupMembersBox")).toBeVisible({ timeout: 10000 });
}

const editGroupButton = (page: Page) => page.getByTestId("edit-group-button");

async function openSessionOn(page: Page, date: string) {
  await openSeedGroup(page, SESSION_GROUP);
  await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);
  await page.getByTestId("group-all-sessions").click();
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
  // The list stays on the year it defaulted to; a new session in another year needs its pill.
  await page.getByTestId("session-year-pills").getByRole("button", { name: y, exact: true }).click({ timeout: 10000 });
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

// Nursery meets at 9:00 AM and 10:30 AM; its two same-day sessions must be told apart by service time.
const API = process.env.API_BASE || "http://localhost:8084";
const NURSERY = "GRP00000007";

async function apiAuth(api: APIRequestContext) {
  const res = await api.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
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
      await openSeedMembers(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const firstPerson = page.locator('[id="groupMemberTable"] a').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/(?!demographics|lists)[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
      await expect(page).toHaveURL(/\/people\/(?!demographics|lists)[^/?#]+/);
    });

    test("should add person to group", async () => {
      await openSeedMembers(page);
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
      await openSeedMembers(page);
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
      await openSeedMembers(page);
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
      await openSeedMembers(page);
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
      await openSeedMembers(page);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const removeBtn = page.locator('[data-testid^="remove-member-button-"]').last();
      await removeBtn.click();
      await confirmDelete(page);
      const validateRemoval = page.locator('[id="groupMemberTable"]').getByText("Donald Clark");
      await expect(validateRemoval).toHaveCount(0, { timeout: 10000 });
    });

    test("should toggle member leader status", async () => {
      await openSeedMembers(page);
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
      await openSeedMembers(page);
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
      await openSeedMembers(page);
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

      const editBtn = editGroupButton(page);
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

      const editBtn = editGroupButton(page);
      await editBtn.click();
      const nameEdit = page.locator('[name="name"]');
      await expect(nameEdit).toBeVisible({ timeout: 10000 });
      await nameEdit.fill("Elementary (2-5)");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const title = page.locator("#page-header-title");
      await expect(title).toContainText("Elementary (2-5)", { timeout: 10000 });
      await editGroupButton(page).click();
      await expect(page.locator('[name="name"]')).toBeVisible({ timeout: 10000 });
      await page.locator('[name="name"]').fill("Elementary (3-5)");
      await page.locator("button").getByText("Save").click();
      await expect(title).toContainText("Elementary (3-5)", { timeout: 10000 });
    });
  });

  test.describe("Sessions", () => {
    const nurserySessionIds: string[] = [];
    let lateNurserySessionId = "";

    test.beforeAll(async () => {
      const api = await request.newContext();
      const auth = await apiAuth(api);
      // Clear sessions an earlier run left on this date so the list shows one row per service time.
      const existing = await (await api.get(`${API}/attendance/sessions?groupId=${NURSERY}`, auth)).json();
      for (const s of existing || []) if (String(s.sessionDate).startsWith("2026-10-11")) await api.delete(`${API}/attendance/sessions/${s.id}`, auth);
      const res = await api.post(`${API}/attendance/sessions`, {
        ...auth,
        data: [
          { groupId: NURSERY, serviceTimeId: "SST00000001", sessionDate: "2026-10-11T09:00:00" },
          { groupId: NURSERY, serviceTimeId: "SST00000002", sessionDate: "2026-10-11T10:30:00" }
        ]
      });
      const sessions = await res.json();
      sessions.forEach((s: any) => nurserySessionIds.push(s.id));
      lateNurserySessionId = sessions[1].id;
      await api.dispose();
    });

    test.afterAll(async () => {
      const api = await request.newContext();
      const auth = await apiAuth(api);
      for (const id of nurserySessionIds) await api.delete(`${API}/attendance/sessions/${id}`, auth);
      await api.dispose();
    });

    test("Sessions list names the service time of each same-day session", async () => {
      await page.goto(`/groups/${NURSERY}?view=sessions`);
      // The list opens on the newest year, and other tests leave later Nursery sessions behind.
      await page.getByTestId("year-pill-2026").click({ timeout: 15000 });
      const rows = page.getByRole("listitem").filter({ hasText: "10/11/2026" });
      await expect(rows).toHaveCount(2, { timeout: 15000 });
      await expect(rows.filter({ hasText: "9:00 AM Service" })).toHaveCount(1);
      await expect(rows.filter({ hasText: "10:30 AM Service" })).toHaveCount(1);
    });

    test("should cancel adding session to group", async () => {
      await openSeedGroup(page, SESSION_GROUP);
      await expect(page).toHaveURL(/\/groups\/(?!health|pending)[^/?#]+/);

      const sessionsBtn = page.getByTestId("group-all-sessions");
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

      const sessionsBtn = page.getByTestId("group-all-sessions");
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

    test("saves session notes as markdown and shows them rendered", async () => {
      const date = "2025-09-03";
      await openSeedGroup(page, SESSION_GROUP);
      await page.getByTestId("group-all-sessions").click();
      await page.locator("button").getByText("New").first().click();
      const box = page.locator('[data-cy="add-session-box"]');
      await box.locator('[data-testid="session-date-input"] input').fill(date);
      await box.locator(".editor-input[contenteditable='true']").first().click();
      await page.keyboard.type("Read **Romans 9** this week");
      await box.getByRole("button", { name: "Save", exact: true }).click();
      await selectSession(page, date);
      await expect(page.locator('[data-testid="session-notes"] strong')).toHaveText("Romans 9", { timeout: 10000 });
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

    test("lists which groups at the service time still need attendance and opens their same-date session", async () => {
      // Wednesday Prayer Service has attendance on 3/11/2026; the other four Wednesday classes have none.
      // Nursery also gets an empty 3/11/2026 session plus a newer one that it would otherwise open by default.
      const apiBase = process.env.API_BASE || "http://localhost:8084";
      const ctx = await request.newContext();
      const loginRes = await (await ctx.post(`${apiBase}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
      const jwt = loginRes.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
      const headers = { Authorization: "Bearer " + jwt };
      const sRes = await ctx.post(`${apiBase}/attendance/sessions`, { headers, data: [{ groupId: "GRP00000003", serviceTimeId: "SST00000004", sessionDate: "2026-03-11" }] });
      const session = (await sRes.json())[0];
      await ctx.post(`${apiBase}/attendance/visitsessions/log`, { headers, data: { personId: "PER00000001", visitSessions: [{ sessionId: session.id }] } });
      const nRes = await ctx.post(`${apiBase}/attendance/sessions`, { headers, data: [{ groupId: "GRP00000007", serviceTimeId: "SST00000004", sessionDate: "2026-03-11" }, { groupId: "GRP00000007", serviceTimeId: "SST00000004", sessionDate: "2026-09-30" }] });
      const nurserySession = (await nRes.json())[0];
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

      // A group name opens that group's session for the same date, not its home page.
      await page.locator('[data-testid="session-attendance-status-button"]').click();
      await dialog.locator('[data-testid="session-status-row"]').filter({ hasText: "Nursery (0-2)" }).getByRole("link").click();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`/groups/GRP00000007\\?view=sessions&sessionId=${nurserySession.id}`));
      await expect(page.getByRole("button").filter({ hasText: "03/11/2026" }).first()).toContainText("Active", { timeout: 10000 });
      await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 10000 });
    });

    test("should add person to session", async () => {
      await openSessionOn(page, "2025-10-01");
      await page.getByRole("checkbox", { name: "William Anderson" }).check();
      await saveAttendance(page);
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("1 of 3 present");
      await expect(page.getByRole("checkbox", { name: "William Anderson" })).toBeChecked();
    });

    test("a person created from the session add box is added and marked present", async () => {
      await openSessionOn(page, "2026-04-08");
      const last = `Newcomer${Date.now()}`;
      const box = page.getByTestId("session-person-add");
      await box.locator('input[name="personAddText"]').fill(`Zelda ${last}`);
      await box.locator('[data-testid="search-button"]').click();
      await box.getByRole("button", { name: /Add (a )?New Person/ }).click();

      const dialog = page.getByRole("dialog").filter({ hasText: /Add (a )?New Person/ });
      await dialog.locator('input[name="first"]').fill("Zelda");
      await dialog.locator('input[name="last"]').fill(last);
      await dialog.getByRole("button", { name: "Add", exact: true }).click();
      await expect(dialog).toBeHidden();

      const row = page.getByTestId("session-roster-row").filter({ hasText: `Zelda ${last}` });
      await expect(row).toHaveCount(1, { timeout: 10000 });
      await expect(row.locator('input[type="checkbox"]')).toBeChecked();
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
      // ?view=sessions survives the reload.
      await page.reload();
      await selectSession(page, "2025-12-07");
      await expect(page.getByRole("checkbox", { name: "William Anderson" })).toBeChecked({ timeout: 10000 });
      await expect(page.getByRole("checkbox", { name: "Margaret Thompson" })).toBeChecked();
      await expect(page.getByRole("checkbox", { name: "George Thompson" })).not.toBeChecked();
      await expect(page.locator('[data-testid="session-present-count"]')).toHaveText("2 of 3 present");
    });

    test("prints a class roll sheet for the group", async () => {
      await openSeedMembers(page, SESSION_GROUP);
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
      await expect(page.getByTestId("command-palette-open")).toBeVisible({ timeout: 15000 });
    });

    test("roll sheet printed from a session shows that session's service time", async () => {
      await page.goto(`/groups/${NURSERY}?view=sessions&sessionId=${lateNurserySessionId}`);
      await page.evaluate(() => {
        window.open = ((url: string) => { (window as any).__rosterUrl = url; return null; }) as any;
      });
      await page.getByTestId("session-print-roster-button").click();
      const url: string = await page.evaluate(() => (window as any).__rosterUrl);
      await page.goto(url.replace("&autoprint=1", ""));
      await expect(page.locator("h1.roster-title")).toHaveText("Nursery (0-2)", { timeout: 15000 });
      await expect(page.locator(".roster-meta")).toContainText("10:30 AM Service");
      await page.goBack();
      await expect(page.getByTestId("command-palette-open")).toBeVisible({ timeout: 15000 });
    });

    test("prints a contact roster from the members tab", async () => {
      // The group record opens on the summary plate. The print button lives on the members tab.
      await openSeedMembers(page, SESSION_GROUP);
      await page.locator('[data-testid="print-roster-button"]').click();
      await expect(page.getByTestId("print-attendance-sheet")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("print-contact-roster")).toBeVisible();
      await page.keyboard.press("Escape");
      const groupId = new URL(page.url()).pathname.split("/").pop();

      await page.goto("/groups/print-roster?groupId=" + groupId + "&layout=contacts");
      await expect(page.locator("h1.roster-title")).toHaveText(SESSION_GROUP, { timeout: 10000 });
      await expect(page.locator(".roster-contacts th")).toHaveText(["Name", "Phone", "Email", "Address"]);
      // Leaders first, then by last name.
      const rows = page.getByTestId("roster-contact-row");
      await expect(rows.getByTestId("roster-member")).toHaveText(["William Anderson Leader", "George Thompson", "Margaret Thompson"]);
      await expect(rows.first().locator(".roster-leader")).toHaveText("Leader");
      await expect(rows.first().locator("td")).toHaveText(["William Anderson Leader", "(217) 555-1502", "william.anderson@email.com", "486 Pine Street, Springfield, IL 62702"]);
      await expect(page.locator(".roster-notes")).toHaveCount(0);

      // Opted-out members keep their name but not their contact details.
      await page.route("**/groupmembers?groupId=*", async (route) => {
        const members = await (await route.fetch()).json();
        for (const m of members) if (m.person?.name?.display === "George Thompson") m.person.optedOut = true;
        await route.fulfill({ json: members });
      });
      await page.reload();
      const george = rows.filter({ hasText: "George Thompson" });
      await expect(george.locator("td")).toHaveText(["George Thompson", "", "", ""], { timeout: 10000 });
      await page.unroute("**/groupmembers?groupId=*");

      await page.goBack();
      await expect(page.getByTestId("command-palette-open")).toBeVisible({ timeout: 15000 });
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
      const categoryInput = page.getByTestId("add-group-bar").locator("input").first();
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

      const editBtn = editGroupButton(page);
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
    await openSeedMembers(page);
    await expect(page.locator('[data-testid="send-message-button"]')).toBeVisible({ timeout: 10000 });
  });

  test("group detail page exposes a roster CSV download link", async ({ page }) => {
    await openSeedMembers(page);
    await expect(page.locator('a[download="groupmembers.csv"]')).toBeVisible({ timeout: 10000 });
  });

  test("clicking Send Message opens the message composer", async ({ page }) => {
    await openSeedMembers(page);
    await page.locator('[data-testid="send-message-button"]').click();
    await expect(page.locator("#groupMembersBox textarea").first()).toBeVisible({ timeout: 10000 });
  });

  test("promotes a group member to leader and back", async ({ page }) => {
    await openSeedMembers(page);

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

    await editGroupButton(page).first().click();
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

  test("Add Service Time select shows one dropdown arrow", async ({ page }) => {
    await page.goto("/groups/GRP00000007");
    await editGroupButton(page).first().click();
    const chooser = page.locator("#groupDetailsBox").locator(".MuiFormControl-root").filter({ has: page.locator('[data-cy="choose-service-time"]') });
    await expect(chooser).toBeVisible({ timeout: 10000 });
    await expect(chooser.locator(".MuiSelect-icon")).toHaveCount(1);
    await expect(chooser.getByText("arrow_drop_down", { exact: true })).toHaveCount(0);
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
    const editBtn = editGroupButton(page).first();
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
    const editBtn = editGroupButton(page).first();
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

// ChurchAppsSupport#1230: each roster sheet is headed with the church's logo when it has one.
loggedInTest("printed rosters show the church logo above the group name", async ({ page }) => {
  await mockChurchLogo(page);
  await page.goto("/groups/print-roster?serviceTimeId=SST00000004&date=2025-12-03");
  await expect(page.locator("h1.roster-title")).toHaveCount(5, { timeout: 15000 });
  const logos = page.getByTestId("roster-sheet").getByTestId("print-church-logo");
  await expect(logos).toHaveCount(5);
  await expect(logos.first()).toHaveAttribute("alt", "Grace Community Church");
  await expect(page.locator(".roster-church")).toHaveCount(5);
});

// ChurchAppsSupport#1336: session attendance saves the roster together, warns on leave mid-save, and fits a phone.
// Demo: SES00000001 is the Sunday Morning Service group's 9:00 AM session, with people already marked present.
loggedInTest.describe("Session attendance save and layout", () => {
  const SESSION_URL = "/groups/GRP00000001?view=sessions&sessionId=SES00000001";

  async function openSession(page: Page) {
    await page.goto(SESSION_URL);
    await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("session-attendance-status-button")).toBeVisible({ timeout: 10000 });
  }

  loggedInTest("warns before the tab closes while attendance is still saving", async ({ page }) => {
    await openSession(page);
    await expect(page.locator('input[type="checkbox"]:checked').first()).toBeVisible({ timeout: 10000 });

    // Hold every save request so the page stays on "Saving...".
    const held: Route[] = [];
    await page.route(/\/attendance\/visitsessions(\/log|\?sessionId=)/, (route) => {
      if (route.request().method() === "GET") return route.continue();
      held.push(route);
    });

    await page.getByTestId("attendance-select-none").click();
    await page.getByTestId("save-attendance-button").click();
    await expect(page.getByTestId("save-attendance-button")).toHaveText("Saving...", { timeout: 10000 });
    // The whole roster goes out at once rather than one person after another.
    await expect.poll(() => held.length, { timeout: 5000 }).toBeGreaterThan(1);

    const warned = await page.evaluate(() => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(warned).toBe(true);

    // Abort the held requests so the seeded attendance stays as it was.
    await Promise.all(held.map((r) => r.abort()));
  });

  loggedInTest.describe("phone width", () => {
    loggedInTest.use({ viewport: { width: 390, height: 844 } });

    loggedInTest("session card with a service time fits a 390px screen", async ({ page }) => {
      await openSession(page);
      await expect(page.getByTestId("session-print-all-rosters-button")).toBeVisible();
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(390);
    });
  });
});

// Both describes below grant a role to volunteer@b1.church, so they share one worker in order;
// otherwise the attendance role leaks into the names-only redirect checks.
plainTest.describe("Names-only volunteer roles", () => {
  plainTest.describe.configure({ mode: "default" });

  // ChurchAppsSupport#1284: a user whose only people permission is View Names cannot open the All groups list or print every class.
  plainTest.describe("View People Names Only", () => {
    plainTest.use({ storageState: { cookies: [], origins: [] } });
    // volunteer@b1.church is a plain member (not the leader) of Greeters Ministry.
    const GREETERS = "GRP00000025";
    const apiBase = process.env.API_BASE || "http://localhost:8084";
    let roleId = "";
    let sessionId = "";
    let eventId = "";

    const adminContext = async () => {
      const ctx = await request.newContext();
      const login = await (await ctx.post(`${apiBase}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
      const jwt = login.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
      return { ctx, auth: { headers: { Authorization: "Bearer " + jwt } } };
    };

    plainTest.beforeAll(async () => {
      roleId = await createNamesOnlyRole("Issue 1284 Names Only (groups)");
      const { ctx, auth } = await adminContext();
      const sessions = await (await ctx.post(`${apiBase}/attendance/sessions`, { ...auth, data: [{ groupId: GREETERS, sessionDate: "2026-01-04T12:00:00" }] })).json();
      sessionId = sessions[0].id;
      const start = new Date(Date.now() + 7 * 86400000);
      const end = new Date(start.getTime() + 3600000);
      const events = await (await ctx.post(`${apiBase}/content/events`, { ...auth, data: [{ groupId: GREETERS, title: "E2E 1287 Event", start, end, allDay: false, visibility: "public" }] })).json();
      eventId = events[0].id;
      await ctx.dispose();
    });

    plainTest.afterAll(async () => {
      const { ctx, auth } = await adminContext();
      if (sessionId) await ctx.delete(`${apiBase}/attendance/sessions/${sessionId}`, auth);
      if (eventId) await ctx.delete(`${apiBase}/content/events/${eventId}`, auth);
      await ctx.dispose();
      await deleteRole(roleId);
    });

    plainTest("groups list redirects home and print all classes prints nothing", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto("/groups");
      await page.waitForURL((url) => url.pathname === "/", { timeout: 15000 });
      await expect(page.getByTestId("home-my-groups")).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("groups-search")).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe("/");

      await page.goto("/groups/print-roster?serviceTimeId=SST00000004&date=2025-12-03");
      await expect(page.getByText("No classes found to print.")).toBeVisible({ timeout: 15000 });
      await expect(page.locator("h1.roster-title")).toHaveCount(0);
    });

    plainTest("member group hides roster print and event delete", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto(`/groups/${GREETERS}?view=sessions`);
      await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("session-print-roster-button")).toHaveCount(0);

      await page.goto(`/groups/${GREETERS}?view=members`);
      await expect(page.locator("#groupMembersBox")).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("print-roster-button")).toHaveCount(0);

      await page.goto(`/groups/${GREETERS}?view=calendar`);
      await expect(page.getByRole("cell", { name: "E2E 1287 Event", exact: true })).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId(`delete-event-${eventId}`)).toHaveCount(0);

      await page.goto(`/groups/print-roster?groupId=${GREETERS}`);
      await expect(page.getByText("No classes found to print.")).toBeVisible({ timeout: 15000 });
      await expect(page.locator("h1.roster-title")).toHaveCount(0);
    });

    plainTest("group page hides Email and the email templates page redirects home", async ({ page }) => {
      await loginAsVolunteer(page);
      await page.goto(`/groups/${GREETERS}`);
      await expect(page.getByRole("heading", { name: "Greeters Ministry" })).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("email-group-button")).toHaveCount(0);

      await page.goto("/settings/email-templates");
      await page.waitForURL((url) => url.pathname === "/", { timeout: 15000 });
    });
  });

  // ChurchAppsSupport#1308: View People Names Only plus attendance View/Edit is enough to
  // open Groups and record attendance. Full profiles stay closed.
  plainTest.describe("View People Names Only with attendance", () => {
    plainTest.use({ storageState: { cookies: [], origins: [] } });

    const API = process.env.API_BASE || "http://localhost:8084";
    const NURSERY = "GRP00000007";
    const OLIVIA = "PER00000029";
    let roleId = "";
    let sessionId = "";
    let visitorId = "";

    const admin = async () => {
      const ctx = await request.newContext();
      const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
      const jwt = login.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
      return { ctx, auth: { headers: { Authorization: "Bearer " + jwt } } };
    };

    plainTest.beforeAll(async () => {
      roleId = await createLimitedRole("Issue 1308 Attendance", [
        { apiName: "MembershipApi", contentType: "People", action: "View Names" },
        { apiName: "AttendanceApi", contentType: "Attendance", action: "View" },
        { apiName: "AttendanceApi", contentType: "Attendance", action: "Edit" }
      ]);
      const { ctx, auth } = await admin();
      const sessions = await (await ctx.post(`${API}/attendance/sessions`, { ...auth, data: [{ groupId: NURSERY, sessionDate: "2026-10-20T15:00:00" }] })).json();
      sessionId = sessions[0].id;
      const people = await (await ctx.post(`${API}/membership/people`, {
        ...auth,
        data: [{ name: { first: "Zacchaeus", last: "Attendance" }, membershipStatus: "Visitor", contactInfo: { email: "zacchaeus.attendance@example.com" } }]
      })).json();
      visitorId = people[0].id;
      await ctx.dispose();
    });

    plainTest.afterAll(async () => {
      const { ctx, auth } = await admin();
      if (sessionId) await ctx.delete(`${API}/attendance/sessions/${sessionId}`, auth);
      if (visitorId) await ctx.delete(`${API}/membership/people/${visitorId}`, auth);
      await ctx.dispose();
      await deleteRole(roleId);
    });

    plainTest("names-only attendance taker opens the nursery and logs attendance without a profile", async ({ page }) => {
      await loginAsVolunteer(page);

      // The header search bar is the menu. People opens Groups for this role.
      await openPrimaryNav(page);
      const palette = page.getByTestId("command-palette");
      await palette.getByRole("textbox").fill("People");
      const people = palette.getByRole("button", { name: "People", exact: true }).first();
      await expect(people).toBeVisible();
      await people.click();
      await expect(page).toHaveURL(/\/groups\/?$/, { timeout: 15000 });
      await expect(page.getByTestId("groups-search")).toBeVisible();
      const search = page.getByTestId("groups-search").locator("input");
      await search.fill("Care");
      await expect(page.getByRole("link", { name: "Care & Recovery" })).toHaveCount(0);
      await search.fill("Nursery");
      await page.getByRole("link", { name: "Nursery (0-2)" }).click();
      await page.waitForURL(new RegExp(`/groups/${NURSERY}`), { timeout: 15000 });

      await page.goto(`/groups/${NURSERY}?view=sessions&sessionId=${sessionId}`);
      const olivia = page.locator('[data-testid="session-roster-row"]').filter({ hasText: "Olivia Davis" });
      await expect(olivia).toBeVisible({ timeout: 15000 });
      await expect(olivia.locator("a")).toHaveCount(0);
      await expect(page.getByText("258 Elm Street")).toHaveCount(0);
      await expect(page.getByText("zacchaeus.attendance@example.com")).toHaveCount(0);

      await page.getByTestId("person-search-input").locator("input").fill("Zacchaeus Attendance");
      await page.getByTestId("search-button").click();
      await page.getByTestId(`add-person-button-${visitorId}`).click();
      const visitor = page.locator('[data-testid="session-roster-row"]').filter({ hasText: "Zacchaeus Attendance" });
      await expect(visitor).toBeVisible({ timeout: 10000 });

      await olivia.getByRole("checkbox", { name: "Olivia Davis" }).check();
      await page.getByTestId("save-attendance-button").click();
      await expect(page.getByTestId("attendance-save-message")).toHaveText("Attendance saved.", { timeout: 15000 });

      await page.reload();
      await expect(olivia).toBeVisible({ timeout: 15000 });
      await expect(olivia.getByRole("checkbox", { name: "Olivia Davis" })).toBeChecked();
      await expect(visitor).toBeVisible({ timeout: 15000 });
      await expect(visitor.getByRole("checkbox", { name: "Zacchaeus Attendance" })).toBeChecked();
      await expect(page.getByText("zacchaeus.attendance@example.com")).toHaveCount(0);

      await page.goto(`/people/${OLIVIA}`);
      await page.waitForURL((url) => url.pathname === "/", { timeout: 15000 });
      await expect(page.getByText("258 Elm Street")).toHaveCount(0);
      await expect(page.getByText("Olivia Davis")).toHaveCount(0);
    });
  });
});
