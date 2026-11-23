import { request, type Page } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";

// Keying a gift from someone who is not in B1 yet: the donor search offers "Add New Person",
// and the person created there becomes the donor, in quick entry and in the full gift editor.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const BATCH_NAME = "New Donor Batch";
const STAMP = Date.now().toString().slice(-6);

const adminAuth = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: { church?: { id?: string }; jwt?: string }) => uc.church?.id === "CHU00000001")?.jwt as string;
  return { headers: { Authorization: "Bearer " + jwt } };
};

let batchId = "";
const personIds: string[] = [];
const donationIds: string[] = [];

const postedDonation = (page: Page) => page.waitForResponse((r) => r.request().method() === "POST" && /\/giving\/donations$/.test(new URL(r.url()).pathname));
const postedPerson = (page: Page) => page.waitForResponse((r) => r.request().method() === "POST" && /\/membership\/people$/.test(new URL(r.url()).pathname));

// Search for a name nobody has, then create that person from the "Add New Person" link.
const createDonorFromSearch = async (page: Page, first: string, last: string) => {
  const search = page.getByTestId("person-search-input").locator("input");
  await search.fill(`${first} ${last}`);
  await page.getByTestId("search-button").click();
  await page.getByRole("button", { name: /Add (a )?New Person/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="first"]').fill(first);
  await dialog.locator('[name="last"]').fill(last);
  const personRes = postedPerson(page);
  await dialog.getByRole("button", { name: "Add" }).click();
  const person = (await (await personRes).json())[0];
  personIds.push(person.id);
  await expect(dialog).toHaveCount(0, { timeout: 10000 });
  return person.id as string;
};

test.describe.serial("Batch entry: add a new donor", () => {
  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API_BASE}/giving/donationbatches`, { ...(await adminAuth(ctx)), data: [{ name: BATCH_NAME, batchDate: "2025-04-06" }] });
    batchId = (await res.json())[0].id;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    const auth = await adminAuth(ctx);
    for (const id of donationIds) await ctx.delete(`${API_BASE}/giving/donations/${id}`, auth);
    if (batchId) await ctx.delete(`${API_BASE}/giving/donationbatches/${batchId}`, auth);
    for (const id of personIds) await ctx.delete(`${API_BASE}/membership/people/${id}`, auth);
    await ctx.dispose();
  });

  test("quick entry creates a donor from the search and records the gift to them", async ({ page }) => {
    await page.goto(`/donations/batches/${batchId}`);
    await expect(page.getByTestId("person-search-input")).toBeVisible({ timeout: 15000 });
    const personId = await createDonorFromSearch(page, "Quillon", "Newgiver" + STAMP);

    // The new person is the selected donor, and the gift posts with their id.
    await expect(page.getByText(`Quillon Newgiver${STAMP}`)).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="bulk-donation-amount"] input').fill("15.00");
    const donationRes = postedDonation(page);
    await page.getByTestId("add-donation-submit").click();
    const res = await donationRes;
    expect(res.request().postDataJSON()[0].personId).toBe(personId);
    donationIds.push((await res.json())[0].id);
  });

  test("the full gift editor creates a donor from the search", async ({ page }) => {
    await page.goto(`/donations/batches/${batchId}`);
    const anon = page.getByTestId("bulk-donation-anonymous");
    await expect(anon).toBeVisible({ timeout: 15000 });
    await anon.click();
    await page.getByTestId("bulk-donation-full-editor").click();
    const box = page.locator("#donationBox");
    await box.locator('[data-cy="donating-person"]').click();
    const personId = await createDonorFromSearch(page, "Quillon", "Editgiver" + STAMP);

    await expect(box.locator('[data-cy="donating-person"]')).toHaveText(`Quillon Editgiver${STAMP}`, { timeout: 10000 });
    await box.locator('input[name="amount"]').fill("25");
    const donationRes = postedDonation(page);
    await box.locator("button").getByText("Save").click();
    const res = await donationRes;
    expect(res.request().postDataJSON()[0].personId).toBe(personId);
    donationIds.push((await res.json())[0].id);
  });
});
