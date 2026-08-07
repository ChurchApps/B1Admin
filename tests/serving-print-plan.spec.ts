import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #979: lesson print formats must respect plan customizations (deleted
// sections/actions must not print; kept sections print as-is). LessonsApi isn't
// in the local stack, so the venue feed is mocked via route interception and the
// plan is seeded through DoingApi.
const API = "http://localhost:8084";

const VENUE_FEED = {
  id: "PRINTVENUE1",
  lessonId: "PRINTLESSON1",
  name: "Print Test Venue",
  lessonName: "Print Repro Lesson",
  studyName: "Print Study",
  sections: [
    { id: "PRINTSEC1", name: "Opening", actions: [{ id: "PRINTACT1", actionType: "say", content: "Welcome everyone to class" }] },
    { id: "PRINTSEC2", name: "Big Review", actions: [{ id: "PRINTACT2", actionType: "say", content: "Review last week together" }] },
    {
      id: "PRINTSEC3",
      name: "Engage",
      actions: [
        { id: "PRINTACT3", actionType: "say", content: "Play the intro video" },
        { id: "PRINTACT4", actionType: "say", content: "Removed action content" },
        { id: "PRINTACT5", actionType: "say", content: "Closing prayer time" }
      ]
    }
  ]
};

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Serving - Print Plan lesson customizations", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ name: "Print Customization Repro", serviceDate: "2030-04-01", contentType: "venue", contentId: "PRINTVENUE1" }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    // "Opening" stays as an unexpanded section (whitespace/case differs from the
    // feed name on purpose — matching must be normalized). "Big Review" was
    // deleted (no plan item). "Engage" was expanded and PRINTACT4 deleted.
    const itemsRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [
        { planId, sort: 1, itemType: "header", label: " OPENING " },
        { planId, sort: 2, itemType: "providerPresentation", relatedId: "PRINTACT3", label: "Play the intro video", providerId: "lessonschurch", providerPath: "PRINTVENUE1", providerContentPath: "2.0" },
        { planId, sort: 3, itemType: "providerPresentation", relatedId: "PRINTACT5", label: "Closing prayer time", providerId: "lessonschurch", providerPath: "PRINTVENUE1", providerContentPath: "2.2" }
      ]
    });
    expect(itemsRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("print output reflects deleted sections and actions", async ({ page }) => {
    await page.route("**/venues/public/feed/**", (route) => route.fulfill({ json: VENUE_FEED }));
    await page.goto(`/serving/plans/print/${planId}`);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Opening")).toBeVisible({ timeout: 15000 });

    // Kept-intact section prints all its actions despite the label whitespace/case mismatch.
    await expect(dialog.getByText("Welcome everyone to class")).toBeVisible();
    // Deleted section is gone entirely.
    await expect(dialog.getByText("Big Review")).toHaveCount(0);
    await expect(dialog.getByText("Review last week together")).toHaveCount(0);
    // Expanded section keeps only the surviving actions.
    await expect(dialog.getByText("Engage")).toBeVisible();
    await expect(dialog.getByText("Play the intro video")).toBeVisible();
    await expect(dialog.getByText("Closing prayer time")).toBeVisible();
    await expect(dialog.getByText("Removed action content")).toHaveCount(0);

    // Script format applies the same filtering.
    await page.getByRole("tab", { name: "Script" }).click();
    await expect(dialog.getByText("Welcome everyone to class")).toBeVisible();
    await expect(dialog.getByText("Removed action content")).toHaveCount(0);
    await expect(dialog.getByText("Big Review")).toHaveCount(0);
  });
});
