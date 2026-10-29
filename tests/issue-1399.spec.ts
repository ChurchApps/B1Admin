import { test, expect, request, type Page } from "@playwright/test";
import { createLimitedRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

const API_BASE = process.env.API_BASE || "http://localhost:8084";

// ChurchAppsSupport#1399: a volunteer who can view attendance but not edit services should not be offered Setup.
test.describe("Attendance Setup needs Edit Services", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  let roleId = "";
  test.beforeAll(async () => {
    roleId = await createLimitedRole("Issue 1399 Attendance View", [
      { apiName: "MembershipApi", contentType: "People", action: "View Names" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "View" },
      { apiName: "AttendanceApi", contentType: "Attendance", action: "Checkin" }
    ]);
  });
  test.afterAll(async () => { await deleteRole(roleId); });

  test("View Attendance without Edit Services hides Setup", async ({ page }) => {
    await loginAsVolunteer(page);
    await page.goto("/attendance");
    await expect(page.getByTestId("attendance-verb-years")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("attendance-verb-setup")).toHaveCount(0);
  });
});

// ChurchAppsSupport#1399: Upcoming events can be shown as one row that scrolls by itself, like the Verse of the Day week.
test.describe.serial("Upcoming events scrolling layout", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    const jwt = (await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt;
    const auth = { headers: { Authorization: "Bearer " + jwt } };
    const element = await (await ctx.get(`${API_BASE}/content/elements/ELE00000054`, auth)).json();
    const { layout: _layout, display: _display, ...answers } = JSON.parse(element.answersJSON || "{}");
    await ctx.post(`${API_BASE}/content/elements`, { ...auth, data: [{ ...element, answersJSON: JSON.stringify(answers) }] });
    await ctx.dispose();
    await page?.context().close();
  });

  const openCalendarElement = async () => {
    const wrapper = page.locator('div[data-element-id="ELE00000054"]');
    await expect(wrapper).toBeVisible({ timeout: 20000 });
    await wrapper.click({ position: { x: 5, y: 5 } });
    const select = page.locator('[data-testid="calendar-display-select"]');
    await expect(select).toBeVisible({ timeout: 10000 });
    return select;
  };

  test("offers a scrolling layout for Upcoming events and saves it", async () => {
    await page.goto("/site/pages/PAG00000004");
    const display = await openCalendarElement();
    await display.click();
    await page.getByRole("option", { name: "Upcoming events" }).click();
    const layout = page.locator('[data-testid="calendar-layout-select"]');
    await expect(layout).toContainText("Grid");
    await layout.click();
    await page.getByRole("option", { name: "Scrolling (automatic)" }).click();
    const elementPost = page.waitForResponse((r) => r.url().includes("/content/elements") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    const answers = JSON.parse((await elementPost).request().postDataJSON()[0].answersJSON);
    expect(answers).toMatchObject({ display: "upcoming", layout: "autoscroll" });
  });
});
