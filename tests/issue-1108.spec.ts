import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToPeople } from "./helpers/navigation";
import { openPersonRow } from "./helpers/fixtures";

// Issue #1108 (part 2): a person who submits the same form more than once only ever
// gets one of those submissions rendered on their Forms tab. The others are invisible
// until the visible one is deleted. The Api returns every submission - PersonForms
// collapsed them into a map keyed by formId, so each one overwrote the last.
const API = process.env.API_BASE || "http://localhost:8084";
const BRIAN_HARRIS = "PER00000079"; // demo seed person with one Visitor Information Card submission
const VISITOR_FORM = "FRM00000001";
const EMAIL_QUESTION = "QST00000003";
const FIRST_NAME_QUESTION = "QST00000001";

const SEEDED_EMAIL = "brian.harris@email.com"; // FSB00000001, submitted 2025-09-15
const SECOND_EMAIL = "brian.harris.second@example.com"; // the extra submission this spec adds

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe.configure({ mode: "serial" });

test.describe("Issue #1108 - every submission of a repeated form is viewable", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let extraSubmissionId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };

    // Brian fills the visitor card out a second time, a year after the seeded one.
    const res = await ctx.post(`${API}/membership/formsubmissions`, {
      ...auth,
      data: [
        {
          formId: VISITOR_FORM,
          contentType: "person",
          contentId: BRIAN_HARRIS,
          submissionDate: "2026-09-15T10:30:00.000Z",
          submittedBy: BRIAN_HARRIS,
          answers: [
            { questionId: FIRST_NAME_QUESTION, value: "Brian" },
            { questionId: EMAIL_QUESTION, value: SECOND_EMAIL }
          ]
        }
      ]
    });
    expect(res.ok()).toBeTruthy();
    const saved = await res.json();
    extraSubmissionId = saved?.[0]?.id;
    expect(extraSubmissionId).toBeTruthy();
  });

  test.afterAll(async () => {
    if (extraSubmissionId) await ctx.delete(`${API}/membership/formsubmissions/${extraSubmissionId}`, auth);
    await ctx.dispose();
  });

  test("both Visitor Information Card submissions are reachable from the person's Forms tab", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, "Brian Harris");
    await page.getByRole("tab", { name: "Forms" }).click();

    const railItem = page.getByText("Visitor Information Card", { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 10000 });
    await railItem.click();

    const pane = page.locator('[data-testid="display-box-content"]');

    // The newest submission opens by default.
    await expect(pane.getByText(SECOND_EMAIL)).toBeVisible({ timeout: 10000 });

    // The earlier submission is still reachable instead of being overwritten.
    const options = page.locator('[data-testid="submission-picker"] [data-testid^="submission-option-"]');
    await expect(options).toHaveCount(2, { timeout: 10000 });
    await options.nth(1).click();
    await expect(pane.getByText(SEEDED_EMAIL)).toBeVisible({ timeout: 10000 });
  });
});
