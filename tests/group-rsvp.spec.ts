import { test, expect, request, type APIRequestContext, type Page } from "@playwright/test";
import { login } from "./helpers/auth";

// Phase 4 GR-1 / Confidential groups — B1Admin surfaces.
// RSVP responses are self-only on the server, so deterministic counts are seeded
// by POSTing the admin's own RSVP via the API against a group the test creates and
// joins. Group membership is JWT-baked at login, so the group + membership are set
// up BEFORE the browser logs in (a fresh context, not the cached storage state).

const API = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";

interface Setup {
  ctx: APIRequestContext;
  jwt: string;
  personId: string;
  adminName: string;
}

async function apiLogin(ctx: APIRequestContext): Promise<{ jwt: string; personId: string; adminName: string }> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return { jwt: uc.jwt, personId: uc.person.id, adminName: uc.person.name?.display };
}

function authHeaders(jwt: string) {
  return { headers: { Authorization: "Bearer " + jwt } };
}

test.describe.serial("Group RSVP summary + roster (B1Admin)", () => {
  let page: Page;
  let setup: Setup;
  let groupId: string;
  let rsvpEventId: string;
  let disabledEventId: string;
  const occurrenceStart = "2026-08-05T18:00:00.000Z";
  const groupName = `Zacchaeus RSVP Group ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const ctx = await request.newContext();
    const first = await apiLogin(ctx);
    setup = { ctx, ...first };
    const ppl = await (await ctx.get(`${API}/membership/people/ids?ids=${setup.personId}`, authHeaders(setup.jwt))).json();
    setup.adminName = ppl[0]?.name?.display || setup.adminName;

    // Standard group so JWT carries groupId for Calendar/RSVP access.
    const groupRes = await ctx.post(`${API}/membership/groups`, {
      ...authHeaders(setup.jwt),
      data: [{ name: groupName, categoryName: "RSVP Test", tags: "standard" }]
    });
    groupId = (await groupRes.json())[0].id;
    await ctx.post(`${API}/membership/groupmembers`, { ...authHeaders(setup.jwt), data: [{ groupId, personId: setup.personId }] });

    // Re-login so au.groupIds includes new group (RSVP POST is membership-gated).
    const refreshed = await apiLogin(ctx);
    setup.jwt = refreshed.jwt;

    const evRes = await ctx.post(`${API}/content/events`, {
      ...authHeaders(setup.jwt),
      data: [{ groupId, title: "RSVP Enabled Event", start: occurrenceStart, end: "2026-08-05T19:30:00.000Z", allDay: false, visibility: "public", rsvpDisabled: false }]
    });
    rsvpEventId = (await evRes.json())[0].id;

    const disRes = await ctx.post(`${API}/content/events`, {
      ...authHeaders(setup.jwt),
      data: [{ groupId, title: "RSVP Disabled Event", start: occurrenceStart, end: "2026-08-05T19:30:00.000Z", allDay: false, visibility: "public", rsvpDisabled: true }]
    });
    disabledEventId = (await disRes.json())[0].id;

    const rsvpRes = await ctx.post(`${API}/content/events/${rsvpEventId}/rsvp`, {
      ...authHeaders(setup.jwt),
      data: { occurrenceStart, response: "yes" }
    });
    expect(rsvpRes.ok(), "seed rsvp POST succeeded").toBeTruthy();

    // Fresh browser context so in-app JWT carries the new groupId.
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    try { await setup.ctx.delete(`${API}/content/events/${rsvpEventId}`, authHeaders(setup.jwt)); } catch { /* best effort */ }
    try { await setup.ctx.delete(`${API}/content/events/${disabledEventId}`, authHeaders(setup.jwt)); } catch { /* best effort */ }
    try { await setup.ctx.delete(`${API}/membership/groups/${groupId}`, authHeaders(setup.jwt)); } catch { /* best effort */ }
    await setup.ctx.dispose();
    await page?.context().close();
  });

  async function openCalendarTab() {
    await page.goto(`/groups/${groupId}`);
    await page.getByRole("tab", { name: "Calendar" }).click();
    await expect(page.locator('[data-testid="group-calendar-tab"]')).toBeVisible({ timeout: 15000 });
  }

  test("RSVP summary shows seeded counts on the enabled event", async () => {
    await openCalendarTab();
    const summary = page.locator(`[data-testid="rsvp-summary-${rsvpEventId}"]`);
    await expect(summary).toBeVisible({ timeout: 15000 });
    await expect(summary).toHaveText("1 yes · 0 maybe · 0 no");
  });

  test("disabled event shows no RSVP summary", async () => {
    await openCalendarTab();
    await expect(page.locator(`[data-testid="rsvp-summary-${disabledEventId}"]`)).toHaveCount(0);
    const disabledRow = page.locator("table tbody tr").filter({ hasText: "RSVP Disabled Event" });
    await expect(disabledRow.getByText("Disabled", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("roster dialog lists the responder under the Yes column", async () => {
    await openCalendarTab();
    await page.locator(`[data-testid="rsvp-summary-${rsvpEventId}"]`).click();
    const dialog = page.locator('[data-testid="rsvp-roster-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    const yesCol = dialog.locator('[data-testid="rsvp-roster-yes"]');
    await expect(yesCol).toContainText(setup.adminName, { timeout: 10000 });
    // The responder must not appear under Maybe/No.
    await expect(dialog.locator('[data-testid="rsvp-roster-no"]')).not.toContainText(setup.adminName);
  });

  test("Allow-RSVPs checkbox in the bulk modal stamps rsvpDisabled=true", async () => {
    await openCalendarTab();
    await page.locator('[data-testid="bulk-add-events-button"]').click();
    await page.locator('[data-testid="bulk-events-title-input"] input').fill("Bulk No-RSVP Event");
    const first = "2026-09-02";
    const last = "2026-09-02";
    await page.locator('[data-testid="bulk-events-first-date"] input').fill(first);
    await page.locator('[data-testid="bulk-events-last-date"] input').fill(last);
    await page.locator('[data-testid="bulk-events-allow-rsvps"] input').uncheck();

    const eventPost = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="bulk-events-save-button"]').click();
    const created = await (await eventPost).json();
    expect(created[0].rsvpDisabled, "created event rsvpDisabled").toBe(true);
    await expect(page.locator('[data-testid="group-calendar-tab"]')).toBeVisible({ timeout: 15000 });
    const row = page.locator("table tbody tr").filter({ hasText: "Bulk No-RSVP Event" });
    await expect(row.getByText("Disabled", { exact: true })).toBeVisible({ timeout: 10000 });
  });
});

test.describe.serial("Confidential group control (B1Admin)", () => {
  let page: Page;
  let ctx: APIRequestContext;
  let jwt: string;
  let groupId: string;
  const groupName = `Zacchaeus Confidential Group ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    ctx = await request.newContext();
    ({ jwt } = await apiLogin(ctx));
    const groupRes = await ctx.post(`${API}/membership/groups`, {
      ...authHeaders(jwt),
      data: [{ name: groupName, categoryName: "Confidential Test", tags: "standard" }]
    });
    groupId = (await groupRes.json())[0].id;

    const context = await browser.newContext();
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    try { await ctx.delete(`${API}/membership/groups/${groupId}`, authHeaders(jwt)); } catch { /* best effort */ }
    await ctx.dispose();
    await page?.context().close();
  });

  async function setConfidential(value: "Yes" | "No") {
    await page.goto(`/groups/${groupId}`);
    await page.locator('[data-testid="edit-group-button"]').first().click();
    const select = page.locator('[data-testid="confidential-select"]');
    await expect(select).toBeVisible({ timeout: 15000 });
    await select.click();
    await page.getByRole("option", { name: value, exact: true }).click();
    const post = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.getByRole("button", { name: "Save" }).click();
    await post;
  }

  test("confidential control renders with helper text", async () => {
    await page.goto(`/groups/${groupId}`);
    await page.locator('[data-testid="edit-group-button"]').first().click();
    await expect(page.locator('[data-testid="confidential-select"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Hide this group and its roster")).toBeVisible();
  });

  test("setting Confidential=Yes persists true", async () => {
    await setConfidential("Yes");
    const g = await (await ctx.get(`${API}/membership/groups/${groupId}`, authHeaders(jwt))).json();
    expect(g.confidential).toBe(true);
  });

  test("un-setting Confidential=No persists false and the group still loads by id", async () => {
    await setConfidential("No");
    const g = await (await ctx.get(`${API}/membership/groups/${groupId}`, authHeaders(jwt))).json();
    // Explicit false round-trips (Kysely would drop undefined).
    expect(g.confidential).toBe(false);
    expect(g.id, "confidential group still loads by id for staff").toBe(groupId);
  });
});
