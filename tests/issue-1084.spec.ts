import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1084: the Service Order song search had no error handling, so a slow or
// failing /songs/search left the spinner running forever with no way to recover
// other than closing the dialog and searching again.
const API = process.env.API_BASE || "http://localhost:8084";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Serving - song search error handling", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let planId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    const auth = { headers: { Authorization: "Bearer " + jwt } };

    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [{ name: "Issue1084 Search Failure Repro", serviceDate: "2030-06-01", serviceOrder: true }]
    });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;

    const itemsRes = await ctx.post(`${API}/doing/planItems`, {
      ...auth,
      data: [{ planId, sort: 1, itemType: "header", label: "Issue1084 Section" }]
    });
    expect(itemsRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, { headers: { Authorization: "Bearer " + jwt } });
    await ctx.dispose();
  });

  test("a failed song search clears the spinner and reports the failure", async ({ page }) => {
    const failure = { status: 500, contentType: "application/json", body: JSON.stringify({ errors: ["Search timed out"] }) };
    await page.route("**/songs/search**", (route) => route.fulfill(failure));
    await page.goto(`/serving/plans/${planId}`);
    await page.getByRole("tab", { name: "Service Order" }).click({ timeout: 20000 });
    await expect(page.getByText("Issue1084 Section")).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", { name: "Add Item" }).first().click();
    await page.getByRole("menuitem").filter({ hasText: "Song" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByTestId("song-search-input").locator("input").fill("Issue1084");
    await dialog.getByTestId("song-search-button").click();

    // The spinner has to stop; leaving it up is the reported "stuck" state.
    await expect(dialog.locator(".MuiCircularProgress-root")).toHaveCount(0, { timeout: 15000 });
    await expect(dialog.getByTestId("song-search-error")).toBeVisible({ timeout: 15000 });

    // And the search box stays usable so a retry does not need the dialog reopened.
    await expect(dialog.getByTestId("song-search-button")).toBeEnabled();
  });
});
