import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Song library tools: Duplicate on an arrangement copies its details, lyrics and keys (not audio),
// the Songs page exports the library as CSV, and "Export song usage" downloads the songs used on
// plans in a date range. Demo song "It Is Well With My Soul" (SON00000010) has the Traditional (Eb)
// arrangement ARR00000014.
const API = process.env.API_BASE || "http://localhost:8084";
const SONG_ID = "SON00000010";
const TRADITIONAL_ID = "ARR00000014";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe("Serving - song library tools", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let planId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };
    const keys = await (await ctx.get(`${API}/content/arrangementKeys/arrangement/${TRADITIONAL_ID}`, auth)).json();
    const planRes = await ctx.post(`${API}/doing/plans`, { ...auth, data: [{ name: "E2E Song Usage Plan", serviceDate: "2031-03-02", serviceOrder: true }] });
    planId = (await planRes.json())[0].id;
    await ctx.post(`${API}/doing/planItems`, { ...auth, data: [{ planId, sort: 1, itemType: "arrangementKey", relatedId: keys[0].id, label: "It Is Well With My Soul" }] });
  });

  test.afterAll(async () => {
    const arrangements = await (await ctx.get(`${API}/content/arrangements/song/${SONG_ID}`, auth)).json();
    for (const a of arrangements) if (/\(copy( \d+)?\)$/.test(a.name || "")) await ctx.delete(`${API}/content/arrangements/${a.id}`, auth);
    if (planId) await ctx.delete(`${API}/doing/plans/${planId}`, auth);
    await ctx.dispose();
  });

  test("Duplicate copies an arrangement's details, lyrics and keys", async ({ page }) => {
    const original = await (await ctx.get(`${API}/content/arrangements/${TRADITIONAL_ID}`, auth)).json();
    const originalKeys = await (await ctx.get(`${API}/content/arrangementKeys/arrangement/${TRADITIONAL_ID}`, auth)).json();
    await page.goto(`/serving/songs/${SONG_ID}`);
    await page.getByTestId(`arrangement-pill-${TRADITIONAL_ID}`).click();
    await page.getByTestId("arrangement-duplicate-button").click();
    await expect(page.getByTestId("arrangement-view")).toContainText(`${original.name} (copy)`, { timeout: 20000 });

    const arrangements = await (await ctx.get(`${API}/content/arrangements/song/${SONG_ID}`, auth)).json();
    const copy = arrangements.find((a: { name?: string }) => a.name === `${original.name} (copy)`);
    expect(copy).toBeTruthy();
    expect(copy.lyrics).toBe(original.lyrics);
    expect([copy.bpm, copy.meter, copy.seconds, copy.sequence]).toEqual([original.bpm, original.meter, original.seconds, original.sequence]);
    const copyKeys = await (await ctx.get(`${API}/content/arrangementKeys/arrangement/${copy.id}`, auth)).json();
    expect(copyKeys.map((k: { keySignature?: string }) => k.keySignature).sort()).toEqual(originalKeys.map((k: { keySignature?: string }) => k.keySignature).sort());
    const copyFiles = await (await ctx.get(`${API}/content/files/arrangement/${copy.id}`, auth)).json();
    expect(copyFiles || []).toHaveLength(0);
  });

  test("Export downloads the song library with CCLI numbers and keys", async ({ page }) => {
    await page.goto("/serving/songs");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("songs-library-export").getByRole("button").click();
    const download = await downloadPromise;
    const csv = readFileSync(await download.path(), "utf8");
    expect(csv.split(/\r?\n/)[0]).toContain("CCLI");
    expect(csv).toContain("It Is Well With My Soul");
  });

  test("Export song usage downloads the songs used on plans in the range", async ({ page }) => {
    await page.goto("/serving/songs");
    await page.getByTestId("song-usage-export").click();
    await page.getByTestId("song-usage-start").fill("2031-03-01");
    await page.getByTestId("song-usage-end").fill("2031-03-31");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("song-usage-export-button").click();
    const download = await downloadPromise;
    const csv = readFileSync(await download.path(), "utf8");
    expect(csv.split(/\r?\n/)[0]).toBe("Title,Artist,CCLI number,Times used,Plan dates");
    expect(csv).toMatch(/It Is Well With My Soul,.*,1,2031-03-02/);
  });
});
