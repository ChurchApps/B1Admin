import { request, type Page } from "@playwright/test";

// A role that grants only MembershipApi / People / View Names, given to volunteer@b1.church (USR00000010).
// Specs using it must run with an empty storageState so the admin session is not reused.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const VOLUNTEER_USER_ID = "USR00000010";

const adminAuth = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
  return { headers: { Authorization: "Bearer " + jwt } };
};

export async function createNamesOnlyRole(name: string): Promise<string> {
  return createLimitedRole(name, [{ apiName: "MembershipApi", contentType: "People", action: "View Names" }]);
}

export async function createLimitedRole(name: string, permissions: { apiName: string; contentType: string; action: string }[]): Promise<string> {
  const ctx = await request.newContext();
  const auth = await adminAuth(ctx);
  const roles = await (await ctx.post(`${API_BASE}/membership/roles`, { ...auth, data: [{ name }] })).json();
  const roleId = roles[0].id as string;
  await ctx.post(`${API_BASE}/membership/rolepermissions`, {
    ...auth,
    data: permissions.map((p) => ({ roleId, apiName: p.apiName, contentType: p.contentType, action: p.action }))
  });
  await ctx.post(`${API_BASE}/membership/rolemembers`, { ...auth, data: [{ roleId, userId: VOLUNTEER_USER_ID }] });
  await ctx.dispose();
  return roleId;
}

export async function deleteRole(roleId: string) {
  if (!roleId) return;
  const ctx = await request.newContext();
  await ctx.delete(`${API_BASE}/membership/roles/${roleId}`, await adminAuth(ctx));
  await ctx.dispose();
}

export async function loginAsVolunteer(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("volunteer@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');
  await page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first().click({ timeout: 15000 });
  await page.getByTestId("command-palette-open").waitFor({ state: "visible", timeout: 30000 });
}
