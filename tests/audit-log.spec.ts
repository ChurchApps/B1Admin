import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { openKnownPerson, personDetailsEditButton, SEED_PEOPLE } from "./helpers/fixtures";

// Universal audit log + undoable batches. The batch/undo scenarios drive the Api directly
// (Playwright request context) and verify the outcome through the B1Admin Settings pages.
const API = process.env.API_BASE || "http://localhost:8084";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

const auth = (jwt: string, extra: Record<string, string> = {}) => ({ headers: { Authorization: "Bearer " + jwt, ...extra } });

async function createPerson(ctx: APIRequestContext, jwt: string, last: string, status = "Visitor"): Promise<any> {
  const res = await ctx.post(`${API}/membership/people`, { ...auth(jwt), data: [{ name: { first: "Audit", last }, contactInfo: {}, membershipStatus: status }] });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return Array.isArray(body) ? body[0] : body;
}

async function getPerson(ctx: APIRequestContext, jwt: string, id: string): Promise<any> {
  const res = await ctx.get(`${API}/membership/people/${id}`, auth(jwt));
  expect(res.status()).toBe(200);
  return res.json();
}

// MUI v7 Select: open the FormControl identified by its label, then pick the option.
async function selectMuiOption(page: Page, comboName: string, optionText: string) {
  await page.locator(".MuiFormControl-root").filter({ hasText: comboName }).locator(".MuiSelect-select").click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

// Adds, edits and deletes a note on Donald Clark through the notes box. The delete asks to confirm first.
async function addPersonNote(page: Page, text: string) {
  await openKnownPerson(page, SEED_PEOPLE.DONALD);
  await page.getByTestId("person-notes-all").click();
  const notesBox = page.getByTestId("notes-box");
  const composer = notesBox.locator('textarea[name="noteText"]').first();
  await composer.fill(text);
  const saved = page.waitForResponse((r) => r.url().includes("/messaging/messages") && r.request().method() === "POST" && r.ok());
  await notesBox.locator("button").filter({ has: page.locator('text="send"') }).last().click();
  await saved;
  await expect(composer).toHaveValue("");
  await expect(notesBox.getByText(text)).toBeVisible();
  return notesBox;
}

// The innermost block holding both the note text and its edit button.
const noteItem = (page: Page, text: string) =>
  page.getByTestId("notes-box").locator("div").filter({ hasText: text }).filter({ has: page.getByRole("button", { name: "editNote" }) }).last();

async function openNoteEditor(page: Page, text: string) {
  const notesBox = page.getByTestId("notes-box");
  await noteItem(page, text).getByRole("button", { name: "editNote" }).click();
  const editor = notesBox.locator('textarea[name="noteText"]').first();
  await expect(editor).toHaveValue(text);
  return editor;
}

async function auditSearch(page: Page, filters: { module?: string; category?: string }) {
  if (filters.module) await selectMuiOption(page, "Module", filters.module);
  if (filters.category) await selectMuiOption(page, "Category", filters.category);
  const resp = page.waitForResponse((r) => r.url().includes("/auditlogs") && r.request().method() === "GET" && r.status() === 200, { timeout: 15000 });
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await resp;
}

test.describe.configure({ mode: "serial" });

test.describe("Universal audit log + undoable batches", () => {
  let ctx: APIRequestContext;
  let jwt: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test("records a person edit and renders a diff; module filter narrows", async ({ page }) => {
    const marker = "AuditEdit" + Date.now();
    await openKnownPerson(page, SEED_PEOPLE.DONALD);
    const personId = (page.url().match(/\/people\/(PER\d+)/) || [])[1] as string;
    expect(personId).toBeTruthy();

    await personDetailsEditButton(page).first().click();
    const middle = page.locator('[name="name.middle"]');
    await expect(middle).toBeVisible({ timeout: 10000 });
    await middle.fill(marker);
    const saved = page.waitForResponse((r) => r.url().includes("/people") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByRole("button", { name: "Save" }).click();
    await saved;

    await page.goto("/settings/audit-log");
    await auditSearch(page, { module: "People", category: "People" });

    const row = page.locator("table tbody tr").filter({ hasText: personId }).filter({ hasText: "Person Saved" }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText("membership");
    await row.getByRole("button", { name: "Details" }).click();

    await expect(page.getByText("Changes", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();

    // Switching the module filter away from membership drops the person row.
    await auditSearch(page, { module: "Giving" });
    await expect(page.locator("table tbody tr").filter({ hasText: personId })).toHaveCount(0);
  });

  test("captures a before-image on delete", async ({ page }) => {
    const last = "DeleteMarker" + Date.now();
    const person = await createPerson(ctx, jwt, last);
    const del = await ctx.delete(`${API}/membership/people/${person.id}`, auth(jwt));
    expect(del.status()).toBe(200);

    await page.goto("/settings/audit-log");
    await auditSearch(page, { module: "People", category: "People" });

    const row = page.locator("table tbody tr").filter({ hasText: person.id }).filter({ hasText: "Person Deleted" }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: "Details" }).click();

    await expect(page.getByText("Deleted Record", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(last, { exact: false }).first()).toBeVisible();
  });

  test("records a note edit with its old text and stamps the note as edited", async ({ page }) => {
    const original = "Hospital visit " + Date.now();
    const edited = original + " (home now)";
    const notesBox = await addPersonNote(page, original);
    const personId = (page.url().match(/\/people\/(PER\d+)/) || [])[1] as string;

    const editor = await openNoteEditor(page, original);
    await editor.fill(edited);
    const saved = page.waitForResponse((r) => r.url().includes("/messaging/messages") && r.request().method() === "POST" && r.ok());
    await notesBox.locator("button").filter({ has: page.locator('text="send"') }).last().click();
    await saved;
    await expect(notesBox.locator('textarea[name="noteText"]').first()).toHaveValue("");
    await expect(notesBox.getByText(edited)).toBeVisible();
    // Admins (Settings → Edit) see the edited stamp as a link to the note history.
    await expect(noteItem(page, edited).getByText(/^\(edited/)).toBeVisible();

    await page.goto("/settings/audit-log");
    await auditSearch(page, { module: "Messaging", category: "People" });
    const row = page.locator("table tbody tr").filter({ hasText: personId }).filter({ hasText: "Note Updated" }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: "Details" }).click();

    const content = page.locator("table tbody tr").filter({ has: page.getByRole("cell", { name: "content", exact: true }) }).last();
    await expect(content).toContainText(original);
    await expect(content).toContainText(edited);
  });

  test("records a deleted note with its text after confirming the delete", async ({ page }) => {
    const text = "Pastoral call " + Date.now();
    const notesBox = await addPersonNote(page, text);
    const personId = (page.url().match(/\/people\/(PER\d+)/) || [])[1] as string;

    await openNoteEditor(page, text);
    page.once("dialog", (d) => d.accept());
    const deleted = page.waitForResponse((r) => r.url().includes("/messaging/messages/") && r.request().method() === "DELETE" && r.ok());
    await notesBox.locator("button").filter({ has: page.locator('text="delete"') }).first().click();
    await deleted;
    await expect(notesBox.getByText(text)).toHaveCount(0);

    await page.goto("/settings/audit-log");
    await auditSearch(page, { module: "Messaging", category: "People" });
    const row = page.locator("table tbody tr").filter({ hasText: personId }).filter({ hasText: "Note Deleted" }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: "Details" }).click();

    await expect(page.getByText("Deleted Record", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.getByText("Demo User", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("after.png") });
  });

  // ChurchAppsSupport#1487: admins see edited/deleted note markers in place, linked to that record's note history.
  test("marks edited and deleted notes on the person and links to that person's note history", async ({ page }) => {
    const person = await createPerson(ctx, jwt, "NoteHistory" + Date.now());
    const kept = "Prayer request " + Date.now();
    const edited = kept + " (answered)";
    const removed = "Wrong family " + Date.now();

    await page.goto(`/people/${person.id}?view=notes`);
    const notesBox = page.getByTestId("notes-box");
    const post = async (text: string) => {
      await notesBox.locator('textarea[name="noteText"]').first().fill(text);
      const saved = page.waitForResponse((r) => r.url().includes("/messaging/messages") && r.request().method() === "POST" && r.ok());
      await notesBox.locator("button").filter({ has: page.locator('text="send"') }).last().click();
      await saved;
      await expect(notesBox.locator('textarea[name="noteText"]').first()).toHaveValue("");
      await expect(notesBox.getByText(text)).toBeVisible();
    };
    await post(kept);
    await post(removed);

    await openNoteEditor(page, removed);
    page.once("dialog", (d) => d.accept());
    const deleted = page.waitForResponse((r) => r.url().includes("/messaging/messages/") && r.request().method() === "DELETE" && r.ok());
    await notesBox.locator("button").filter({ has: page.locator('text="delete"') }).first().click();
    await deleted;
    await expect(notesBox.getByText(removed)).toHaveCount(0);

    await (await openNoteEditor(page, kept)).fill(edited);
    await post(edited);
    const historyHref = `/settings/audit-log?module=messaging&entityType=note&entityId=${person.id}`;
    const editedLink = noteItem(page, edited).getByTestId("note-history-link");
    await expect(editedLink).toBeVisible();
    await expect(editedLink).toHaveAttribute("href", historyHref);

    // The deleted-note marker comes from the audit log, so it shows on the next load.
    await page.reload();
    await expect(notesBox.getByText(edited)).toBeVisible();
    const marker = notesBox.getByTestId("deleted-note");
    await expect(marker).toHaveCount(1);
    await expect(marker).toContainText("Deleted note");
    await expect(marker).toContainText("Demo User");
    await expect(marker).not.toContainText(removed);
    await page.screenshot({ path: test.info().outputPath("after.png") });

    await marker.getByTestId("deleted-note-history-link").click();
    await expect(page).toHaveURL(/\/settings\/audit-log\?/);
    await expect(page.getByTestId("audit-record-filter")).toBeVisible();
    const rows = page.locator("table tbody tr");
    await expect(rows.filter({ hasText: "Note Deleted" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "Note Updated" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "Note Saved" })).toHaveCount(2);
    await expect(rows.filter({ hasNotText: person.id })).toHaveCount(0);

    await rows.filter({ hasText: "Note Deleted" }).getByTestId("audit-entity-link").click();
    await expect(page).toHaveURL(new RegExp(`/people/${person.id}\\?view=notes`));
    await expect(page.getByTestId("notes-box").getByText(edited)).toBeVisible();
  });

  test("the record filter on the audit log clears with Show all", async ({ page }) => {
    await page.goto("/settings/audit-log?module=messaging&entityType=note&entityId=PER_NONE");
    await expect(page.getByTestId("audit-record-filter")).toBeVisible();
    await expect(page.getByText("No audit log entries", { exact: false })).toBeVisible();
    const resp = page.waitForResponse((r) => r.url().includes("/auditlogs") && !r.url().includes("entityId") && r.status() === 200);
    await page.getByTestId("audit-record-filter").getByRole("button", { name: "Show all" }).click();
    await resp;
    await expect(page.getByTestId("audit-record-filter")).toHaveCount(0);
    await expect(page).not.toHaveURL(/entityId=/);
  });

  test("explicit batch round-trips and undoes from the Batches page", async ({ page }) => {
    const label = "E2E explicit " + Date.now();
    const person = await createPerson(ctx, jwt, "BatchTarget" + Date.now(), "Visitor");

    const batchRes = await ctx.post(`${API}/membership/batches`, { ...auth(jwt), data: { label, source: "import" } });
    const batch = await batchRes.json();
    const upd = await ctx.post(`${API}/membership/people`, { ...auth(jwt, { "X-Batch-Id": batch.id }), data: [{ ...person, membershipStatus: "Member" }] });
    expect(upd.status()).toBe(200);
    const done = await ctx.post(`${API}/membership/batches/${batch.id}/complete`, { ...auth(jwt), data: {} });
    expect(done.status()).toBe(200);

    // Sanity: the field changed before undo.
    expect((await getPerson(ctx, jwt, person.id)).membershipStatus).toBe("Member");

    await page.goto("/settings/batches");
    const row = page.locator("table tbody tr").filter({ hasText: label }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText("completed");

    const undoResp = page.waitForResponse((r) => r.url().includes(`/batches/${batch.id}/undo`) && r.status() === 200, { timeout: 15000 });
    await row.getByRole("button", { name: "Undo" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Undo" }).click();
    await undoResp;

    await expect(dialog.getByText("Restored 1 record(s).", { exact: false })).toBeVisible({ timeout: 10000 });

    expect((await getPerson(ctx, jwt, person.id)).membershipStatus).toBe("Visitor");
  });

  test("bulk update creates an undoable implicit batch", async ({ page }) => {
    const person = await createPerson(ctx, jwt, "BulkTarget" + Date.now(), "Visitor");
    const bulkRes = await ctx.post(`${API}/membership/people/bulk-update`, { ...auth(jwt), data: { personIds: [person.id], updates: { membershipStatus: "Member" } } });
    expect(bulkRes.status()).toBe(200);
    const bulk = await bulkRes.json();
    expect(bulk.batchId).toBeTruthy();

    expect((await getPerson(ctx, jwt, person.id)).membershipStatus).toBe("Member");

    await page.goto("/settings/batches");
    // The implicit batch is labelled "Bulk update N people" with source bulk-update.
    const row = page.locator("table tbody tr").filter({ hasText: "bulk-update" }).filter({ hasText: "Bulk update 1 people" }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const undoResp = page.waitForResponse((r) => r.url().includes(`/batches/${bulk.batchId}/undo`) && r.status() === 200, { timeout: 15000 });
    await row.getByRole("button", { name: "Undo" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Undo" }).click();
    await undoResp;

    await expect(dialog.getByText("Restored 1 record(s).", { exact: false })).toBeVisible({ timeout: 10000 });
    expect((await getPerson(ctx, jwt, person.id)).membershipStatus).toBe("Visitor");
  });

  test("undo skips records modified after the batch (conflict guard)", async ({ page }) => {
    const label = "E2E conflict " + Date.now();
    const person = await createPerson(ctx, jwt, "ConflictTarget" + Date.now(), "Visitor");

    const batchRes = await ctx.post(`${API}/membership/batches`, { ...auth(jwt), data: { label, source: "import" } });
    const batch = await batchRes.json();
    await ctx.post(`${API}/membership/people`, { ...auth(jwt, { "X-Batch-Id": batch.id }), data: [{ ...person, membershipStatus: "Member" }] });
    await ctx.post(`${API}/membership/batches/${batch.id}/complete`, { ...auth(jwt), data: {} });

    // A normal edit AFTER the batch must survive the undo.
    const afterBatch = await getPerson(ctx, jwt, person.id);
    const manual = await ctx.post(`${API}/membership/people`, { ...auth(jwt), data: [{ ...afterBatch, membershipStatus: "Staff" }] });
    expect(manual.status()).toBe(200);

    await page.goto("/settings/batches");
    const row = page.locator("table tbody tr").filter({ hasText: label }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const undoResp = page.waitForResponse((r) => r.url().includes(`/batches/${batch.id}/undo`) && r.status() === 200, { timeout: 15000 });
    await row.getByRole("button", { name: "Undo" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Undo" }).click();
    await undoResp;

    await expect(dialog.getByText("Skipped (1)", { exact: false })).toBeVisible({ timeout: 10000 });

    // Manual edit preserved.
    expect((await getPerson(ctx, jwt, person.id)).membershipStatus).toBe("Staff");
  });
});
