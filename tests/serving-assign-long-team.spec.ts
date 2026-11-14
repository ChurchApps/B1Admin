import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1568: the Assign Position dialog listed a large team inside a FormCard
// (overflow: hidden) in a height-capped Dialog, so the bottom names and the Done button were
// clipped with no scroll bar and no way to find a member by name.
const API = process.env.API_BASE || "http://localhost:8084";
const MINISTRY = "GRP0000000a";
const TEAM_SIZE = 30;

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("assigning a position from a large team", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 1024, height: 768 } });

  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let planId: string;
  let teamId: string;
  let lastName: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };
    const groupRes = await ctx.post(`${API}/membership/groups`, { ...auth, data: [{ name: "Long Team Spec", categoryName: "Long Team Spec", tags: "team" }] });
    expect(groupRes.ok()).toBeTruthy();
    teamId = (await groupRes.json())[0].id;

    const people = ((await (await ctx.get(`${API}/membership/people`, auth)).json()) as any[])
      .filter((p) => p.name?.display)
      .sort((a, b) => a.name.display.localeCompare(b.name.display))
      .slice(0, TEAM_SIZE);
    expect(people.length).toBe(TEAM_SIZE);
    const gmRes = await ctx.post(`${API}/membership/groupmembers`, { ...auth, data: people.map((p) => ({ groupId: teamId, personId: p.id })) });
    expect(gmRes.ok()).toBeTruthy();
    const members = (await (await ctx.get(`${API}/membership/groupmembers?groupId=${teamId}`, auth)).json()) as any[];
    lastName = members[members.length - 1].person.name.display;

    const planRes = await ctx.post(`${API}/doing/plans`, { ...auth, data: [{ name: "Long Team Plan", serviceDate: new Date().toISOString().slice(0, 10), ministryId: MINISTRY, planTypeId: "PLT00000001", prepared: false }] });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;
    const posRes = await ctx.post(`${API}/doing/positions`, { ...auth, data: [{ planId, categoryName: "Long Team", name: "Long Team Usher", count: 1, groupId: teamId }] });
    expect(posRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, auth);
    if (teamId) await ctx.delete(`${API}/membership/groups/${teamId}`, auth);
    await ctx.dispose();
  });

  const openPicker = async (page: import("@playwright/test").Page) => {
    await page.goto(`/serving/plans/${planId}/team`);
    const row = page.getByRole("row").filter({ hasText: "Long Team Usher" });
    await row.getByRole("button", { name: /needed/i }).click();
    const picker = page.getByTestId("assignment-dialog");
    await expect(picker.getByRole("row").first()).toBeVisible({ timeout: 15000 });
    return picker;
  };

  test("the last team member and the Done button can be reached", async ({ page }) => {
    const picker = await openPicker(page);
    await expect(picker.getByRole("button", { name: "Done" })).toBeInViewport();
    const last = picker.getByRole("button", { name: lastName, exact: true });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await expect(picker.getByRole("button", { name: "Done" })).toBeInViewport();
  });

  test("typing a name narrows the team list", async ({ page }) => {
    const picker = await openPicker(page);
    await picker.getByLabel("Search team").fill(lastName);
    const rows = picker.getByRole("row");
    await expect(rows).toHaveCount(1);
    await rows.getByRole("button", { name: lastName, exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: "Long Team Usher" }).getByRole("button", { name: lastName })).toBeVisible({ timeout: 15000 });
  });
});
