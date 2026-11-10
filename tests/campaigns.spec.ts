import { type Page, request } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";
import { fillFundForm } from "./helpers/donations";
import { login } from "./helpers/auth";
import { navigateToDonations, siblingNav } from "./helpers/navigation";
import { confirmDelete, personAddButton } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

const TEST_FUND = "Zacchaeus Building Fund";
const TEST_CAMPAIGN = "Zacchaeus Capital Campaign";
const TEST_PERSON = "Demo User";

function fundRowEditButton(page: Page, name: string) {
  return page
    .locator("tr")
    .filter({ has: page.locator("a").getByText(name, { exact: true }) })
    .getByRole("button", { name: /Edit/ });
}

async function openFundsTab(page: Page) {
  const fundsBtn = (await siblingNav(page)).getByText("Funds");
  await fundsBtn.click();
  await expect(page).toHaveURL(/\/donations\/funds/);
}

async function openCampaignsTab(page: Page) {
  const campaignsBtn = (await siblingNav(page)).getByText("Campaigns");
  await campaignsBtn.click();
  await expect(page).toHaveURL(/\/donations\/campaigns/);
}

test.describe.serial("Pledge Campaigns", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToDonations(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.describe.configure({ retries: 0 });

  test("should create fund for campaign", async () => {
    await openFundsTab(page);
    const addBtn = page.locator('[data-testid="add-fund-button"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await fillFundForm(page, { name: TEST_FUND });
    await expect(page.locator("a").getByText(TEST_FUND, { exact: true })).toHaveCount(1, { timeout: 10000 });
  });

  test("should create campaign", async () => {
    await openCampaignsTab(page);
    const addBtn = page.locator('[data-testid="add-campaign-button"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const box = page.locator("#campaignBox");
    await expect(box).toBeVisible({ timeout: 10000 });
    await box.locator('input[name="name"]').fill(TEST_CAMPAIGN);
    await box.getByRole("combobox").click();
    await page.getByRole("option", { name: TEST_FUND }).click();
    await box.locator('input[name="goalAmount"]').fill("50000");

    const campaignPost = page.waitForResponse((r) => r.url().includes("/giving/campaigns") && r.request().method() === "POST", { timeout: 15000 });
    await box.getByRole("button", { name: "Save" }).click();
    await campaignPost;

    await expect(page.locator("a").getByText(TEST_CAMPAIGN, { exact: true })).toHaveCount(1, { timeout: 10000 });
  });

  test("should open campaign detail and add pledge", async () => {
    await page.locator("a").getByText(TEST_CAMPAIGN, { exact: true }).click();
    await expect(page).toHaveURL(/\/donations\/campaigns\/[\w-]+/, { timeout: 10000 });

    const addPledgeBtn = page.locator('[data-testid="add-pledge-button"]');
    await expect(addPledgeBtn).toBeVisible({ timeout: 10000 });
    await addPledgeBtn.click();

    const box = page.locator("#pledgeBox");
    await expect(box).toBeVisible({ timeout: 10000 });
    await box.locator('input[name="personAddText"]').fill(TEST_PERSON);
    await box.locator('[data-testid="search-button"]').click();
    const personResult = personAddButton(box, TEST_PERSON);
    await expect(personResult).toBeVisible({ timeout: 10000 });
    await personResult.click();

    await box.locator('input[type="number"]').fill("500");
    const pledgePost = page.waitForResponse((r) => r.url().includes("/giving/pledges") && r.request().method() === "POST", { timeout: 15000 });
    await box.getByRole("button", { name: "Save" }).click();
    await pledgePost;

    const pledgeRow = page.locator("tr").filter({ hasText: TEST_PERSON });
    await expect(pledgeRow).toHaveCount(1, { timeout: 10000 });
    await expect(pledgeRow.getByText("Not Started")).toBeVisible({ timeout: 10000 });
    await expect(pledgeRow.getByText(/\$\s?500\.00/)).toBeVisible({ timeout: 10000 });
  });

  test("should edit pledge amount", async () => {
    const editBtn = page.locator('[data-testid^="edit-pledge-"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    const box = page.locator("#pledgeBox");
    await expect(box).toBeVisible({ timeout: 10000 });
    const amount = box.locator('input[type="number"]');
    await expect(amount).toHaveValue("500", { timeout: 10000 });
    await amount.fill("750");

    const pledgePost = page.waitForResponse((r) => r.url().includes("/giving/pledges") && r.request().method() === "POST", { timeout: 15000 });
    await box.getByRole("button", { name: "Save" }).click();
    await pledgePost;

    await expect(page.locator("tr").filter({ hasText: TEST_PERSON }).getByText(/\$\s?750\.00/)).toBeVisible({ timeout: 10000 });
  });

  test("should delete pledge", async () => {
    const editBtn = page.locator('[data-testid^="edit-pledge-"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    const box = page.locator("#pledgeBox");
    await expect(box).toBeVisible({ timeout: 10000 });
    const pledgeDelete = page.waitForResponse((r) => r.url().includes("/giving/pledges") && r.request().method() === "DELETE", { timeout: 15000 });
    await box.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await pledgeDelete;

    await expect(page.getByText("No pledges have been made to this campaign yet.")).toBeVisible({ timeout: 10000 });
  });

  test("should delete campaign", async () => {
    await openCampaignsTab(page);
    const editBtn = page
      .locator("tr")
      .filter({ has: page.locator("a").getByText(TEST_CAMPAIGN, { exact: true }) })
      .getByRole("button", { name: /Edit/ });
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    const box = page.locator("#campaignBox");
    await expect(box).toBeVisible({ timeout: 10000 });
    const campaignDelete = page.waitForResponse((r) => r.url().includes("/giving/campaigns") && r.request().method() === "DELETE", { timeout: 15000 });
    await box.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await campaignDelete;

    await expect(page.locator("a").getByText(TEST_CAMPAIGN, { exact: true })).toHaveCount(0, { timeout: 10000 });
  });

  test("should delete fund", async () => {
    await openFundsTab(page);
    const editBtn = fundRowEditButton(page, TEST_FUND);
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    const box = page.locator("#fundsBox");
    await expect(box).toBeVisible({ timeout: 10000 });
    const fundDelete = page.waitForResponse((r) => r.url().includes("/giving/funds") && r.request().method() === "DELETE", { timeout: 15000 });
    await box.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await fundDelete;
    await expect(page.locator("a").getByText(TEST_FUND, { exact: true })).toHaveCount(0, { timeout: 10000 });
  });
});

// Deleting a campaign from its detail view (Edit Campaign → Delete) returns to the campaign list instead of a dead page.
test.describe("Campaign detail view", () => {
  test.describe.configure({ retries: 0 });
  const API = process.env.API_BASE || "http://localhost:8084";

  test("Edit Campaign → Delete goes back to the campaign list", async ({ page }) => {
    const ctx = await request.newContext();
    const body = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = body.userChurches.find((c: any) => c.church?.id === "CHU00000001");
    const auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    const name = "Zebedee Doomed Campaign " + Date.now();
    const campaignId = (await (await ctx.post(`${API}/giving/campaigns`, { ...auth, data: [{ name, fundId: "FUN00000001", startDate: "2026-01-01", goalAmount: 1000 }] })).json())[0].id;
    try {
      await page.goto("/donations/campaigns/" + campaignId);
      // Like Batches and Funds, the breadcrumb leads back to the list the campaign came from.
      await expect(page.locator("#page-header-breadcrumbs").getByRole("button", { name: "Campaigns" })).toBeVisible();
      await page.getByTestId("edit-campaign-button").click();
      const deleted = page.waitForResponse((r) => r.url().includes("/giving/campaigns/" + campaignId) && r.request().method() === "DELETE");
      await page.locator("#campaignBox").getByRole("button", { name: "Delete" }).click();
      await confirmDelete(page);
      await deleted;
      await expect(page).toHaveURL(/\/donations\/campaigns$/);
      await expect(page.getByTestId("add-campaign-button")).toBeVisible();
      await expect(page.locator("a").getByText(name)).toHaveCount(0);
    } finally {
      await ctx.delete(`${API}/giving/campaigns/${campaignId}`, auth).catch(() => {});
      await ctx.dispose();
    }
  });
});
