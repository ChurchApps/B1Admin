import { test, expect, request } from "@playwright/test";

// #1284: a user whose only people permission is "View Names" should not be offered All groups or Attendance setup.
const API_BASE = process.env.API_BASE || "http://localhost:8084";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("View People Names Only role", () => {
  let roleId = "";

  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
    const auth = { headers: { Authorization: "Bearer " + jwt } };
    const roles = await (await ctx.post(`${API_BASE}/membership/roles`, { ...auth, data: [{ name: "Issue 1284 Names Only" }] })).json();
    roleId = roles[0].id;
    await ctx.post(`${API_BASE}/membership/rolepermissions`, { ...auth, data: [{ roleId, apiName: "MembershipApi", contentType: "People", action: "View Names" }] });
    await ctx.post(`${API_BASE}/membership/rolemembers`, { ...auth, data: [{ roleId, userId: "USR00000010" }] });
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
    if (roleId) await ctx.delete(`${API_BASE}/membership/roles/${roleId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("dashboard and attendance hide All groups and Setup", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("volunteer@b1.church");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');
    await page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first().click({ timeout: 15000 });
    await page.getByTestId("command-palette-open").waitFor({ state: "visible", timeout: 30000 });

    const myGroups = page.getByTestId("home-my-groups");
    await expect(myGroups).toBeVisible({ timeout: 15000 });
    await expect(myGroups.getByRole("link", { name: "All groups" })).toHaveCount(0);

    await page.goto("/attendance");
    await expect(page.getByTestId("attendance-record")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("attendance-verb-setup")).toHaveCount(0);
  });
});
