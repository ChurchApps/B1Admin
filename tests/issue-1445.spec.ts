import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000030";
const DONALD_ID = "PER00000080"; // Donald Clark
const DEMO_ID = "PER00000082"; // Demo User
const ALEX_ID = "PER00000084"; // Alex User, Demo User's household

// ChurchAppsSupport#1445: member-site sign-ups on events without attendee types were saved without the
// registrant in members, so the roster showed the raw person id, counted 0 people, and the tally counted sign-ups.
test.describe.serial("Registrations roster names the registrant (#1445)", () => {
  let staffJwt: string;
  let eventId: string;
  const regIds: string[] = [];

  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const body = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    staffJwt = ((body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0])?.jwt;
    const auth = { headers: { Authorization: "Bearer " + staffJwt } };
    const start = new Date();
    start.setDate(start.getDate() + 14);
    start.setHours(11, 0, 0, 0);
    const end = new Date(start);
    end.setHours(13, 0, 0, 0);
    const events = await (await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ groupId: GROUP_ID, title: "Issue 1445 Stewardship Lunch", start, end, allDay: false, visibility: "public", registrationEnabled: true, capacity: 20 }] })).json();
    eventId = events[0].id;
    // The shapes the member site saved before the fix: a lone registrant with no members, and one with only the extra member.
    for (const data of [
      { churchId: CHURCH_ID, eventId, personId: DONALD_ID },
      { churchId: CHURCH_ID, eventId, personId: DEMO_ID, members: [{ personId: ALEX_ID, firstName: "Alex", lastName: "User" }] }
    ]) {
      const res = await ctx.post(`${API_BASE}/content/registrations/register`, { ...auth, data });
      expect(res.ok()).toBeTruthy();
      regIds.push((await res.json()).id);
    }
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    const auth = { headers: { Authorization: "Bearer " + staffJwt } };
    for (const id of regIds) await ctx.delete(`${API_BASE}/content/registrations/${id}`, auth).catch(() => { });
    if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth).catch(() => { });
    await ctx.dispose();
  });

  test("shows the registrant's name, counts them as a member, and tallies people", async ({ page }) => {
    await page.goto(`/registrations/${eventId}`);
    const rows = page.getByTestId("registration-row");
    await expect(rows).toHaveCount(2, { timeout: 20000 });
    const donald = rows.filter({ hasText: "Donald Clark" });
    await expect(donald).toHaveCount(1, { timeout: 15000 });
    await expect(donald.locator("td").nth(1)).toHaveText("1");
    const demo = rows.filter({ hasText: "Demo User" });
    await expect(demo.locator("td").nth(0)).toHaveText("Demo User, Alex User");
    await expect(demo.locator("td").nth(1)).toHaveText("2");
    await expect(page.getByTestId("registration-capacity")).toContainText("3 / 20");
  });
});
