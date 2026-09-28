import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue 1135: anonymous submissions can only be read (or printed) from the
// Forms > Submissions table, which has one column per question. The table sat inside
// an overflow-hidden Card with no scroll container, so on a form with many questions
// the right-hand columns were cut off and there was no way to reach them.
const API = process.env.API_BASE || "http://localhost:8084";
const FORM_NAME = "Issue 1135 Long Anonymous Form";
const QUESTION_COUNT = 11;
const titleFor = (i: number) => `Question ${String(i).padStart(2, "0")}`;

test.describe.serial("Form submissions table with many questions", () => {
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

    const formRes = await ctx.post(`${API}/membership/forms`, { ...auth, data: [{ name: FORM_NAME, contentType: "form" }] });
    expect(formRes.ok()).toBeTruthy();
    formId = (await formRes.json())?.[0]?.id;
    expect(formId).toBeTruthy();

    const questions = Array.from({ length: QUESTION_COUNT }, (_, i) => ({ formId, title: titleFor(i + 1), fieldType: "Textbox", sort: i + 1 }));
    const qRes = await ctx.post(`${API}/membership/questions`, { ...auth, data: questions });
    expect(qRes.ok()).toBeTruthy();
    const saved: any[] = await qRes.json();

    const answers = saved.map((q: any) => ({ questionId: q.id, value: "Answer for " + q.title }));
    const subRes = await ctx.post(`${API}/membership/formsubmissions`, {
      ...auth,
      data: [{ formId, contentType: "form", contentId: formId, submittedBy: "", submissionDate: new Date().toISOString(), answers }]
    });
    expect(subRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (formId) await ctx.delete(`${API}/membership/forms/${formId}`, auth);
    await ctx?.dispose();
  });

  test("every question column of an anonymous submission can be reached", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/forms/${formId}`);
    await page.getByText("Form Submissions", { exact: true }).first().click();

    const card = page.locator(".MuiCard-root").filter({ hasText: "Form Submission Results" });
    await expect(card).toBeVisible({ timeout: 15000 });
    const lastHeader = card.getByRole("columnheader", { name: titleFor(QUESTION_COUNT) });
    await expect(lastHeader).toBeAttached();

    // Scroll the table sideways the way a user would, then check the last column is on screen inside the card.
    await card.getByRole("table").hover();
    await page.mouse.wheel(4000, 0);
    await expect.poll(async () => {
      const c = await card.boundingBox();
      const h = await lastHeader.boundingBox();
      return !!c && !!h && h.x >= c.x && h.x + h.width <= c.x + c.width + 1;
    }, { timeout: 5000 }).toBe(true);
    await expect(card.getByRole("cell", { name: "Answer for " + titleFor(QUESTION_COUNT) })).toBeVisible();
  });
});
