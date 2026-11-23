import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The church-wide check-in announcement is edited on Mobile > B1 CheckIn and served to the kiosk
// through /attendance/checkin/settings. Blank means the kiosk shows nothing.
test.describe("Check-in: announcement", () => {
  test.describe.configure({ mode: "serial" });
  const API = process.env.API_BASE || "http://localhost:8084";
  const CHURCH_ID = "CHU00000001";
  const KEY = "checkinAnnouncement";
  let ctx: APIRequestContext;
  let headers: Record<string, string>;
  type SettingRow = { id?: string; churchId?: string; keyName: string; value: string; public?: number };
  let original: SettingRow | null = null;

  const loadSetting = async () => ((await (await ctx.get(`${API}/membership/settings`, { headers })).json()) as SettingRow[]).find((s) => s.keyName === KEY);
  const kioskSettings = async () => (await ctx.get(`${API}/attendance/checkin/settings`, { headers })).json();

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = (login.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID);
    headers = { Authorization: "Bearer " + uc.jwt };
    original = (await loadSetting()) || null;
    if (original?.value) await ctx.post(`${API}/membership/settings`, { headers, data: [{ ...original, value: "" }] });
  });

  test.afterAll(async () => {
    const current = await loadSetting();
    if (current) await ctx.post(`${API}/membership/settings`, { headers, data: [{ ...current, value: original?.value ?? "" }] });
    await ctx.dispose();
  });

  test("starts blank and the kiosk gets no announcement", async ({ page }) => {
    await page.goto("/mobile/checkin");
    await expect(page.getByTestId("checkin-announcement").getByText("Check-in announcement")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("checkin-announcement-input")).toHaveValue("");
    expect((await kioskSettings()).checkinAnnouncement).toBe("");
  });

  test("saves the announcement as a private setting the kiosk can read", async ({ page }) => {
    const message = "Children's wing doors close at 10:15. <b>Thanks!</b>";
    await page.goto("/mobile/checkin");
    await page.getByTestId("checkin-announcement-input").fill(message, { timeout: 15000 });
    const saved = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByTestId("checkin-announcement-save").click();
    await saved;

    const row = await loadSetting();
    expect(row?.value).toBe(message);
    expect(Number(row?.public ?? 0)).toBe(0);
    expect((await kioskSettings()).checkinAnnouncement).toBe(message);

    await page.reload();
    await expect(page.getByTestId("checkin-announcement-input")).toHaveValue(message, { timeout: 15000 });
  });

  test("clearing the text turns the announcement off", async ({ page }) => {
    await page.goto("/mobile/checkin");
    await page.getByTestId("checkin-announcement-input").fill("", { timeout: 15000 });
    const saved = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByTestId("checkin-announcement-save").click();
    await saved;
    expect((await kioskSettings()).checkinAnnouncement).toBe("");
  });
});
