import { type APIRequestContext, type Page, request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateTo } from "./helpers/navigation";

// Demo seed donations are in 2025; year picker defaults to current year.
test.describe("Donation Statements and Stripe Import", () => {
  test.describe("Giving Statements page", () => {
    test.beforeEach(async ({ page }) => {
      await navigateTo(page, "statements");
      await expect(page).toHaveURL(/\/donations\/statements/);
    });

    // A church's whole giving history passed Lambda's 6MB response limit (GET /giving/donations 413 in prod).
    test("asks the Api for the selected year only, not every donation", async ({ page }) => {
      const requests: string[] = [];
      page.on("request", (r) => { if (/\/giving\/(donations|fundDonations)(\?|$)/.test(r.url())) requests.push(r.url()); });
      await page.reload();
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      await page.locator('[data-value="2025"]').click();
      await expect(page.getByText("Download Options")).toBeVisible({ timeout: 10000 });

      expect(requests.length).toBeGreaterThan(0);
      for (const url of requests) expect(url).toMatch(/startDate=\d{4}-01-01&endDate=\d{4}-12-31/);
      expect(requests.some((url) => url.includes("startDate=2025-01-01&endDate=2025-12-31"))).toBe(true);
    });

    test("renders year selector and summary card", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Select Year" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Total Donors:")).toBeVisible();
      await expect(page.getByText("Total Donations:")).toBeVisible();
      await expect(page.getByText("Total Amount:")).toBeVisible();

      const yearSelect = page.locator('[role="combobox"]').first();
      await expect(yearSelect).toBeVisible();
    });

    test("selecting a year with donations exposes Download ZIP and Print All buttons", async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      const year2025 = page.locator('[data-value="2025"]');
      await expect(year2025).toBeVisible({ timeout: 5000 });
      await year2025.click();

      await expect(page.getByText("Download Options")).toBeVisible({ timeout: 10000 });

      const zipBtn = page.locator("button").filter({ hasText: /Download ZIP/i }).first();
      await expect(zipBtn).toBeVisible();

      const printBtn = page.locator("button").filter({ hasText: /Print All/i }).first();
      await expect(printBtn).toBeVisible();
    });

    test("selecting a year with no donations shows the no-donations alert", async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      const year2021 = page.locator('[data-value="2021"]');
      await expect(year2021).toBeVisible({ timeout: 5000 });
      await year2021.click();

      await expect(page.getByText(/No donations found for 2021/i)).toBeVisible({ timeout: 10000 });
      await expect(page.locator("button").filter({ hasText: /Download ZIP/i })).toHaveCount(0);
      await expect(page.locator("button").filter({ hasText: /Print All/i })).toHaveCount(0);
    });

    test("Download ZIP triggers a per-year zip download", async ({ page }) => {
      const yearSelect = page.locator('[role="combobox"]').first();
      await yearSelect.click();
      await page.locator('[data-value="2025"]').click();

      const zipBtn = page.locator("button").filter({ hasText: /Download ZIP/i }).first();
      await expect(zipBtn).toBeVisible({ timeout: 10000 });

      const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
      await zipBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/giving_statements_2025\.zip/);
    });

    test("Statement format link opens Giving settings", async ({ page }) => {
      const link = page.locator('[data-testid="statement-format-settings-link"]');
      await expect(link).toBeVisible({ timeout: 10000 });
      await link.click();
      await expect(page).toHaveURL(/\/settings#giving/);
    });
  });

  test.describe("Stripe Import", () => {
    test("Import missing Stripe transactions link on Batches navigates to Stripe Import", async ({ page }) => {
      await navigateTo(page, "batches");

      const stripeLink = page.locator("a").filter({ hasText: /Import missing Stripe transactions/i }).first();
      await expect(stripeLink).toBeVisible({ timeout: 10000 });
      await stripeLink.click();
      await expect(page).toHaveURL(/\/donations\/stripe-import/);
    });

    test("Stripe Import page renders date range and action controls", async ({ page }) => {
      await page.goto("/donations/stripe-import");
      await expect(page).toHaveURL(/\/donations\/stripe-import/);

      await expect(page.getByLabel("Start Date")).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel("End Date")).toBeVisible();

      const previewBtn = page.locator("button").filter({ hasText: /^Preview$/ }).first();
      await expect(previewBtn).toBeVisible();
      await expect(previewBtn).toBeEnabled();

      // Import Missing is gated on a successful preview returning new events; without
      // running a real preview against Stripe, it should remain disabled.
      const importBtn = page.locator("button").filter({ hasText: /Import Missing/i }).first();
      await expect(importBtn).toBeVisible();
      await expect(importBtn).toBeDisabled();
    });

    test("a preview shows each charge's status, and changing the dates asks for a new preview", async ({ page }) => {
      // Stub the gateway call so the test does not depend on Stripe.
      const bodies: any[] = [];
      await page.route("**/giving/donate/replay-stripe-events", async (route) => {
        bodies.push(route.request().postDataJSON());
        await route.fulfill({
          json: {
            dryRun: true,
            summary: { total: 2, new: 1, alreadyImported: 1, imported: 0, skipped: 0, errors: 0 },
            results: [
              { eventId: "evt_new_1", type: "charge.succeeded", amount: 25, currency: "usd", created: "2026-10-04T15:00:00Z", customer: "cus_1", status: "new" },
              { eventId: "evt_old_1", type: "charge.succeeded", amount: 40, currency: "usd", created: "2026-10-05T15:00:00Z", customer: "cus_2", status: "already_imported" }
            ]
          }
        });
      });
      await page.goto("/donations/stripe-import");
      await page.locator("button").filter({ hasText: /^Preview$/ }).click();
      await expect(page.getByText("Preview Results")).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: "evt_new_1" })).toContainText("New");
      await expect(page.getByRole("row").filter({ hasText: "evt_old_1" })).toContainText("Already Imported");
      expect(bodies[0].dryRun).toBe(true);

      const importBtn = page.locator("button").filter({ hasText: /Import Missing/i }).first();
      await expect(importBtn).toBeEnabled();
      await page.getByLabel("Start Date").fill("2026-02-01");
      await expect(page.getByText("Preview Results")).toHaveCount(0);
      await expect(importBtn).toBeDisabled();
      expect(bodies).toHaveLength(1);
    });
  });
});

// Country receipt formats: the CRA/AU/NZ legal block is driven by church settings and
// rendered on the printed statement. Demo giving data is 2025; John Smith is PER00000001.
test.describe.serial("Country statement formats", () => {
  const REG_NUMBER = "119288945RR0001";

  const setFormat = async (page: Page, formatLabel: string) => {
    await navigateTo(page, "settings");
    await page.locator('[data-testid="settings-section-giving"]').click();
    const section = page.locator('[data-testid="settings-giving"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="settings-giving"] [data-testid="small-button-edit"]').dispatchEvent("click");
    const formatSelect = section.locator('[data-testid="statement-format-select"]');
    await expect(formatSelect).toBeVisible({ timeout: 10000 });
    await formatSelect.click();
    await page.getByRole("option", { name: formatLabel, exact: true }).click();
    if (formatLabel !== "Standard") {
      await section.getByLabel("CRA Registration Number").fill(REG_NUMBER);
      await section.getByLabel("Authorized Signatory Name").fill("Pastor Grace Miller");
      await section.getByLabel("City of Issue").fill("Toronto");
    }
    const settingsPost = page.waitForResponse(
      (r) => r.url().includes("/membership/settings") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await section.getByRole("button", { name: "Save" }).click();
    await settingsPost;
  };

  test.beforeEach(async ({ page }) => {
    // Without ?autoprint=1 the page never calls window.print(); stub it defensively.
    await page.addInitScript(() => {
      window.print = () => {};
      window.history.go = () => {};
    });
  });

  test("Canada format prints the CRA official receipt block with a receipt number", async ({ page }) => {
    await setFormat(page, "Canada - CRA official receipt");
    await page.goto("/donations/print/PER00000001?year=2025");

    const block = page.locator('[data-testid="statement-legal-block"]');
    await expect(block).toBeVisible({ timeout: 15000 });
    await expect(block.getByText("Official Receipt for Income Tax Purposes")).toBeVisible();
    await expect(block.getByText("Receipt number: 2025-PER00000001")).toBeVisible();
    await expect(block.getByText("Charity registration number: " + REG_NUMBER)).toBeVisible();
    await expect(block.getByText("Place of issue: Toronto")).toBeVisible();
    await expect(block.getByText(/Eligible amount of gift for income tax purposes: \$/)).toBeVisible();
    await expect(block.getByText("Pastor Grace Miller — Authorized signature")).toBeVisible();
    await expect(block.getByText("Canada Revenue Agency: canada.ca/charities-giving")).toBeVisible();
  });

  test("switching back to Standard drops the legal block", async ({ page }) => {
    await setFormat(page, "Standard");
    await page.goto("/donations/print/PER00000001?year=2025");
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="statement-legal-block"]')).toHaveCount(0);
  });

  test("the Giving editor shows the default Standard format and All years instead of blank boxes", async ({ page }) => {
    await navigateTo(page, "settings");
    await page.locator('[data-testid="settings-section-giving"]').click();
    const section = page.locator('[data-testid="settings-giving"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="settings-giving"] [data-testid="small-button-edit"]').dispatchEvent("click");
    await expect(section.locator('[data-testid="statement-format-select"]')).toContainText("Standard", { timeout: 10000 });
    await expect(section.locator('[data-testid="member-giving-years-select"]')).toContainText("All years");
  });
});

// Print + Close toolbar replaced the blind auto-print-then-navigate-back behavior.
test.describe("Statement print pages — Print/Close toolbar", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__printCalls = 0;
      (window as any).__historyBackCalls = 0;
      window.print = () => { (window as any).__printCalls++; };
      const realBack = window.history.back.bind(window.history);
      window.history.back = () => { (window as any).__historyBackCalls++; realBack(); };
    });
  });

  test("single statement does not auto-print without ?autoprint=1, and Close goes back", async ({ page }) => {
    await page.goto("/donations");
    await page.goto("/donations/print/PER00000001?year=2025");
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    expect(await page.evaluate(() => (window as any).__printCalls)).toBe(0);

    await page.getByRole("button", { name: "Close" }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__historyBackCalls)).toBeGreaterThan(0);
  });

  test("single statement auto-prints with ?autoprint=1", async ({ page }) => {
    await page.goto("/donations/print/PER00000001?year=2025&autoprint=1");
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await expect.poll(() => page.evaluate(() => (window as any).__printCalls)).toBeGreaterThan(0);
  });

  test("batch statement page shows a Print/Close toolbar and does not auto-print", async ({ page }) => {
    await page.goto("/donations/print-all?year=2025");
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__printCalls)).toBe(0);
  });
});

// The statement print pages resolve every static label through Locale.label(). When a key
// is missing from en.json, Locale.label echoes the raw key, so the statement would render
// "donations.printAllStatementsPage.annualStatementTitle" instead of English text.
test.describe("Print all statements labels", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {};
    });
  });

  test("batch giving statement renders English labels, not placeholder keys", async ({ page }) => {
    await page.goto("/donations/print-all?year=2025");

    // The statement body has to be on screen before we judge its labels.
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("2025 Annual Giving Statement").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Donor Information").first()).toBeVisible();
    await expect(page.getByText("Statement Summary").first()).toBeVisible();
    await expect(page.getByText("Fund Breakdown").first()).toBeVisible();
    await expect(page.getByText("Contribution Details").first()).toBeVisible();

    // No raw i18n key may survive to the printed page.
    await expect(page.getByText(/donations\.printAllStatementsPage\./)).toHaveCount(0);
  });
});

// Giving statements count only tax-deductible giving (Funds → Tax Deductible). The batch page's summary,
// ZIP and Print All must leave out a gift made only to a non-deductible fund, exactly like a donor's
// own statement (GET /donations?personId= drops it on the Api side).
test.describe.serial("Batch statements skip non-deductible funds", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const YEAR = 2024;
  const DONALD_CLARK = "PER00000080";
  const JOHN_SMITH = "PER00000001";
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let fundId: string;
  let batchId: string;

  test.beforeAll(async () => {
    ctx = await request.newContext();
    const body = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = body.userChurches.find((c: any) => c.church?.id === "CHU00000001");
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    fundId = (await (await ctx.post(`${API}/giving/funds`, { ...auth, data: [{ name: "Zebedee Camp Fees", taxDeductible: false }] })).json())[0].id;
    batchId = (await (await ctx.post(`${API}/giving/donationbatches`, { ...auth, data: [{ name: "Zebedee Statement Batch", batchDate: `${YEAR}-06-09` }] })).json())[0].id;
    const gifts = [
      { personId: DONALD_CLARK, amount: 40, fundId },
      { personId: JOHN_SMITH, amount: 25, fundId: "FUN00000001" }
    ];
    for (const g of gifts) {
      await ctx.post(`${API}/giving/donations`, {
        ...auth,
        data: [{ batchId, personId: g.personId, donationDate: `${YEAR}-06-09`, amount: g.amount, currency: "usd", method: "Check", fundDonations: [{ fundId: g.fundId, amount: g.amount, currency: "usd" }] }]
      });
    }
  });

  test.afterAll(async () => {
    if (batchId) await ctx.delete(`${API}/giving/donationbatches/${batchId}`, auth);
    if (fundId) await ctx.delete(`${API}/giving/funds/${fundId}`, auth);
    await ctx.dispose();
  });

  test("the summary and buttons count only the deductible gift", async ({ page }) => {
    await page.goto("/donations/statements");
    await page.locator('[role="combobox"]').first().click();
    await page.locator(`[data-value="${YEAR}"]`).click();
    const summary = page.getByRole("heading", { name: `Summary (${YEAR})` }).locator("..");
    await expect(summary).toContainText("Total Donors:1");
    await expect(summary).toContainText("Total Donations:1");
    await expect(summary).toContainText("25.00");
    await expect(summary).not.toContainText("65.00");
    await expect(page.getByRole("button", { name: "Print All 1 Statements" })).toBeVisible();
  });

  test("Print All prints a statement only for the donor with deductible giving", async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
    await page.goto(`/donations/print-all?year=${YEAR}`);
    await expect(page.getByText(`${YEAR} Annual Giving Statement`)).toHaveCount(1, { timeout: 15000 });
    await expect(page.getByText("Smith", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Donald Clark")).toHaveCount(0);
    await expect(page.getByText("Zebedee Camp Fees")).toHaveCount(0);
  });
});
