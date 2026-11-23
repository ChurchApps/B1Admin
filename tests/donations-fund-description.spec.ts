import { request } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";
import { siblingNav } from "./helpers/navigation";

// A fund can carry an optional plain-text description that donors see under the fund on the giving form.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const FUND_NAME = `Zacchaeus Described Fund ${Date.now()}`;
const DESCRIPTION = "Helps families in need with groceries and rent.";

const adminAuth = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: { church?: { id?: string }; jwt?: string }) => uc.church?.id === CHURCH_ID)?.jwt as string;
  return { headers: { Authorization: "Bearer " + jwt } };
};

test.describe.serial("Fund description", () => {
  test.describe.configure({ retries: 0 });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    const auth = await adminAuth(ctx);
    const funds = (await (await ctx.get(`${API_BASE}/giving/funds`, auth)).json()) as { id: string; name: string }[];
    for (const f of funds.filter((x) => x.name === FUND_NAME)) await ctx.delete(`${API_BASE}/giving/funds/${f.id}`, auth);
    await ctx.dispose();
  });

  test("saves a description on a fund and returns it to the public giving form", async ({ page }) => {
    await (await siblingNav(page)).getByText("Funds").first().click();
    await expect(page).toHaveURL(/\/donations\/funds/, { timeout: 10000 });

    await page.locator('[data-testid="add-fund-button"]').click();
    await page.locator('[name="fundName"]').fill(FUND_NAME);
    await page.locator('[name="description"]').fill(DESCRIPTION);

    const post = page.waitForResponse((r) => r.url().includes("/giving/funds") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("#fundsBox").getByRole("button", { name: "Save" }).click();
    const saved = (await (await post).json()) as { description?: string }[];
    expect(saved[0].description).toBe(DESCRIPTION);

    const row = page.locator("tr").filter({ has: page.locator("a").getByText(FUND_NAME, { exact: true }) });
    await row.getByRole("button", { name: /Edit/ }).click();
    await expect(page.locator('[name="description"]')).toHaveValue(DESCRIPTION, { timeout: 10000 });

    // The donation form loads funds anonymously from this endpoint.
    const ctx = await request.newContext();
    const publicFunds = (await (await ctx.get(`${API_BASE}/giving/funds/churchId/${CHURCH_ID}`)).json()) as { name: string; description?: string }[];
    expect(publicFunds.find((f) => f.name === FUND_NAME)?.description).toBe(DESCRIPTION);
    await ctx.dispose();
  });
});
