import { test, expect, request } from "@playwright/test";
import { createNamesOnlyRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";

// #1287: a View People Names Only user (volunteer@b1.church, a plain member of Greeters Ministry)
// must not open the Sunday plan, print the group roster, or see Delete on group events.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const GROUP_ID = "GRP00000025";

const adminContext = async () => {
  const ctx = await request.newContext();
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
  return { ctx, auth: { headers: { Authorization: "Bearer " + jwt } } };
};

test.describe("View People Names Only (#1287)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  let roleId = "";
  let sessionId = "";
  let eventId = "";

  test.beforeAll(async () => {
    roleId = await createNamesOnlyRole("Issue 1287 Names Only");
    const { ctx, auth } = await adminContext();
    const sessions = await (await ctx.post(`${API_BASE}/attendance/sessions`, { ...auth, data: [{ groupId: GROUP_ID, sessionDate: "2026-01-04T12:00:00" }] })).json();
    sessionId = sessions[0].id;
    const start = new Date(Date.now() + 7 * 86400000);
    const end = new Date(start.getTime() + 3600000);
    const events = await (await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title: "E2E 1287 Event", start, end, allDay: false, visibility: "public" }] })).json();
    eventId = events[0].id;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const { ctx, auth } = await adminContext();
    if (sessionId) await ctx.delete(`${API_BASE}/attendance/sessions/${sessionId}`, auth);
    if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth);
    await ctx.dispose();
    await deleteRole(roleId);
  });

  test("hides the plan link, roster print and event delete", async ({ page }) => {
    // On a Sunday the card only looks at today; reset-demo seeds plans from tomorrow on, so look from one day ahead.
    await page.clock.setFixedTime(new Date(Date.now() + 86400000));
    await loginAsVolunteer(page);
    const sermon = page.locator('[data-testid="sunday-home"] h1.om-sermon');
    // Wait for the demo plan (Upcoming Worship Schedule / Lessons.church Test Plan) to replace the "This Sunday" placeholder.
    await expect(sermon).toHaveText(/Schedule|Plan/, { timeout: 15000 });
    await expect(sermon.locator("a")).toHaveCount(0);

    await page.goto(`/groups/${GROUP_ID}?view=sessions`);
    await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("session-print-roster-button")).toHaveCount(0);

    await page.goto(`/groups/${GROUP_ID}?view=members`);
    await expect(page.locator("#groupMembersBox")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("print-roster-button")).toHaveCount(0);

    await page.goto(`/groups/${GROUP_ID}?view=calendar`);
    await expect(page.getByRole("cell", { name: "E2E 1287 Event", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId(`delete-event-${eventId}`)).toHaveCount(0);

    await page.goto(`/groups/print-roster?groupId=${GROUP_ID}`);
    await expect(page.getByText("No classes found to print.")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("h1.roster-title")).toHaveCount(0);
  });
});
