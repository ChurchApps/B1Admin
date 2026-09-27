import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Forms > Submissions crashed with "(d.choices || i).forEach is not a function"
// for some forms. Forms copied before the #1097 duplicate fix hold their answer choices
// JSON-encoded twice, so the API parsed them back into a string instead of an array.
// Sending choices as a JSON string through the questions endpoint writes the same
// double-encoded value, which is how this spec recreates one of those forms.
const API = process.env.API_BASE || "http://localhost:8084";
const FORM_NAME = "Copied Survey With Encoded Choices";
const DONALD_CLARK = "PER00000080";
const choices = [
  { value: "Sunday Morning", text: "Sunday Morning" },
  { value: "Wednesday Night", text: "Wednesday Night" }
];

test.describe.serial("Form submissions with double-encoded choices", () => {
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
      data: [{ formId, title: "Preferred Service", fieldType: "Multiple Choice", sort: 1, choices: JSON.stringify(choices) }]
    });
    expect(qRes.ok()).toBeTruthy();
    const questionId = (await qRes.json())?.[0]?.id;
    expect(questionId).toBeTruthy();

    const subRes = await ctx.post(`${API}/membership/formsubmissions`, {
      ...auth,
      data: [{ formId, contentType: "person", contentId: DONALD_CLARK, submittedBy: DONALD_CLARK, answers: [{ questionId, value: "Wednesday Night" }] }]
    });
    expect(subRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (formId) await ctx.delete(`${API}/membership/forms/${formId}`, auth);
    await ctx?.dispose();
  });

  test("the Form Submissions tab lists the submission instead of crashing", async ({ page }) => {
    await page.goto(`/forms/${formId}`);
    await page.getByText("Form Submissions", { exact: true }).first().click();

    await expect(page.getByText("Form Submission Results")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Oops! An Error Occurred")).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Donald Clark" })).toBeVisible();
    await expect(page.getByText("Wednesday Night").first()).toBeVisible();
  });
});
