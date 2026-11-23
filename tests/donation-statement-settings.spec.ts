import { type APIRequestContext, request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateTo } from "./helpers/navigation";

// Settings > Giving: a custom tax disclaimer and the month the statement year starts in.
// Demo data: John Smith (PER00000001) gave March-May 2025, so with a July start those gifts are in the July 2024 - June 2025 statement.
test.describe.serial("Statement disclaimer and statement year", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const JOHN_SMITH = "PER00000001";
  const DISCLAIMER = "Gifts to {churchName} are tax deductible as allowed by law.";
  const RENDERED = "Gifts to Grace Community Church are tax deductible as allowed by law.";
  type SettingRow = { id?: string; churchId?: string; keyName: string; value?: string; public?: number };
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };

  // /membership/settings inserts a new row when no id is sent, so reuse existing ids.
  const saveSettings = async (values: Record<string, string>) => {
    const existing: SettingRow[] = await (await ctx.get(`${API}/membership/settings`, auth)).json();
    const rows = Object.entries(values).map(([keyName, value]) => ({ ...(existing.find((s) => s.keyName === keyName) || { churchId: "CHU00000001", keyName }), public: 1, value }));
    expect((await ctx.post(`${API}/membership/settings`, { ...auth, data: rows })).ok()).toBeTruthy();
  };

  test.beforeAll(async () => {
    ctx = await request.newContext();
    const body = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = body.userChurches.find((c: { church?: { id?: string }; jwt: string }) => c.church?.id === "CHU00000001");
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
  });

  test.afterAll(async () => {
    await saveSettings({ statementDisclaimer: "", statementYearStartMonth: "" });
    await ctx.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
  });

  test("blank settings keep the standard disclaimer and the calendar year", async ({ page }) => {
    await saveSettings({ statementDisclaimer: "", statementYearStartMonth: "" });
    await page.goto(`/donations/print/${JOHN_SMITH}?year=2025`);
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("statement-period")).toHaveText("Period: Jan 1 - Dec 31, 2025");
    await expect(page.getByTestId("statement-disclaimer")).toContainText("No goods or services were provided");
  });

  test("the Giving settings form saves the disclaimer and the start month", async ({ page }) => {
    await navigateTo(page, "settings");
    await page.locator('[data-testid="settings-section-giving"]').click();
    const section = page.locator('[data-testid="settings-giving"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="settings-giving"] [data-testid="small-button-edit"]').dispatchEvent("click");
    const startSelect = section.locator('[data-testid="statement-year-start-select"]');
    await expect(startSelect).toContainText("January", { timeout: 10000 });
    await startSelect.click();
    await page.getByRole("option", { name: "July", exact: true }).click();
    await section.locator('[data-testid="statement-disclaimer-input"] textarea').first().fill(DISCLAIMER);
    const settingsPost = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST", { timeout: 15000 });
    await section.getByRole("button", { name: "Save" }).click();
    const saved: SettingRow[] = (await settingsPost).request().postDataJSON();
    expect(saved.find((s) => s.keyName === "statementYearStartMonth")?.value).toBe("7");
    expect(saved.find((s) => s.keyName === "statementDisclaimer")?.value).toBe(DISCLAIMER);
  });

  test("the donor's statement covers July to June and prints the custom disclaimer as plain text", async ({ page }) => {
    await saveSettings({ statementDisclaimer: DISCLAIMER + " <b>bold</b>", statementYearStartMonth: "7" });
    await page.goto(`/donations/print/${JOHN_SMITH}?year=2024`);
    await expect(page.getByText("2024–2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("statement-period")).toHaveText("Period: Jul 1, 2024 - Jun 30, 2025");
    await expect(page.getByText("Monthly tithe").first()).toBeVisible();
    const disclaimer = page.getByTestId("statement-disclaimer");
    await expect(disclaimer).toHaveText(RENDERED + " <b>bold</b>");
    await expect(disclaimer.locator("b")).toHaveCount(0);

    // March-May 2025 belongs to the year that started in July 2024, not the one starting July 2025.
    await page.goto(`/donations/print/${JOHN_SMITH}?year=2025`);
    await expect(page.getByText("2025–2026 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Monthly tithe")).toHaveCount(0);
  });

  test("the receipt prints the custom disclaimer", async ({ page }) => {
    await saveSettings({ statementDisclaimer: DISCLAIMER, statementYearStartMonth: "7" });
    await page.goto("/donations/receipt/DON00000001");
    await expect(page.getByTestId("statement-disclaimer")).toHaveText(RENDERED, { timeout: 15000 });
  });

  test("Giving Statements asks for the July-June range and Print All uses it", async ({ page }) => {
    await saveSettings({ statementDisclaimer: DISCLAIMER, statementYearStartMonth: "7" });
    const requests: string[] = [];
    page.on("request", (r) => { if (/\/giving\/(donations|fundDonations)\?/.test(r.url())) requests.push(r.url()); });
    await page.goto("/donations/statements");
    await page.locator('[role="combobox"]').first().click();
    const option = page.locator('[data-value="2024"]');
    await expect(option).toHaveText("July 2024 – June 2025");
    await option.click();
    await expect(page.getByRole("heading", { name: "Summary (2024–2025)" })).toBeVisible({ timeout: 15000 });
    expect(requests.some((url) => url.includes("startDate=2024-07-01&endDate=2025-06-30"))).toBe(true);
    for (const url of requests) expect(url).not.toMatch(/startDate=\d{4}-01-01/);

    await page.goto("/donations/print-all?year=2024");
    await expect(page.getByText("2024–2025 Annual Giving Statement").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("statement-disclaimer").first()).toHaveText(RENDERED);
  });

  test("the person's Giving pills are statement years and link to the matching statement", async ({ page }) => {
    await saveSettings({ statementDisclaimer: "", statementYearStartMonth: "7" });
    await page.goto(`/people/${JOHN_SMITH}`);
    await page.getByTestId("person-giving-all").click();
    const pill = page.getByTestId("year-pill-2024");
    await expect(pill).toHaveText("2024–2025", { timeout: 15000 });
    await pill.click();
    await expect(page.getByTestId("giving-statement")).toHaveAttribute("href", new RegExp(`/donations/print/${JOHN_SMITH}\\?year=2024$`));
  });
});
