import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Assign Position picker: each team member's last-served date, a "Serving that day" flag for anyone
// already on a plan that day, and free people listed first, least recently served first.
const API = process.env.API_BASE || "http://localhost:8084";
const MINISTRY = "GRP0000000a";
const BAND_TEAM = "GRP0000000b";
const REBECCA_JONES = "PER00000017";
const LAURA_LOPEZ = "PER00000043";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return uc.jwt as string;
}

const dayFromToday = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

test.describe("serving picker last served and same-day conflicts", () => {
  test.describe.configure({ mode: "serial" });

  const day = dayFromToday(35);
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  const planIds: string[] = [];
  let planId: string;

  async function addPlan(name: string, serviceDate: string, positionName: string, personId?: string) {
    const planRes = await ctx.post(`${API}/doing/plans`, { ...auth, data: [{ name, serviceDate, ministryId: MINISTRY, planTypeId: "PLT00000001", prepared: false }] });
    expect(planRes.ok()).toBeTruthy();
    const id = (await planRes.json())[0].id as string;
    planIds.push(id);
    const posRes = await ctx.post(`${API}/doing/positions`, { ...auth, data: [{ planId: id, categoryName: "Picker", name: positionName, count: 1, groupId: BAND_TEAM }] });
    expect(posRes.ok()).toBeTruthy();
    const [position] = await posRes.json();
    if (personId) {
      const assignRes = await ctx.post(`${API}/doing/assignments`, { ...auth, data: [{ positionId: position.id, personId, status: "Accepted" }] });
      expect(assignRes.ok()).toBeTruthy();
    }
    return id;
  }

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };
    planId = await addPlan("Picker Morning", day, "Picker Keys");
    await addPlan("Picker Evening", day, "Picker Vocals", LAURA_LOPEZ);
    await addPlan("Picker Last Week", dayFromToday(-7), "Picker Bass", REBECCA_JONES);
  });

  test.afterAll(async () => {
    for (const id of planIds) await ctx.delete(`${API}/doing/plans/${id}`, auth);
    await ctx.dispose();
  });

  test("the picker shows last served, flags same-day serving, and lists free people first", async ({ page }) => {
    await page.goto(`/serving/plans/${planId}/team`);
    const keysRow = page.getByRole("row").filter({ hasText: "Picker Keys" });
    await keysRow.getByRole("button", { name: "1 Person Needed" }).click({ timeout: 30000 });
    const picker = page.getByTestId("assignment-dialog");

    const laura = picker.getByRole("row").filter({ hasText: "Laura Lopez" });
    await expect(laura.getByTestId("serving-that-day-badge")).toContainText("Serving that day", { timeout: 15000 });
    await expect(picker.getByTestId("last-served-" + REBECCA_JONES)).toContainText("Last served");
    await expect(picker.getByRole("row").filter({ hasText: "Rebecca Jones" }).getByTestId("serving-that-day-badge")).toHaveCount(0);

    const names = await picker.getByRole("row").allTextContents();
    const lauraAt = names.findIndex((t) => t.includes("Laura Lopez"));
    const rebeccaAt = names.findIndex((t) => t.includes("Rebecca Jones"));
    expect(rebeccaAt).toBeGreaterThanOrEqual(0);
    expect(lauraAt).toBeGreaterThan(rebeccaAt);
  });
});
