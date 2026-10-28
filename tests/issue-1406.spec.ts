import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1406: song page and plan song picker problems.
// Demo song "It Is Well With My Soul" (SON00000010) is in Eb and has two
// arrangements, Traditional (Eb key) and Modern (C key).
const API = process.env.API_BASE || "http://localhost:8084";
const SONG_ID = "SON00000010";
const TRADITIONAL_ID = "ARR00000014";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Issue 1406 - songs", () => {
  test.describe.configure({ mode: "default", retries: 0 });
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let planId = "";
  let originalLyrics = "";
  const createdArrangementIds: string[] = [];

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };

    const arr = await (await ctx.get(`${API}/content/arrangements/${TRADITIONAL_ID}`, auth)).json();
    originalLyrics = arr.lyrics;
    const saved = await ctx.post(`${API}/content/arrangements`, { ...auth, data: [{ ...arr, lyrics: "[Eb]When peace [Ab]like a [Bb]river" }] });
    expect(saved.ok()).toBeTruthy();

    const planRes = await ctx.post(`${API}/doing/plans`, { ...auth, data: [{ name: "Issue1406 Picker Repro", serviceDate: "2030-05-01", serviceOrder: true }] });
    expect(planRes.ok()).toBeTruthy();
    planId = (await planRes.json())[0].id;
    const itemsRes = await ctx.post(`${API}/doing/planItems`, { ...auth, data: [{ planId, sort: 1, itemType: "header", label: "Issue1406 Section" }] });
    expect(itemsRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    const arr = await (await ctx.get(`${API}/content/arrangements/${TRADITIONAL_ID}`, auth)).json();
    await ctx.post(`${API}/content/arrangements`, { ...auth, data: [{ ...arr, lyrics: originalLyrics }] });
    for (const id of createdArrangementIds) await ctx.delete(`${API}/content/arrangements/${id}`, auth);
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, auth);
    await ctx.dispose();
  });

  test("flat key and flat chords keep their flat names", async ({ page }) => {
    await page.goto(`/serving/songs/${SONG_ID}`);
    const view = page.getByTestId("arrangement-view");
    await expect(view.getByRole("combobox")).toHaveText("Eb", { timeout: 20000 });
    await expect(view.locator(".chordPro sup")).toHaveText(["Eb", "Ab", "Bb"]);
  });

  test("arrangement edit shows a real ChordPro hint", async ({ page }) => {
    await page.goto(`/serving/songs/${SONG_ID}`);
    await page.getByTestId("arrangement-edit-button").click();
    await expect(page.getByText("ChordPro format:", { exact: false })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Chord Pro Hint")).toHaveCount(0);
  });

  test("a newly added arrangement offers the Key picker", async ({ page }) => {
    await page.goto(`/serving/songs/${SONG_ID}`);
    await expect(page.getByTestId("arrangement-view")).toBeVisible({ timeout: 20000 });
    const created = page.waitForResponse((r) => r.url().endsWith("/content/arrangements") && r.request().method() === "POST");
    await page.getByTestId("add-arrangement-button").click();
    createdArrangementIds.push((await (await created).json())[0].id);
    const view = page.getByTestId("arrangement-view");
    await expect(view).toContainText("New Arrangement", { timeout: 20000 });
    await expect(view.getByRole("combobox")).toHaveText("Eb");
  });

  test("songs list uses the singular for one result", async ({ page }) => {
    await page.goto("/serving/songs");
    await page.getByLabel("Search Songs").fill("It Is Well");
    await expect(page.getByText(/^1 songs?$/)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("1 song", { exact: true })).toBeVisible();
  });

  test("plan song picker names each arrangement", async ({ page }) => {
    await page.goto(`/serving/plans/${planId}`);
    await expect(page.getByText("Issue1406 Section")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Add Item" }).first().click();
    await page.getByRole("menuitem").filter({ hasText: "Song" }).click();
    await page.getByTestId("song-search-input").locator("input").fill("It Is Well");
    await page.getByTestId("song-search-button").click();
    const chips = page.getByRole("dialog").locator(".MuiChip-root");
    await expect(chips.filter({ hasText: "Traditional · Traditional key (Eb)" })).toBeVisible({ timeout: 15000 });
    await expect(chips.filter({ hasText: "Modern · Modern key (C)" })).toBeVisible();
  });
});
