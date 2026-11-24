import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Staff record cash/check payments and refunds from the registration details dialog, and refund an
// online payment through the gateway. Builds its own disposable event through the API; the gateway
// refund test stubs the details and refund responses because the demo data has no settled card charge.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000011";
const PERSON_ID = "PER00000002";
const PERSON_NAME = "Mary Smith";
const EVENT_TITLE = "Zebedee Payments Event";

const eventStart = new Date();
eventStart.setDate(eventStart.getDate() + 40);
eventStart.setHours(9, 0, 0, 0);
const eventEnd = new Date(eventStart);
eventEnd.setHours(12, 0, 0, 0);

test.describe.serial("Registration payments: record payment, offline refund, gateway refund", () => {
  let staffJwt: string;
  let eventId: string;
  let registrationId: string;
  const auth = () => ({ headers: { Authorization: "Bearer " + staffJwt } });

  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    staffJwt = ((loginBody.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0])?.jwt;
    expect(staffJwt, "staff jwt").toBeTruthy();

    const evRes = await ctx.post(`${API_BASE}/content/events`, { ...auth(), data: [{ groupId: GROUP_ID, title: EVENT_TITLE, start: eventStart, end: eventEnd, allDay: false, visibility: "public", registrationEnabled: true }] });
    expect(evRes.ok()).toBeTruthy();
    eventId = (await evRes.json())[0]?.id;
    expect(eventId, "event id").toBeTruthy();

    const typesRes = await ctx.post(`${API_BASE}/content/registrations/types`, { ...auth(), data: [{ eventId, name: "Camper", price: 45, capacity: null, sort: 1, active: true }] });
    expect(typesRes.ok()).toBeTruthy();
    const typeId = (await typesRes.json())[0]?.id;

    // A staff add is never charged, so it starts pending with the full $45 due.
    const regRes = await ctx.post(`${API_BASE}/content/registrations/register`, { ...auth(), data: { churchId: CHURCH_ID, eventId, personId: PERSON_ID, members: [{ personId: PERSON_ID, firstName: "Mary", lastName: "Smith", registrationTypeId: typeId }] } });
    expect(regRes.ok()).toBeTruthy();
    const reg = await regRes.json();
    registrationId = reg.id;
    expect(reg.status).toBe("pending");
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    if (registrationId) await ctx.delete(`${API_BASE}/content/registrations/${registrationId}`, auth()).catch(() => { });
    if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth()).catch(() => { });
    await ctx.dispose();
  });

  async function openDetails(page: Page) {
    await page.goto(`/registrations/${eventId}`);
    const row = page.locator('[data-testid="registration-row"]').filter({ hasText: PERSON_NAME });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator('button[aria-label="Registration Details"]').click();
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Registration Details" });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    return dialog;
  }

  async function fillPayment(page: Page, amount: string, method: "Cash" | "Check" | "Other", checkNumber?: string) {
    const form = page.locator('[data-testid="registration-payment-dialog"]');
    await expect(form).toBeVisible({ timeout: 10000 });
    await form.locator('[data-testid="registration-payment-amount"] input').fill(amount);
    await form.locator('[data-testid="registration-payment-method"] [role="combobox"]').click();
    await page.getByRole("option", { name: method, exact: true }).click();
    if (checkNumber) await form.locator('[data-testid="registration-payment-check-number"] input').fill(checkNumber);
    return form;
  }

  test("Record Payment takes a partial check, then cash for the rest confirms the registration", async ({ page }) => {
    const dialog = await openDetails(page);
    await expect(dialog.getByText("$0.00 / $45.00")).toBeVisible();

    await dialog.locator('[data-testid="record-registration-payment"]').click();
    let form = await fillPayment(page, "20", "Check", "1042");
    let post = page.waitForResponse((r) => r.url().includes(`/registrations/${registrationId}/payments`) && r.request().method() === "POST", { timeout: 15000 });
    await form.locator('[data-testid="registration-payment-save"]').click();
    expect((await post).ok()).toBeTruthy();
    await expect(form).toHaveCount(0, { timeout: 10000 });
    await expect(dialog.getByText("$20.00 / $45.00")).toBeVisible();
    await expect(dialog.locator('[data-testid="registration-payment-row"]').filter({ hasText: "check #1042" })).toBeVisible();

    // More than the balance is refused in the form before it reaches the Api.
    await dialog.locator('[data-testid="record-registration-payment"]').click();
    form = await fillPayment(page, "25.01", "Cash");
    await expect(form.locator('[data-testid="registration-payment-save"]')).toBeDisabled();
    await form.locator('[data-testid="registration-payment-amount"] input').fill("25");
    post = page.waitForResponse((r) => r.url().includes(`/registrations/${registrationId}/payments`) && r.request().method() === "POST", { timeout: 15000 });
    await form.locator('[data-testid="registration-payment-save"]').click();
    expect((await post).ok()).toBeTruthy();
    await expect(dialog.getByText("$45.00 / $45.00")).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('[data-testid="record-registration-payment"]')).toHaveCount(0);

    await dialog.getByRole("button", { name: "Close" }).click();
    const row = page.locator('[data-testid="registration-row"]').filter({ hasText: PERSON_NAME });
    await expect(row.getByText("confirmed", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("Record Refund gives cash back without a gateway call and lowers the paid total", async ({ page }) => {
    const dialog = await openDetails(page);
    await dialog.locator('[data-testid="record-registration-refund"]').click();
    const form = await fillPayment(page, "5", "Cash");
    const post = page.waitForResponse((r) => r.url().includes(`/registrations/${registrationId}/refunds`) && r.request().method() === "POST", { timeout: 15000 });
    await form.locator('[data-testid="registration-payment-save"]').click();
    expect((await post).ok()).toBeTruthy();
    await expect(dialog.getByText("$40.00 / $45.00")).toBeVisible({ timeout: 10000 });
    await expect(dialog.locator('[data-testid="registration-payment-row"]').filter({ hasText: "refund" })).toBeVisible();
    // Offline payments are never refunded through the gateway.
    await expect(dialog.locator('[data-testid="refund-registration-payment"]')).toHaveCount(0);
  });

  test("Refund on an online payment posts the amount to the gateway refund endpoint", async ({ page }) => {
    const charge = { id: "PAYCARD0001", registrationId, kind: "charge", method: "card", provider: "stripe", transactionId: "pi_test", amount: 45, currency: "usd", status: "succeeded", createdDate: new Date().toISOString() };
    let refundBody: { amount?: number } | null = null;
    await page.route(new RegExp(`/content/registrations/${registrationId}$`), async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      await route.fulfill({ response, json: { ...body, status: "confirmed", amountPaid: 45, payments: [charge] } });
    });
    await page.route(/\/content\/registrations\/payments\/PAYCARD0001\/refund$/, async (route) => {
      refundBody = route.request().postDataJSON();
      await route.fulfill({ json: { registration: { id: registrationId, status: "confirmed", amountPaid: 30 }, payments: [charge, { ...charge, id: "PAYREF0001", kind: "refund", amount: 15 }] } });
    });

    const dialog = await openDetails(page);
    await dialog.locator('[data-testid="refund-registration-payment"]').click();
    const form = page.locator('[data-testid="registration-payment-dialog"]');
    await expect(form.locator('[data-testid="registration-payment-amount"] input')).toHaveValue("45.00");
    await expect(form.locator('[data-testid="registration-payment-method"]')).toHaveCount(0);
    await form.locator('[data-testid="registration-payment-amount"] input').fill("45.01");
    await expect(form.locator('[data-testid="registration-payment-save"]')).toBeDisabled();
    await form.locator('[data-testid="registration-payment-amount"] input').fill("15");
    await form.locator('[data-testid="registration-payment-save"]').click();
    await expect(form).toHaveCount(0, { timeout: 10000 });
    expect(refundBody).toEqual({ amount: 15 });
    await expect(dialog.getByText("$30.00 / $45.00")).toBeVisible();
    await expect(dialog.locator('[data-testid="refund-registration-payment"]')).toBeVisible();
  });
});
