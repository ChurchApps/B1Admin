import type { Page, APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSettings } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Texting settings hands the church a signed inbound webhook URL; a STOP reply posted to it opts that number out.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const DONALD_ID = "PER00000080"; // Donald Clark, mobile (217) 555-2502

async function apiAuth(ctx: APIRequestContext) {
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

test.describe.serial("Texting STOP replies", () => {
  let page: Page;
  let inboundPath = "";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToSettings(page);
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    await ctx.post(`${API_BASE}/membership/users/updateOptedOut`, { ...auth, data: { personId: DONALD_ID, optedOut: false } });
    // Put the seeded Clearstream provider back after the Twilio test
    await ctx.post(`${API_BASE}/messaging/texting/providers`, { ...auth, data: [{ id: "TXP00000001", provider: "clearstream", apiKey: "demo_api_key_clearstream", apiSecret: "", fromNumber: "+12175550000", enabled: true }] });
    await ctx.dispose();
    await page?.context().close();
  });

  test("texting settings shows the inbound STOP webhook URL", async () => {
    await page.locator('[data-testid="settings-section-texting"]').click();
    await expect(page.locator('[data-testid="settings-texting"]')).toBeVisible({ timeout: 15000 });
    await page.getByTestId("settings-texting").getByTestId("small-button-edit").click();
    const field = page.getByTestId("texting-inbound-url").locator("input");
    await expect(field).toBeVisible({ timeout: 10000 });
    const url = await field.inputValue();
    expect(url).toMatch(/\/messaging\/texting\/inbound\/CHU00000001\/[a-f0-9]{32}$/);
    inboundPath = new URL(url).pathname.replace(/^.*\/messaging\//, "/messaging/");
  });

  test("a STOP reply to that URL opts the person out; a forged URL is rejected", async () => {
    expect(inboundPath).toBeTruthy();
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);

    const forged = await ctx.post(`${API_BASE}/messaging/texting/inbound/CHU00000001/${"0".repeat(32)}`, { form: { From: "+12175552502", Body: "STOP" } });
    expect(forged.status()).toBe(401);

    const ignored = await ctx.post(`${API_BASE}${inboundPath}`, { form: { From: "+12175552502", Body: "See you Sunday" } });
    expect((await ignored.json()).optedOut).toBe(0);

    const stop = await ctx.post(`${API_BASE}${inboundPath}`, { form: { From: "+12175552502", Body: "STOP" } });
    expect(stop.status()).toBe(200);
    expect((await stop.json()).optedOut).toBeGreaterThanOrEqual(1);

    const person = await (await ctx.get(`${API_BASE}/membership/people/${DONALD_ID}`, auth)).json();
    expect(Boolean(person.optedOut)).toBe(true);
    await ctx.dispose();
  });

  test("a church can bring its own Twilio account and number", async () => {
    const section = page.getByTestId("settings-texting"); // still in edit mode from the first test
    await section.getByRole("combobox").click();
    await page.getByRole("option", { name: "Twilio" }).click();
    await expect(section.getByRole("link", { name: "Twilio Console" })).toBeVisible();
    await section.getByLabel("Account SID").fill("AC00000000000000000000000000000000");
    await section.getByLabel("Auth Token").fill("demo-auth-token");
    await section.getByLabel("From Number").fill("+12175550000");
    await section.locator("button").getByText("Save").click();
    await expect(section.getByRole("combobox")).toHaveCount(0, { timeout: 10000 });

    await section.getByTestId("small-button-edit").click();
    await expect(section.getByRole("combobox")).toHaveText("Twilio", { timeout: 10000 });
    await expect(section.getByLabel("From Number")).toHaveValue("+12175550000");
    await expect(section.getByLabel("Auth Token")).toHaveValue("********");
    await expect(page.getByTestId("texting-inbound-url").locator("input")).toHaveValue(/\/messaging\/texting\/inbound\/CHU00000001\//);
  });
});
