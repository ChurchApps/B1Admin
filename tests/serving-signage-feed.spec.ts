import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Digital signage feed: a plan type acts like a lessons.church classroom — the feed url
// resolves the current plan and emits the SignPresenter external-playlist format.
const API = "http://localhost:8084";
const WORSHIP_MINISTRY_ID = "GRP0000000a";
// Venue/section on api.lessons.church that the demo data also uses; its "play" actions carry files.
const VENUE_ID = "keYYf8Z8ZD1";
const SECTION_ID = "Xc5mhXN_RED";
const PLAN_TYPE_NAME = "Signage Feed Spec Plans";

// Local (not UTC) calendar day, so the plan lands inside the API's CURDATE() window.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Digital Signage feed", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let planTypeId: string;
  let planId: string;

  // The demo seed's current plan for PLT00000001 flips between plans depending on the
  // weekday, so this spec owns a plan type whose only plan is today's lesson plan.
  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };

    const typeRes = await ctx.post(`${API}/doing/planTypes`, { ...auth, data: [{ ministryId: WORSHIP_MINISTRY_ID, name: PLAN_TYPE_NAME }] });
    expect(typeRes.ok()).toBeTruthy();
    planTypeId = (await typeRes.json())[0].id;
    expect(planTypeId).toBeTruthy();

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ ministryId: WORSHIP_MINISTRY_ID, planTypeId, name: "Signage Feed Spec Plan", serviceDate: today(), contentType: "lesson", contentId: VENUE_ID }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;
    expect(planId).toBeTruthy();

    const headerRes = await ctx.post(`${API}/doing/planItems`, { ...auth, data: [{ planId, sort: 1, itemType: "header", label: "Lesson Playback" }] });
    expect(headerRes.ok()).toBeTruthy();
    const headerId = (await headerRes.json())[0].id;

    const sectionRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, parentId: headerId, sort: 1, itemType: "lessonSection", relatedId: SECTION_ID, label: "Section 1" }]
    });
    expect(sectionRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    try {
      if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, auth);
      if (planTypeId) await ctx.delete(`${API}/doing/planTypes/${planTypeId}`, auth);
    } catch { /* ignore */ }
    await ctx?.dispose();
  });

  test("plan type page exposes a copyable feed url", async ({ page }) => {
    await page.goto("/serving/planTypes/PLT00000001");
    await page.getByTestId("signage-feed-button").click();

    const urlInput = page.getByTestId("signage-feed-url");
    await expect(urlInput).toBeVisible({ timeout: 15000 });
    const feedUrl = await urlInput.inputValue();
    expect(feedUrl).toMatch(/\/doing\/planFeed\/signage\/PLT00000001$/);

    await page.getByTestId("close-signage-feed").click();
    await expect(urlInput).toHaveCount(0);
  });

  test("feed endpoint emits SignPresenter-compatible messages for the current plan", async ({ page }) => {
    const resp = await page.request.get(`${API}/doing/planFeed/signage/${planTypeId}`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();

    expect(Array.isArray(data.messages)).toBeTruthy();
    expect(data.messages.length).toBeGreaterThan(0);
    for (const message of data.messages) {
      expect(typeof message.name).toBe("string");
      expect(message.files.length).toBeGreaterThan(0);
      for (const file of message.files) {
        expect(file.url).toMatch(/^https?:\/\//);
        expect(typeof file.seconds).toBe("number");
        expect(typeof file.loopVideo).toBe("boolean");
      }
    }
  });

  test("feed endpoint returns empty messages for an unknown plan type", async ({ page }) => {
    const resp = await page.request.get(`${API}/doing/planFeed/signage/NOSUCHTYPE`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.messages).toEqual([]);
  });
});
