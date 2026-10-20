import { request, test as plainTest, expect } from "@playwright/test";
import { createLimitedRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";
import { openPrimaryNav } from "./helpers/navigation";

// ChurchAppsSupport#1308: View People Names Only plus attendance View/Edit is enough to
// open Groups and record attendance. Full profiles stay closed.
plainTest.describe("issue 1308 names-only attendance", () => {
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
