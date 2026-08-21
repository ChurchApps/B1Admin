import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #961: an arrangement key with no key signature rendered as "Default ()"
// in the song picker chip and in the saved plan item description.
const API = "http://localhost:8084";

const SEARCH_RESULTS = [
  {
    id: "ISSUE961SD1",
    title: "Issue961 Repro Hymn",
    artist: "Traditional Hymn",
    arrangementKeyId: "ISSUE961AK1",
    shortDescription: "Default",
    arrangementKeySignature: "",
    seconds: 240
  }
];

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Serving - song key formatting", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ name: "Issue961 Key Format Repro", serviceDate: "2030-05-01", serviceOrder: true }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const itemsRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, sort: 1, itemType: "header", label: "Issue961 Section" }]
    });
    expect(itemsRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("empty key signature does not render empty parentheses", async ({ page }) => {
    await page.route("**/songs/search**", (route) => route.fulfill({ json: SEARCH_RESULTS }));
    await page.goto(`/serving/plans/${planId}`);
    await page.getByRole("tab", { name: "Service Order" }).click({ timeout: 20000 });
    await expect(page.getByText("Issue961 Section")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Add Item" }).first().click();
    await page.getByRole("menuitem").filter({ hasText: "Song" }).click();

    await page.getByTestId("song-search-input").locator("input").fill("Issue961");
    await page.getByTestId("song-search-button").click();

    const chip = page.getByRole("dialog").locator(".MuiChip-root").first();
    await expect(chip).toBeVisible({ timeout: 10000 });
    await expect(chip).toHaveText("Default");

    await chip.click();

    const description = page.locator(".planItemDescription").filter({ hasText: "Traditional Hymn" }).first();
    await expect(description).toBeVisible({ timeout: 15000 });
    await expect(description).not.toContainText("()");
    await expect(description).toContainText("Traditional Hymn - Default");
  });
});
