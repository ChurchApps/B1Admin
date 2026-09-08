import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateTo, navigateToServing } from "./helpers/navigation";

// Commons is a Domain Admin-only moderation tab. demo@b1.church (USR00000001) is a member of
// the "Domain Admins" role (Api/tools/dbScripts/membership/demo.sql, RME00000001 -> ROL00000001),
// which holds a MembershipApi/Domain/Admin rolePermission (RPM00000001). The server expands that
// into every permission — including Server/Admin — via replaceDomainAdminPermissions/addAllPermissions
// (Api/src/modules/membership/helpers/UserHelper.ts), so the demo user does have access to this tab.
const API = process.env.API_BASE || "http://localhost:8084";

const auth = (jwt: string) => ({ headers: { Authorization: "Bearer " + jwt } });

async function apiLogin(ctx: APIRequestContext): Promise<{ userJwt: string; adminJwt: string }> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password", appName: "B1Admin" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const userJwt = body.user?.jwt as string;
  const uc = (body.userChurches || []).find((c: any) => c.apis?.some((a: any) => a.permissions?.some((p: any) => p.contentType === "Server" && p.action === "Admin")));
  expect(userJwt).toBeTruthy();
  expect(uc?.jwt).toBeTruthy();
  return { userJwt, adminJwt: uc.jwt as string };
}

async function seedSongSubmission(ctx: APIRequestContext, userJwt: string, name: string, withFile: boolean): Promise<{ submissionId: string; assetId: string }> {
  const createRes = await ctx.post(`${API}/commons/submissions`, {
    ...auth(userJwt),
    data: {
      assetType: "song",
      payload: {
        name,
        license: "WC",
        tags: "Praise",
        language: "English",
        detail: { writer: "Spec Writer", chordPro: "Verse 1\n[G]Sing", songKey: "G", certified: true }
      }
    }
  });
  expect(createRes.ok()).toBeTruthy();
  const { submissionId, assetId } = await createRes.json();

  if (withFile) {
    const fileRes = await ctx.post(`${API}/commons/submissions/${submissionId}/files`, {
      ...auth(userJwt),
      data: { name: "tune.abc", contentType: "text/plain", base64: Buffer.from("X:1\nK:C\nCDEF|").toString("base64") }
    });
    expect(fileRes.ok()).toBeTruthy();
  }

  const submitRes = await ctx.post(`${API}/commons/submissions/${submissionId}/submit`, { ...auth(userJwt), data: {} });
  expect(submitRes.ok()).toBeTruthy();
  const submitBody = await submitRes.json();
  expect(submitBody.status).toBe("pending");

  return { submissionId, assetId };
}

// The report endpoint is IP rate-limited (3/hour) to deter abuse. Repeated local test runs against
// the same dev Api process exhaust that quickly, so fall back to an already-open policy report.
async function seedOrReusePolicyReport(ctx: APIRequestContext, adminJwt: string, contentText: string): Promise<{ id: string; contentText: string; status: string }> {
  const createRes = await ctx.post(`${API}/commons/reports`, { data: { contentText, reason: "policy", details: "Contains a policy violation." } });
  if (createRes.ok()) {
    const { id } = await createRes.json();
    return { id, contentText, status: "open" };
  }
  const listRes = await ctx.get(`${API}/commons/admin/reports`, auth(adminJwt));
  expect(listRes.ok()).toBeTruthy();
  const reports = (await listRes.json()) as { id: string; reason: string; contentText?: string; status: string }[];
  const existing = reports.find((r) => r.reason !== "copyright" && (r.status === "open" || r.status === "reviewing"));
  expect(existing, "report creation was rate-limited and no open/reviewing policy report exists to reuse").toBeTruthy();
  return { id: existing!.id, contentText: existing!.contentText || "", status: existing!.status };
}

async function openCommons(page: Page) {
  await login(page);
  await navigateTo(page, "serverAdmin");
  const commonsSection = page.locator('[data-testid="settings-section-commons"]');
  await expect(commonsSection).toBeVisible();
  await commonsSection.click();
  await expect(page).toHaveURL(/[?&]tab=commons/);
}

// The listen gate needs a package with a score, chords and slides. The demo catalog (reset-commons)
// seeds ~200 such songs; pick the first one so the spec does not depend on a specific title.
type CatalogSong = { id: string; title: string; hasScore?: boolean; hasChords?: boolean; hasSlides?: boolean; confidence?: string };
async function pickListenableSong(ctx: APIRequestContext): Promise<CatalogSong> {
  const res = await ctx.get(`${API}/commons/songs`);
  expect(res.ok()).toBeTruthy();
  const rows = (await res.json()) as CatalogSong[];
  const song = rows.find((r) => r.hasScore && r.hasChords && r.hasSlides) || rows.find((r) => r.hasScore);
  expect(song, "no demo song with a score — run reset-commons first").toBeTruthy();
  return song!;
}

test.describe("serverAdmin Commons tab", () => {
  test("moderates submissions, reports and assets end to end", async ({ page, request }) => {
    const suffix = Date.now();
    const title1 = `Spec Song Approve ${suffix}`;
    const title2 = `Spec Song Reject ${suffix}`;
    const reportMarker = `Spec Policy Report ${suffix}`;

    const { userJwt, adminJwt } = await apiLogin(request);
    const sub1 = await seedSongSubmission(request, userJwt, title1, true);
    const sub2 = await seedSongSubmission(request, userJwt, title2, false);

    const report = await seedOrReusePolicyReport(request, adminJwt, reportMarker);
    const reportId = report.id;

    await openCommons(page);

    // (a) queue shows the seeded submission with the New badge and submitter
    const row1 = page.locator(`[data-testid="commons-queue-row-${sub1.submissionId}"]`);
    await expect(row1).toBeVisible();
    await expect(row1.getByText(title1)).toBeVisible();
    await expect(row1.getByText("New", { exact: true })).toBeVisible();
    await expect(row1.getByText("Demo", { exact: false })).toBeVisible();

    // (b) review drawer: type chip, intake findings, payload fields + file, approve publishes the asset
    await row1.getByTestId(`commons-review-${sub1.submissionId}`).click();
    const drawer = page.getByTestId("commons-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("commons-drawer-type")).toHaveText("New song");
    await expect(drawer.getByTestId("commons-intake-findings")).toBeVisible();
    await expect(drawer.getByText("Spec Writer")).toBeVisible();
    await expect(drawer.getByText("tune.abc")).toBeVisible();

    await drawer.getByTestId("commons-drawer-approve").click();
    await page.getByTestId("commons-drawer-approve-confirm").click();
    await expect(row1).not.toBeVisible();

    const publishedAsset = await request.get(`${API}/commons/assets/${sub1.assetId}`, auth(adminJwt));
    expect(publishedAsset.ok()).toBeTruthy();
    expect((await publishedAsset.json()).status).toBe("published");

    // (c) quick reject requires a note before it will submit
    const row2 = page.locator(`[data-testid="commons-queue-row-${sub2.submissionId}"]`);
    await expect(row2).toBeVisible();
    await row2.getByTestId(`commons-reject-${sub2.submissionId}`).click();
    const confirmBtn = page.getByTestId("commons-reject-confirm");
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();
    await page.getByTestId("commons-reject-note").locator("textarea").first().fill("Needs more detail before it can be published.");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await expect(row2).not.toBeVisible();

    // (d) reports: policy report claim + resolve
    await page.getByTestId("commons-tab-reports").click();
    const reportRow = page.getByTestId(`commons-report-${reportId}`);
    await expect(reportRow).toBeVisible();
    await reportRow.click();
    await expect(page.getByText(report.contentText, { exact: false })).toBeVisible();
    await page.getByTestId(`commons-claim-${reportId}`).click();
    await expect(reportRow.getByText("reviewing")).toBeVisible();

    await page.getByTestId(`commons-resolve-${reportId}`).click();
    await expect(reportRow).not.toBeVisible();
    const resolvedRow = page.getByTestId(`commons-report-resolved-${reportId}`);
    await expect(resolvedRow).toBeVisible();
    await expect(resolvedRow).toContainText("Dismissed");

    // (e) assets: search, unpublish, republish
    await page.getByTestId("commons-tab-assets").click();
    await page.getByTestId("commons-asset-search").fill(title1);
    const assetRow = page.getByTestId(`commons-asset-${sub1.assetId}`);
    await expect(assetRow).toBeVisible();
    await expect(assetRow.getByText("Published")).toBeVisible();

    await assetRow.getByTestId(`commons-asset-unpublish-${sub1.assetId}`).click();
    await expect(assetRow.getByText("Unpublished")).toBeVisible();

    await assetRow.getByTestId(`commons-asset-republish-${sub1.assetId}`).click();
    await expect(assetRow.getByText("Published")).toBeVisible();
  });

  test("quick reject offers the CCLI reason and posts reason=ccli", async ({ page, request }) => {
    const title = `Spec Song CCLI ${Date.now()}`;
    const { userJwt } = await apiLogin(request);
    const sub = await seedSongSubmission(request, userJwt, title, false);

    await openCommons(page);

    const row = page.locator(`[data-testid="commons-queue-row-${sub.submissionId}"]`);
    await expect(row).toBeVisible();
    await row.getByTestId(`commons-reject-${sub.submissionId}`).click();

    // The reason dropdown must render the translated label, not the raw locale key.
    await page.getByTestId("commons-reject-reason").click();
    const ccliOption = page.getByRole("option", { name: "Copyrighted (CCLI) song" });
    await expect(ccliOption).toBeVisible();
    await expect(page.getByRole("listbox")).not.toContainText("serverAdmin.commonsTab.rejectReason.ccli");
    await ccliOption.click();

    await page.getByTestId("commons-reject-note").locator("textarea").first().fill("This song is in the CCLI catalog.");

    const rejectRequest = page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/commons/admin/submissions/${sub.submissionId}/reject`));
    await page.getByTestId("commons-reject-confirm").click();
    await expect(row).not.toBeVisible();

    const posted = (await rejectRequest).postDataJSON();
    expect(posted.reason).toBe("ccli");
    expect(String(posted.note || "").trim().length).toBeGreaterThan(0);
  });

  test("request changes returns the submission to the submitter as a draft with the note", async ({ page, request }) => {
    const title = `Spec Song Changes ${Date.now()}`;
    const note = "Please add the second verse before we publish.";
    const { userJwt } = await apiLogin(request);
    const sub = await seedSongSubmission(request, userJwt, title, false);

    await openCommons(page);

    const row = page.locator(`[data-testid="commons-queue-row-${sub.submissionId}"]`);
    await expect(row).toBeVisible();
    await row.getByTestId(`commons-review-${sub.submissionId}`).click();
    const drawer = page.getByTestId("commons-drawer");
    await expect(drawer).toBeVisible();

    await drawer.getByTestId("commons-drawer-request-changes").click();
    const confirm = drawer.getByTestId("commons-request-changes-confirm");
    await expect(confirm).toBeDisabled();
    await drawer.getByTestId("commons-request-changes-note").locator("textarea").first().fill(note);
    await expect(confirm).toBeEnabled();

    const changesRequest = page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/commons/admin/submissions/${sub.submissionId}/request-changes`));
    await confirm.click();
    expect((await changesRequest).postDataJSON().note).toBe(note);
    await expect(row).not.toBeVisible();

    // The submitter sees it back in their drafts with the reviewer's note.
    const mine = await request.get(`${API}/commons/submissions/mine`, auth(userJwt));
    expect(mine.ok()).toBeTruthy();
    const returned = ((await mine.json()) as any[]).find((s) => s.id === sub.submissionId);
    expect(returned, "submission missing from /commons/submissions/mine").toBeTruthy();
    expect(returned.status).toBe("draft");
    expect(returned.reviewNote).toBe(note);
  });

  test("partial approve declines one proposed file and still publishes the asset", async ({ page, request }) => {
    const title = `Spec Song Partial ${Date.now()}`;
    const reason = "ABC does not match the chart";
    const { userJwt, adminJwt } = await apiLogin(request);
    const sub = await seedSongSubmission(request, userJwt, title, true);

    await openCommons(page);

    const row = page.locator(`[data-testid="commons-queue-row-${sub.submissionId}"]`);
    await expect(row).toBeVisible();
    await row.getByTestId(`commons-review-${sub.submissionId}`).click();
    const drawer = page.getByTestId("commons-drawer");
    await expect(drawer).toBeVisible();

    await drawer.getByTestId("commons-file-decline-tune.abc").check();
    await drawer.getByTestId("commons-file-decline-reason-tune.abc").fill(reason);
    await drawer.getByTestId("commons-drawer-approve").click();

    // The confirm dialog lists what is being declined.
    const declinedList = page.getByTestId("commons-approve-declined-list");
    await expect(declinedList).toBeVisible();
    await expect(declinedList).toContainText("tune.abc");
    await expect(declinedList).toContainText(reason);

    const approveRequest = page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/commons/admin/submissions/${sub.submissionId}/approve`));
    await page.getByTestId("commons-drawer-approve-confirm").click();
    const posted = (await approveRequest).postDataJSON();
    expect(posted.declineFiles).toEqual([{ name: "tune.abc", reason }]);
    await expect(row).not.toBeVisible();

    const publishedAsset = await request.get(`${API}/commons/assets/${sub.assetId}`, auth(adminJwt));
    expect(publishedAsset.ok()).toBeTruthy();
    const asset = await publishedAsset.json();
    expect(asset.status).toBe("published");
    const liveFiles: any[] = Array.isArray(asset.files) ? asset.files : [];
    expect(liveFiles.map((f) => (typeof f === "string" ? f : f.name))).not.toContain("tune.abc");
  });

  test("listen gate saves listened keys and shows the Sunday-ready chip", async ({ page, request }) => {
    const song = await pickListenableSong(request);

    await openCommons(page);
    await page.getByTestId("commons-tab-assets").click();
    await page.getByTestId("commons-asset-search").fill(song.title);
    const assetRow = page.getByTestId(`commons-asset-${song.id}`);
    await expect(assetRow).toBeVisible();

    await assetRow.getByTestId(`commons-asset-listen-${song.id}`).click();
    const dialog = page.getByTestId("commons-listen-dialog");
    await expect(dialog).toBeVisible();
    const boxes = dialog.locator('[data-testid^="commons-listen-key-"]');
    await expect(boxes.first()).toBeVisible();
    const count = await boxes.count();
    for (let i = 0; i < count; i++) await boxes.nth(i).check();

    const listenRequest = page.waitForRequest((r) => r.method() === "POST" && r.url().includes(`/commons/admin/songs/${song.id}/listen`));
    await dialog.getByTestId("commons-listen-save").click();
    const posted = (await listenRequest).postDataJSON();
    expect(posted.keys.length).toBe(count);
    await expect(dialog).not.toBeVisible();

    const chip = assetRow.getByTestId(`commons-sunday-ready-${song.id}`);
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText("Sunday-ready");
  });

  test("opens Commons from tab query param", async ({ page }) => {
    await login(page);
    await page.goto("/admin?tab=commons");
    await expect(page.getByTestId("commons-tab-queue")).toBeVisible();
  });
});

test.describe("serving song search", () => {
  test("shows a WorshipCommons section for Sunday-ready songs and creates the song detail on select", async ({ page, request }) => {
    const { adminJwt } = await apiLogin(request);
    const song = await pickListenableSong(request);

    // Make sure the song is Sunday-ready: listen through every published key via the API.
    const detailRes = await request.get(`${API}/commons/songs/${song.id}`);
    expect(detailRes.ok()).toBeTruthy();
    const detail = await detailRes.json();
    const keys: string[] = Array.isArray(detail.publishedKeys) && detail.publishedKeys.length ? detail.publishedKeys : [detail.songKey].filter(Boolean);
    const listenRes = await request.post(`${API}/commons/admin/songs/${song.id}/listen`, { ...auth(adminJwt), data: { keys } });
    expect(listenRes.ok()).toBeTruthy();
    expect((await listenRes.json()).confidence).toBe("sunday-ready");

    await login(page);
    await navigateToServing(page);
    await page.locator('[id="secondaryMenu"] a').getByText("Songs").click();
    await expect(page).toHaveURL(/\/serving\/songs(?:\/?$|\?)/, { timeout: 10000 });
    await page.getByTestId("add-song-button").click();

    await page.locator('[data-testid="song-search-dialog-input"] input').fill(song.title);
    await page.getByTestId("song-search-dialog-button").click();

    const section = page.getByTestId("song-search-commons-section");
    await expect(section).toBeVisible({ timeout: 15000 });
    await expect(section.getByText("WorshipCommons — free")).toBeVisible();
    const card = section.getByTestId(`song-search-commons-${song.id}`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(song.title);
    await expect(card).toContainText("Sunday-ready");
    await expect(card.getByRole("link", { name: "View on WorshipCommons" })).toHaveAttribute("href", new RegExp(`/songs/${song.id}$`));

    // Selecting creates the song detail (POST /songDetails) and lands on the new song page.
    const createRequest = page.waitForRequest((r) => r.method() === "POST" && r.url().includes("/songDetails") && !r.url().includes("/songDetails/create"));
    await card.click();
    expect((await createRequest).postDataJSON()[0].title).toBe(song.title);
    await page.waitForURL(/\/serving\/songs\/[^/]+/, { timeout: 20000 });
    await expect(page.locator("#page-header-title")).toContainText(song.title);
  });
});
