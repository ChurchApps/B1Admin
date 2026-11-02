import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1444: the QR sign-up checklist has a Title row, off by default, that saves with the other fields.
test.describe("Check-in: QR sign-up Title field", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const CHURCH_ID = "CHU00000001";
  let ctx: APIRequestContext;
  let headers: Record<string, string>;
  let originals: any[] = [];
  const KEYS = ["enableQRGuestRegistration", "guestRegistrationFields"];
  const loadSettings = async () => (await (await ctx.get(`${API}/membership/settings`, { headers })).json()) as any[];

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    headers = { Authorization: "Bearer " + (login.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID).jwt };
    const all = await loadSettings();
    originals = KEYS.map((k) => all.find((s) => s.keyName === k)).filter(Boolean);
    const qr = all.find((s) => s.keyName === "enableQRGuestRegistration") || { churchId: CHURCH_ID, keyName: "enableQRGuestRegistration", public: 1 };
    const fields = all.find((s) => s.keyName === "guestRegistrationFields") || { churchId: CHURCH_ID, keyName: "guestRegistrationFields", public: 1 };
    expect((await ctx.post(`${API}/membership/settings`, { headers, data: [{ ...qr, value: "true" }, { ...fields, value: "{}" }] })).ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    const all = await loadSettings();
    const fallback: Record<string, string> = { enableQRGuestRegistration: "false", guestRegistrationFields: "{}" };
    const restore = KEYS.map((k) => {
      const current = all.find((s) => s.keyName === k);
      return current ? { ...current, value: originals.find((s) => s.keyName === k)?.value ?? fallback[k] } : null;
    }).filter(Boolean);
    if (restore.length) await ctx.post(`${API}/membership/settings`, { headers, data: restore });
    await ctx.dispose();
  });

  test("lists Title off by default and saves it when included", async ({ page }) => {
    await page.goto("/mobile/checkin");
    const include = page.getByLabel("Include Title", { exact: true });
    await expect(include).toBeVisible({ timeout: 15000 });
    await expect(include).not.toBeChecked();
    await include.check();
    const saved = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByTestId("qr-guest-registration-save").click();
    await saved;
    const row = (await loadSettings()).find((s) => s.keyName === "guestRegistrationFields");
    expect(JSON.parse(row.value).title).toBe("optional");
  });
});
