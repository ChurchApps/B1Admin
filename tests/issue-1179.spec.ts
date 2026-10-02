import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// #1179: Forms > Submissions listed questions alphabetically by title instead of in
// the order the admin arranged them on the form.
const API = process.env.API_BASE || "http://localhost:8084";
const FORM_NAME = "Issue 1179 Question Order";
const DONALD_CLARK = "PER00000080";

test.describe.serial("Form submissions keep the form's question order", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let formId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    expect(uc?.jwt).toBeTruthy();
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };

    const formRes = await ctx.post(`${API}/membership/forms`, { ...auth, data: [{ name: FORM_NAME, contentType: "person" }] });
    expect(formRes.ok()).toBeTruthy();
    formId = (await formRes.json())?.[0]?.id;
    expect(formId).toBeTruthy();

    const qRes = await ctx.post(`${API}/membership/questions`, {
      ...auth,
      data: [
        { formId, title: "Name", fieldType: "Textbox", sort: 1 },
        { formId, title: "Are you baptized?", fieldType: "Yes/No", sort: 2 }
      ]
    });
    expect(qRes.ok()).toBeTruthy();
    const questions = await qRes.json();
    const nameId = questions.find((q: any) => q.title === "Name")?.id;
    const baptizedId = questions.find((q: any) => q.title === "Are you baptized?")?.id;
    expect(nameId && baptizedId).toBeTruthy();

    const subRes = await ctx.post(`${API}/membership/formsubmissions`, {
      ...auth,
      data: [
        {
          formId,
          contentType: "person",
          contentId: DONALD_CLARK,
          submittedBy: DONALD_CLARK,
          answers: [{ questionId: nameId, value: "Donald Clark" }, { questionId: baptizedId, value: "True" }]
        }
      ]
    });
    expect(subRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (formId) await ctx.delete(`${API}/membership/forms/${formId}`, auth);
    await ctx?.dispose();
  });

  test("the submissions table lists questions in form order", async ({ page }) => {
    await page.goto(`/forms/${formId}`);
    await page.getByText("Form Submissions", { exact: true }).first().click();

    await expect(page.getByText("Form Submission Results")).toBeVisible({ timeout: 15000 });
    const headers = page.getByRole("columnheader");
    await expect(headers.filter({ hasText: "Are you baptized?" })).toBeVisible();
    const texts = (await headers.allTextContents()).map((t) => t.trim());
    expect(texts.indexOf("Name")).toBeGreaterThan(-1);
    expect(texts.indexOf("Name")).toBeLessThan(texts.indexOf("Are you baptized?"));
  });
});
