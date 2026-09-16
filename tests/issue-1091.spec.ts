import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1091: a directoryVisibility settings row stored with public = 0 stayed private after
// saving Portal settings, because handleSave reused the loaded row and only overwrote .value.
// The admin form (unfiltered /settings) showed the saved tier while the public settings
// endpoint the directory gate reads never returned it.
const API = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("issue-1091 Show in Directory saves as a public setting", () => {
  let ctx: APIRequestContext;
  let jwt: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const auth = { headers: { Authorization: "Bearer " + jwt } };
    const all = await (await ctx.get(`${API}/membership/settings`, auth)).json();
    const existing = (all as any[]).find(s => s.keyName === "directoryVisibility");
    const row = { ...(existing || {}), churchId: CHURCH_ID, keyName: "directoryVisibility", value: "Members", public: 0 };
    const res = await ctx.post(`${API}/membership/settings`, { ...auth, data: [row] });
    expect(res.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test("saving Regular Attendees is visible to the public settings endpoint", async ({ page }) => {
    await page.goto("/mobile/b1-mobile");
    const select = page.getByLabel("Show in Directory", { exact: true });
    await expect(select).toContainText("Members & Staff", { timeout: 15000 });
    await select.click();
    await page.getByRole("option", { name: "Regular Attendees & Above" }).click();

    const saved = page.waitForResponse(r => r.url().includes("/membership/settings") && r.request().method() === "POST");
    await page.getByRole("button", { name: /^Save$/ }).click();
    expect((await saved).ok()).toBeTruthy();

    const pub = await (await ctx.get(`${API}/membership/settings/public/${CHURCH_ID}`)).json();
    expect(pub.directoryVisibility).toBe("Regular Attendees");
  });
});
