import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Printed giving statements used screen-sized type and spacing with no page-break rules, so a statement
// spilled onto extra sheets and the closing note could land alone on a nearly blank page.
// Demo giving data is 2025: ten donors, five of them (John Smith among them) with 26 split-fund rows.
const countPdfPages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;

test.describe("Giving statement printed page count", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
  });

  // The heading renders before the gift queries and logo settle; a PDF taken then is short a page.
  const waitForStatementData = async (page: import("@playwright/test").Page) => {
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
  };

  test("a year of split gifts prints on two Letter pages, not three", async ({ page }) => {
    await page.goto("/donations/print/PER00000001?year=2025");
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await waitForStatementData(page);
    const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true, printBackground: true });
    expect(countPdfPages(pdf)).toBe(2);
  });

  test("Print All gives the five long statements two sheets and every other donor one", async ({ page }) => {
    await page.goto("/donations/print-all?year=2025");
    await expect(page.getByText("2025 Annual Giving Statement")).toHaveCount(10, { timeout: 15000 });
    await waitForStatementData(page);
    const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true, printBackground: true });
    expect(countPdfPages(pdf)).toBe(15);
  });
});

// Issue #1639: the Donor Information card prints the person's donor number when one is set, and no line when it is not.
// Uses a person outside the page-count tests above, since this one adds a line to the card.
test.describe.serial("Giving statement donor number", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const PERSON_ID = "PER00000006";
  const DONOR_NUMBER = "D-1639";
  let auth: { headers: { Authorization: string } };
  let originalDonorNumber: string | undefined;

  const savePerson = async (ctx: APIRequestContext, donorNumber: string | null) => {
    const person = await (await ctx.get(`${API}/membership/people/${PERSON_ID}`, auth)).json();
    const res = await ctx.post(`${API}/membership/people`, { ...auth, data: [{ ...person, donorNumber }] });
    expect(res.ok()).toBeTruthy();
  };

  const withApi = async (fn: (ctx: APIRequestContext) => Promise<void>) => {
    const ctx = await pwRequest.newContext();
    try {
      if (!auth) {
        const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
        const uc = (login.userChurches || []).find((c: any) => c.church?.id === "CHU00000001");
        auth = { headers: { Authorization: `Bearer ${uc.jwt}` } };
      }
      await fn(ctx);
    } finally { await ctx.dispose(); }
  };

  test.beforeAll(async () => {
    await withApi(async (ctx) => {
      originalDonorNumber = (await (await ctx.get(`${API}/membership/people/${PERSON_ID}`, auth)).json()).donorNumber;
    });
  });

  test.afterAll(async () => { await withApi((ctx) => savePerson(ctx, originalDonorNumber || null)); });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
  });

  test("shows the donor number in Donor Information when the person has one", async ({ page }) => {
    await withApi((ctx) => savePerson(ctx, DONOR_NUMBER));
    await page.goto(`/donations/print/${PERSON_ID}?year=2025`);
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    const donorCard = page.locator(".info-card").first();
    await expect(donorCard).toContainText(`Donor Number: ${DONOR_NUMBER}`);
  });

  test("leaves the donor number line out when the person has none", async ({ page }) => {
    await withApi((ctx) => savePerson(ctx, null));
    await page.goto(`/donations/print/${PERSON_ID}?year=2025`);
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".info-name").first()).not.toBeEmpty();
    await expect(page.getByText("Donor Number", { exact: false })).toHaveCount(0);
  });
});
