import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1283: GO! Curriculum (and every provider built on filesToInstructions) returns a flat list
// of play actions, so Customize saved them with no header and the plan had no section bar (no +) to
// add a song into. Separately, Add > Add From Lesson only listed folders, never the files in them.
// Providers are mocked at the API proxy, since no content provider is linked in the local stack.
const API = process.env.API_BASE || "http://localhost:8084";
const MINISTRY_ID = "GRP0000000a";

const FLAT_INSTRUCTIONS = {
  name: "Angels Big Announcement",
  items: [
    { id: "GOACT1", itemType: "action", relatedId: "GOACT1", label: "House Title Slide", actionType: "play", children: [{ id: "GOFILE1", itemType: "file", label: "House Title Slide", downloadUrl: "https://example.com/title.jpg" }] },
    { id: "GOACT2", itemType: "action", relatedId: "GOACT2", label: "Tophers Big Idea", actionType: "play", children: [{ id: "GOFILE2", itemType: "file", label: "Tophers Big Idea", downloadUrl: "https://example.com/idea.mp4" }] }
  ]
};

const BROWSE_ITEMS = [
  { type: "folder", id: "DBXSUB1", title: "Archive", path: "/worship/archive", isLeaf: false },
  { type: "file", id: "DBXFILE1", title: "This Weeks Song.mp4", mediaType: "video", url: "https://example.com/song.mp4", downloadUrl: "https://example.com/song.mp4" }
];

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("issue-1283 adding your own items to a customized GO! lesson", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  test.beforeEach(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const planRes = await ctx.post(`${API}/doing/plans`, {
      headers: { Authorization: "Bearer " + jwt },
      data: [
        {
          name: "GO Lesson Repro Plan",
          serviceDate: "2030-07-01",
          ministryId: MINISTRY_ID,
          planTypeId: "PLT00000001",
          serviceOrder: true,
          providerId: "gocurriculum",
          providerPlanId: "/go/angels-big-announcement",
          providerPlanName: "Angels Big Announcement"
        }
      ]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;
  });

  test.afterEach(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("customizing a flat lesson puts its items under a lesson section bar", async ({ page }) => {
    await page.route("**/providerProxy/getInstructions", (route) => route.fulfill({ json: FLAT_INSTRUCTIONS }));

    await page.goto(`/serving/plans/${planId}`);
    await expect(page.getByTestId("service-order")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Customize" }).click();

    await expect(page.locator(".planItem").filter({ hasText: "House Title Slide" })).toHaveCount(1, { timeout: 15000 });
    await expect(page.locator(".planItemHeader").filter({ hasText: "Angels Big Announcement" })).toHaveCount(1);
  });

  test("Add From Lesson lists the files in a provider folder and adds a clicked one", async ({ page }) => {
    await page.route("**/providerProxy/getInstructions", (route) => route.fulfill({ json: FLAT_INSTRUCTIONS }));
    await page.route("**/providerProxy/browse", (route) => route.fulfill({ json: BROWSE_ITEMS }));
    await page.route(`**/contentProviderAuths/ministry/${MINISTRY_ID}`, (route) => route.fulfill({ json: [{ id: "CPA1", ministryId: MINISTRY_ID, providerId: "gocurriculum" }] }));

    await page.goto(`/serving/plans/${planId}`);
    await expect(page.getByTestId("service-order")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "More ways to add" }).click();
    await page.getByRole("menuitem", { name: /Add from Lesson/i }).click();
    await page.getByRole("button", { name: "Browse Other Providers" }).click();

    const fileCard = page.getByTestId("browse-file-card").filter({ hasText: "This Weeks Song.mp4" });
    await expect(fileCard).toBeVisible({ timeout: 15000 });
    await fileCard.click();
    await expect(page.locator(".planItem").filter({ hasText: "This Weeks Song.mp4" })).toHaveCount(1, { timeout: 15000 });
  });
});
