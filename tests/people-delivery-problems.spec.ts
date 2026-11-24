import { test, expect, request as pwRequest, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

// Delivery problems on the person record: recent failed sends from the delivery log, for People editors only.
const GEORGE_THOMPSON = "PER00000073"; // demo seed has a failed email to him ("Mailbox full")
const DONALD_CLARK = "PER00000080"; // no failed sends in the seed
const API = process.env.API_BASE || "http://localhost:8084";
const VOLUNTEER_EMAIL = "volunteer@b1.church";
const VOLUNTEER_ROLE = "ROL00000010";

async function userAuth(ctx: APIRequestContext, email: string) {
  const login = await ctx.post(`${API}/membership/users/login`, { data: { email, password: "password" } });
  const body = await login.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

const adminAuth = (ctx: APIRequestContext) => userAuth(ctx, "demo@b1.church");

async function signIn(page: Page, email: string) {
  await page.goto("/", { timeout: 60000 });
  await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {})
  ]);
  if (await churchDialog.isVisible().catch(() => false)) {
    await page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first().click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }
  await page.getByTestId("command-palette-open").waitFor({ state: "visible", timeout: 30000 });
}

test.describe("People - Delivery problems", () => {
  test("a People editor sees the person's failed sends with date, channel, address and error", async ({ page }) => {
    await page.goto(`/people/${GEORGE_THOMPSON}`, { timeout: 60000 });
    const section = page.getByTestId("person-delivery-problems-section");
    await expect(section.getByRole("heading", { name: "Delivery problems" })).toBeVisible({ timeout: 30000 });
    const row = section.getByTestId("person-delivery-problem").first();
    await expect(row).toContainText("Email");
    await expect(row).toContainText("george.thompson@email.com");
    await expect(row).toContainText("Mailbox full");
  });

  test("the error is shown as plain text, not markup", async ({ page }) => {
    await page.route("**/messaging/deliverylogs/person/*/failures", (route) => route.fulfill({ json: [{ attemptTime: new Date().toISOString(), deliveryMethod: "sms", deliveryAddress: "+12175552202", errorMessage: "<b>Carrier rejected</b>" }] }));
    await page.goto(`/people/${GEORGE_THOMPSON}`, { timeout: 60000 });
    const section = page.getByTestId("person-delivery-problems-section");
    await expect(section).toContainText("<b>Carrier rejected</b>", { timeout: 30000 });
    await expect(section.locator("b")).toHaveCount(0);
  });

  test("the section is absent when nothing failed", async ({ page }) => {
    const loaded = page.waitForResponse((r) => r.url().includes(`/messaging/deliverylogs/person/${DONALD_CLARK}/failures`));
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });
    expect(await (await loaded).json()).toEqual([]);
    await expect(page.getByText("Donald Clark").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("person-delivery-problems-section")).toHaveCount(0);
  });
});

test.describe.serial("People - Delivery problems need People > Edit", () => {
  let context: BrowserContext;
  let page: Page;
  let peopleViewPermissionId = "";

  test.beforeAll(async ({ browser }) => {
    const api = await pwRequest.newContext();
    const auth = await adminAuth(api);
    const saved = await api.post(`${API}/membership/rolepermissions`, { ...auth, data: [{ roleId: VOLUNTEER_ROLE, apiName: "MembershipApi", contentType: "People", action: "View" }] });
    peopleViewPermissionId = (await saved.json())?.[0]?.id || "";
    await api.dispose();
    context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();
    await signIn(page, VOLUNTEER_EMAIL);
  });

  test.afterAll(async () => {
    await context?.close();
    if (!peopleViewPermissionId) return;
    const api = await pwRequest.newContext();
    await api.delete(`${API}/membership/rolepermissions/${peopleViewPermissionId}`, await adminAuth(api));
    await api.dispose();
  });

  test("a People viewer without Edit gets no section, and the Api refuses them", async () => {
    let asked = false;
    page.on("request", (r) => { if (r.url().includes("/deliverylogs/person/") && r.url().endsWith("/failures")) asked = true; });
    await page.goto(`/people/${GEORGE_THOMPSON}`, { timeout: 60000 });
    await expect(page.getByText("George Thompson").first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId("person-delivery-problems-section")).toHaveCount(0);
    expect(asked).toBe(false);

    // Logged in after the grant, so the token carries People > View but not Edit.
    const api = await pwRequest.newContext();
    const volunteer = await userAuth(api, VOLUNTEER_EMAIL);
    const res = await api.get(`${API}/messaging/deliverylogs/person/${GEORGE_THOMPSON}/failures`, volunteer);
    expect(res.status()).toBe(401);
    await api.dispose();
  });
});
