import { test as plainTest, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { openPrimaryNav } from "./helpers/navigation";
import { createNamesOnlyRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";
import { personAddButton } from "./helpers/fixtures";

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
      const selectBtn = personAddButton(page, "Demo User");
      await selectBtn.click();
      await page.locator('[data-testid="content-picker-done"]').click();

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

// ChurchAppsSupport#1598: a church that worships on Saturday sees Saturday on the dashboard, not Sunday.
// The worship day, plans and attendance are answered in the browser so the shared demo church is untouched.
test.describe("Worship day", () => {
  const SATURDAY = 6;
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthDay = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const mockSaturdayChurch = async (page: Page, visitsOn?: string) => {
    await page.route("**/settings/public/**", async (route) => {
      const response = await route.fetch();
      const settings = await response.json();
      await route.fulfill({ response, json: { ...settings, worshipDay: String(SATURDAY) } });
    });
    await page.route(/\/doing\/plans(\/presenter)?(\?.*)?$/, (route) => route.fulfill({ json: [] }));
    await page.route(/\/attendancerecords\/search\?/, (route) => {
      const hit = !!visitsOn && route.request().url().includes(`startDate=${visitsOn}`);
      return route.fulfill({ json: hit ? [{ personId: "PER00000080", checkinType: "member" }] : [] });
    });
    await page.route(/\/attendancerecords\/groups\?/, (route) => route.fulfill({ json: [] }));
    await page.route(/\/attendance\/headcounts$/, (route) => route.fulfill({ json: [] }));
  };

  test("a Saturday church sees the coming Saturday through the week", async ({ page }) => {
    const now = new Date();
    // Through the week means any day but Saturday; on a Saturday look from the Friday before.
    if (now.getDay() === SATURDAY) {
      now.setDate(now.getDate() - 1);
      await page.clock.setFixedTime(now);
    }
    const coming = new Date(now);
    coming.setDate(now.getDate() + ((SATURDAY - now.getDay() + 7) % 7));
    await mockSaturdayChurch(page);
    await page.goto("/");

    const home = page.getByTestId("sunday-home");
    await expect(home.locator("h1.om-sermon")).toHaveText("This Saturday", { timeout: 15000 });
    await expect(home.locator(".om-eyebrow").first()).toHaveText(new RegExp(`^Saturday · ${monthDay(coming)}`));
    await expect(page.getByTestId("sunday-live-hint")).toContainText("Who was in the room last Saturday");
  });

  test("Saturday check-ins go live on Saturday", async ({ page }) => {
    const saturday = new Date();
    saturday.setDate(saturday.getDate() - ((saturday.getDay() - SATURDAY + 7) % 7));
    saturday.setHours(10, 0, 0, 0);
    await page.clock.setFixedTime(saturday);
    await mockSaturdayChurch(page, ymd(saturday));
    await page.goto("/");

    const home = page.getByTestId("sunday-home");
    await expect(home.locator("h1.om-sermon")).toHaveText("This Saturday", { timeout: 15000 });
    await expect(home.locator(".om-pulse")).toContainText("Live", { timeout: 15000 });
    await expect(home.locator(".om-in-room")).toContainText("1");
  });
});

// Holds matching API requests until release() is called, so the page stays in its loading state.
const holdRequests = async (page: Page, pattern: RegExp) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(pattern, async (route) => { await gate; await route.continue().catch(() => {}); });
  return () => release();
};

// ChurchAppsSupport#1341: the home page said "No service planned this week." and "You're not in any groups yet." while still loading.
test.describe("Home page loading states", () => {
  test("home page shows loading, not empty, while its cards load", async ({ page }) => {
    const release = await holdRequests(page, /\/(plans\/presenter|groupmembers\?personId=)/);
    await page.goto("/");
    await expect(page.getByTestId("sunday-home")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("home-my-groups")).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId("sunday-loading")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("my-groups-loading")).toBeVisible();
    await expect(page.getByText("No service planned this week.")).toHaveCount(0);
    await expect(page.getByText("You're not in any groups yet.")).toHaveCount(0);

    release();
    await expect(page.getByTestId("sunday-loading")).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByTestId("my-groups-loading")).toHaveCount(0, { timeout: 15000 });
  });
});

// ChurchAppsSupport#1284: a user whose only people permission is View Names is not offered All groups, People, or Attendance.
test.describe("Needs attention", () => {
  test("one pending approval and one join request read in the singular", async ({ page }) => {
    await page.route("**/events/pending", (route) => route.fulfill({ json: [{ id: "e1", title: "Pending event" }] }));
    await page.route("**/eventBookings/pending", (route) => route.fulfill({ json: [] }));
    await page.route("**/groupjoinrequests/pending", (route) => route.fulfill({ json: [{ id: "r1" }] }));
    await page.goto("/");
    const card = page.getByTestId("needs-attention");
    await expect(card).toContainText("1 pending calendar approval", { timeout: 15000 });
    await expect(card).toContainText("1 pending group join request");
    await expect(card).not.toContainText("approvals");
    await expect(card).not.toContainText("requests");
  });

  test("open giving batches link to Batches; closed and the online batch do not count", async ({ page }) => {
    await page.route("**/events/pending", (route) => route.fulfill({ json: [] }));
    await page.route("**/eventBookings/pending", (route) => route.fulfill({ json: [] }));
    await page.route("**/groupjoinrequests/pending", (route) => route.fulfill({ json: [] }));
    await page.route(/\/donationbatches$/, (route) => route.fulfill({
      json: [
        { id: "B1", name: "Sunday cash", status: "open" },
        { id: "B2", name: "Midweek", status: "open" },
        { id: "B3", name: "Last month", status: "closed" },
        { id: "B4", name: "Online Donation", status: "open" }
      ]
    }));
    await page.goto("/");
    const card = page.getByTestId("needs-attention");
    await expect(card).toContainText("2 open giving batches", { timeout: 15000 });
    await card.getByText("2 open giving batches").click();
    await expect(page).toHaveURL(/\/donations\/batches$/);
  });
});

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
