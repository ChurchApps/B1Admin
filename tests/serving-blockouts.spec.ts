import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Block-out dates entered by staff on a serving team's page, and the "Unavailable" flag beside a
// blocked-out volunteer wherever they get scheduled: the plan's position list, the picker and the
// plan type overview grid.
const API = process.env.API_BASE || "http://localhost:8084";
const MINISTRY = "GRP0000000a";
const BAND_TEAM = "GRP0000000b";
const EMILY_DAVIS = "PER00000028";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

// Three weeks out keeps the plan inside the overview's default 12-week window.
const serviceDay = () => {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

test.describe("serving team block-out dates", () => {
  test.describe.configure({ mode: "serial" });

  const day = serviceDay();
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let planId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };
    const planRes = await ctx.post(`${API}/doing/plans`, { ...auth, data: [{ name: "Blockouts Plan", serviceDate: day, ministryId: MINISTRY, planTypeId: "PLT00000001", prepared: false }] });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;
    const posRes = await ctx.post(`${API}/doing/positions`, {
      ...auth,
      data: [
        { planId, categoryName: "Blockouts", name: "Blockout Keys", count: 1, groupId: BAND_TEAM },
        { planId, categoryName: "Blockouts", name: "Blockout Vocals", count: 1, groupId: BAND_TEAM }
      ]
    });
    expect(posRes.ok()).toBeTruthy();
    const [keys] = await posRes.json();
    const assignRes = await ctx.post(`${API}/doing/assignments`, { ...auth, data: [{ positionId: keys.id, personId: EMILY_DAVIS, status: "Accepted" }] });
    expect(assignRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    const res = await ctx.get(`${API}/doing/blockoutDates/upcoming`, auth);
    const mine = ((await res.json()) as any[]).filter((b) => b.personId === EMILY_DAVIS);
    for (const b of mine) await ctx.delete(`${API}/doing/blockoutDates/${b.id}`, auth);
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, auth);
    await ctx.dispose();
  });

  test("staff add a block-out for a team member from the team page", async ({ page }) => {
    await page.goto(`/groups/${BAND_TEAM}`);
    const card = page.getByTestId("team-blockouts");
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.getByTestId("team-blockouts-add").click();
    const dialog = page.getByTestId("team-blockout-dialog");
    await dialog.getByTestId("team-blockout-member").getByRole("combobox").click();
    await page.getByRole("option", { name: "Emily Davis" }).click();
    await dialog.getByTestId("team-blockout-start").fill(day);
    await dialog.getByTestId("team-blockout-end").fill(day);
    await dialog.getByTestId("team-blockout-save").click();
    await expect(dialog).toBeHidden();
    await expect(card.getByTestId("team-blockout-" + EMILY_DAVIS)).toContainText("Emily Davis");
  });

  test("the plan's position list and picker flag the blocked-out volunteer", async ({ page }) => {
    await page.goto(`/serving/plans/${planId}/team`);
    const keysRow = page.getByRole("row").filter({ hasText: "Blockout Keys" });
    await expect(keysRow).toContainText("Emily Davis", { timeout: 30000 });
    await expect(keysRow.getByTestId("unavailable-badge")).toContainText("Unavailable");

    const vocalsRow = page.getByRole("row").filter({ hasText: "Blockout Vocals" });
    await vocalsRow.getByRole("button", { name: "1 Person Needed" }).click();
    const picker = page.getByTestId("assignment-dialog");
    const emily = picker.getByRole("row").filter({ hasText: "Emily Davis" });
    await expect(emily.getByTestId("unavailable-badge")).toBeVisible({ timeout: 10000 });
    await expect(picker.getByRole("row").filter({ hasText: "Mary Smith" }).getByTestId("unavailable-badge")).toHaveCount(0);
  });

  test("the overview grid flags the blocked-out volunteer in the cell", async ({ page }) => {
    await page.goto(`/serving/overview?ministryId=${MINISTRY}`);
    const cell = page.getByTestId(`matrix-cell-Blockouts: Blockout Keys-${day}`);
    await expect(cell).toContainText("Emily D.", { timeout: 15000 });
    await expect(cell.getByTestId("unavailable-badge")).toBeVisible();
  });
});
