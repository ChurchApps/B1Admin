import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Forms > Form Submissions only used two-thirds of the content column, so the
// results table was squeezed and scrolled sideways. It should use the full width.
const API = process.env.API_BASE || "http://localhost:8084";
const FORM_NAME = "Form Submissions Width Spec";
const DONALD_CLARK = "PER00000080";

test.describe.serial("Form submissions", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let formId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };

    const formRes = await ctx.post(`${API}/membership/forms`, { ...auth, data: [{ name: FORM_NAME, contentType: "person" }] });
    formId = (await formRes.json())?.[0]?.id;
    expect(formId).toBeTruthy();
    const qRes = await ctx.post(`${API}/membership/questions`, { ...auth, data: [{ formId, title: "Favorite Hymn", fieldType: "Textbox", sort: 1 }] });
    const questionId = (await qRes.json())?.[0]?.id;
    const subRes = await ctx.post(`${API}/membership/formsubmissions`, {
      ...auth,
      data: [{ formId, contentType: "person", contentId: DONALD_CLARK, submittedBy: DONALD_CLARK, answers: [{ questionId, value: "Amazing Grace" }] }]
    });
    expect(subRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (formId) await ctx.delete(`${API}/membership/forms/${formId}`, auth);
    await ctx?.dispose();
  });

  test("the submissions tab uses the full content width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/forms/${formId}`);
    await page.getByText("Form Submissions", { exact: true }).first().click();
    await expect(page.getByText("Form Submission Results")).toBeVisible({ timeout: 15000 });

    const content = page.locator("div.form-submission-summary > div.form-submission-summary");
    const column = content.locator("xpath=../..");
    const contentBox = await content.boundingBox();
    const columnBox = await column.boundingBox();
    expect(contentBox && columnBox).toBeTruthy();
    expect(contentBox!.width / columnBox!.width).toBeGreaterThan(0.95);
  });
});

// A Payment question on a person form filled in from the person's record has to look up
// the church's gateway. It used to ask for /donate/gateways/ with no church id and always
// showed "Online payment is not available" even though Grace has a Stripe gateway.
test.describe.serial("Form payment question from a person's record", () => {
  const PAYMENT_FORM = "Form Payment From Record Spec";
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let formId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };

    const formRes = await ctx.post(`${API}/membership/forms`, { ...auth, data: [{ name: PAYMENT_FORM, contentType: "person" }] });
    formId = (await formRes.json())?.[0]?.id;
    expect(formId).toBeTruthy();
    const qRes = await ctx.post(`${API}/membership/questions`, { ...auth, data: [{ formId, title: "Retreat Fee", fieldType: "Payment", sort: 1, choices: [{ value: "25", text: "Amount" }] }] });
    expect(qRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (formId) await ctx.delete(`${API}/membership/forms/${formId}`, auth);
    await ctx?.dispose();
  });

  test("the payment question shows the card form instead of 'not available'", async ({ page }) => {
    const gateways = page.waitForResponse((r) => r.url().includes("/donate/gateways/"));
    await page.goto(`/people/${DONALD_CLARK}?view=forms&form=${formId}`);
    await expect(page.locator("h2").getByText(PAYMENT_FORM)).toBeVisible({ timeout: 15000 });
    await page.getByTestId("small-button-edit").last().click();
    expect((await gateways).url()).toContain("/donate/gateways/CHU00000001");
    await expect(page.getByLabel("Email", { exact: false }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Online payment is not available for this church.")).toHaveCount(0);
  });
});
