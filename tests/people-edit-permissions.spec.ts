import { test, expect, request as pwRequest, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

// Issue #1076: a member without People > Edit is still offered edit/delete controls on
// the People screens. The Api rejects the requests, so the buttons never work - they
// just shouldn't be there. Person.tsx already gates its edit action this way.
const DONALD_CLARK = "PER00000080"; // demo seed person, not the signed-in volunteer

// Rachel Martin: demo seed user whose only role permission is DoingApi/Tasks/View.
// Since B1Admin #690, /people redirects anyone without People > View. The test grants
// that View permission and still withholds People > Edit, which is what hides the controls.
const VOLUNTEER_EMAIL = "volunteer@b1.church";
const API = process.env.API_BASE || "http://localhost:8084";
const VOLUNTEER_ROLE = "ROL00000010";

async function adminAuth(ctx: APIRequestContext) {
  const login = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await login.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

async function signIn(page: Page, email: string) {
  await page.goto("/", { timeout: 60000 });

  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 30000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {})
  ]);

  if (await churchDialog.isVisible().catch(() => false)) {
    const grace = page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first();
    await grace.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }

  await page.getByTestId("command-palette-open").waitFor({ state: "visible", timeout: 30000 });
}

test.describe.serial("Issue #1076 - People edit/delete controls respect People > Edit", () => {
  let context: BrowserContext;
  let page: Page;

  let peopleViewPermissionId = "";

  test.beforeAll(async ({ browser }) => {
    const api = await pwRequest.newContext();
    const auth = await adminAuth(api);
    const saved = await api.post(`${API}/membership/rolepermissions`, {
      ...auth,
      data: [{ roleId: VOLUNTEER_ROLE, apiName: "MembershipApi", contentType: "People", action: "View" }]
    });
    peopleViewPermissionId = (await saved.json())?.[0]?.id || "";
    await api.dispose();
    // Fresh context: the default storageState is the demo Domain Admin.
    // Sign in after the grant so the volunteer JWT includes People > View.
    context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();
    await signIn(page, VOLUNTEER_EMAIL);
  });

  test.afterAll(async () => {
    await context?.close();
    if (!peopleViewPermissionId) return;
    const api = await pwRequest.newContext();
    const auth = await adminAuth(api);
    await api.delete(`${API}/membership/rolepermissions/${peopleViewPermissionId}`, auth);
    await api.dispose();
  });

  test("person page hides the edit action from a user without People > Edit", async () => {
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });

    // Person loaded, so the page rendered for real and we are asserting on a live view.
    await expect(page.getByText("Donald Clark").first()).toBeVisible({ timeout: 30000 });

    await expect(page.locator('[data-testid="edit-person-button"]')).toHaveCount(0);
  });

  test("column picker does not offer the Delete column to a user without People > Edit", async () => {
    await page.goto("/people", { timeout: 60000 });

    const columnsButton = page.locator('[data-testid="columns-button"]');
    await expect(columnsButton).toBeVisible({ timeout: 30000 });
    await columnsButton.click();

    // Picker is open: a always-available column proves we are looking at the real list.
    await expect(page.locator('[data-testid="column-checkbox-lastName"]')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="column-checkbox-deleteOption"]')).toHaveCount(0);
  });
});

// Positive control: the gating must not hide these from staff who do have the permission.
test.describe("Issue #1076 - a user with People > Edit still gets both controls", () => {
  test("person page shows the edit action and the picker offers the Delete column", async ({ page }) => {
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });
    await expect(page.locator('[data-testid="edit-person-button"]')).toBeVisible({ timeout: 30000 });

    await page.goto("/people", { timeout: 60000 });
    const columnsButton = page.locator('[data-testid="columns-button"]');
    await expect(columnsButton).toBeVisible({ timeout: 30000 });
    await columnsButton.click();
    await expect(page.locator('[data-testid="column-checkbox-deleteOption"]')).toBeVisible({ timeout: 10000 });
  });
});
