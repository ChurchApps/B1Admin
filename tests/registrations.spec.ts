import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToRegistrations } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";


const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CALENDAR = "Zacchaeus Registrations Calendar";
const EVENT_TITLE = "Zacchaeus Registration Test Event";
const GROUP = "Middle School Youth";
const FORM_NAME = "VBS Registration (Public)";
const CHURCH_ID = "CHU00000001";

const pad = (n: number) => n.toString().padStart(2, "0");
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const eventStart = new Date();
eventStart.setDate(eventStart.getDate() + 28);
eventStart.setHours(9, 0, 0, 0);
const eventEnd = new Date(eventStart);
eventEnd.setHours(12, 0, 0, 0);

async function gotoCalendars(page: Page) {
  await page.goto("/calendars");
  await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]'))
    .first().waitFor({ state: "visible", timeout: 15000 });
}

async function selectOption(page: Page, selectTestId: string, optionName: string | RegExp) {
  const combo = page.locator(`[data-testid="${selectTestId}"] [role="combobox"]`).first();
  await combo.click();
  const option = page.getByRole("option", { name: optionName }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
}

test.describe("Registrations list empty state", () => {
  test("shows guidance and a link to Calendars when no events have registration enabled", async ({ page }) => {
    await page.route("**/events/registerable", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await navigateToRegistrations(page);
    await expect(page.getByText("No events have registration enabled yet.")).toBeVisible({ timeout: 15000 });
    const link = page.getByTestId("empty-state-go-to-calendars");
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForURL(/\/calendars/, { timeout: 10000 });
  });
});

test.describe.serial("Registrations — Registration Questions, Add Attendee, filters", () => {
  let page: Page;
  let eventId: string;
  let answeredRegId: string;
  let unansweredRegId: string;
  let formSubmissionId: string;
  let staffJwt: string;
  let addedAttendeeRegId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);

    await gotoCalendars(page);
    await page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]')).first().click();
    await page.locator('[data-testid="calendar-name-input"] input').fill(CALENDAR);
    await page.locator('[data-testid="save-calendar-button"]').click();
    const row = page.locator("table tbody tr").filter({ hasText: CALENDAR }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("link").first().click();
    await page.waitForURL(/\/calendars\/[\w-]+/, { timeout: 10000 });

    await page.locator('[data-testid="new-event-button"]').click();
    await selectOption(page, "new-event-group-select", GROUP);
    await page.locator('[data-testid="new-event-title-input"] input').fill(EVENT_TITLE);
    await page.locator('[data-testid="new-event-start-input"] input').fill(toInput(eventStart));
    await page.locator('[data-testid="new-event-end-input"] input').fill(toInput(eventEnd));
    const eventPost = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="new-event-save-button"]').click();
    const created = await (await eventPost).json();
    eventId = (Array.isArray(created) ? created[0]?.id : created?.id) as string;
    expect(eventId, "created event id").toBeTruthy();
    await expect(page.locator('[data-testid="new-event-save-button"]')).toHaveCount(0, { timeout: 15000 });

    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const loginBody = await loginRes.json();
    const uc = (loginBody.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || loginBody.userChurches?.[0];
    staffJwt = uc?.jwt as string;
    expect(staffJwt, "staff jwt").toBeTruthy();
    const auth = { headers: { Authorization: "Bearer " + staffJwt } };

    // Not using new registration UI to avoid interference with feature tests.
    const enableRes = await ctx.post(`${API_BASE}/content/events`, { ...auth, data: [{ id: eventId, groupId: created[0].groupId, title: EVENT_TITLE, start: eventStart, end: eventEnd, allDay: false, visibility: "public", registrationEnabled: true, capacity: 3 }] });
    expect(enableRes.ok()).toBeTruthy();

    const submissionRes = await ctx.post(`${API_BASE}/membership/formsubmissions`, {
      ...auth,
      data: [
        {
          churchId: CHURCH_ID,
          formId: "FRM00000004",
          contentType: "registration",
          contentId: eventId,
          answers: [
            { questionId: "QST00000013", value: "Zacchaeus Test Child" },
            { questionId: "QST00000014", value: "555-0100" }
          ]
        }
      ]
    });
    expect(submissionRes.ok()).toBeTruthy();
    formSubmissionId = (await submissionRes.json())[0]?.id;
    expect(formSubmissionId, "form submission id").toBeTruthy();

    // "members" field lets rows display attendee name (else falls back to personId).
    const answeredRes = await ctx.post(`${API_BASE}/content/registrations/register`, { data: { churchId: CHURCH_ID, eventId, guestInfo: { firstName: "Zacchaeus", lastName: "AnsweredGuest", email: "zacchaeus.answered.guest@example.com" }, members: [{ firstName: "Zacchaeus", lastName: "AnsweredGuest" }], formSubmissionId } });
    expect(answeredRes.ok()).toBeTruthy();
    answeredRegId = (await answeredRes.json())?.id;

    const unansweredRes = await ctx.post(`${API_BASE}/content/registrations/register`, { data: { churchId: CHURCH_ID, eventId, guestInfo: { firstName: "Zacchaeus", lastName: "UnansweredGuest", email: "zacchaeus.unanswered.guest@example.com" }, members: [{ firstName: "Zacchaeus", lastName: "UnansweredGuest" }] } });
    expect(unansweredRes.ok()).toBeTruthy();
    unansweredRegId = (await unansweredRes.json())?.id;

    await ctx.dispose();
  });

  test.afterAll(async () => {
    try {
      const ctx = await request.newContext();
      const auth = { headers: { Authorization: "Bearer " + staffJwt } };
      for (const id of [answeredRegId, unansweredRegId, addedAttendeeRegId]) {
        if (id) await ctx.delete(`${API_BASE}/content/registrations/${id}`, auth).catch(() => { });
      }
      if (formSubmissionId) await ctx.delete(`${API_BASE}/membership/formsubmissions/${formSubmissionId}`, auth).catch(() => { });
      if (eventId) await ctx.delete(`${API_BASE}/content/events/${eventId}`, auth).catch(() => { });
      await ctx.dispose();
    } catch { /* ignore */ }
    try {
      await gotoCalendars(page);
      const editBtn = page.locator("table tbody tr").filter({ hasText: CALENDAR }).locator('[data-testid^="edit-calendar-"]').first();
      if (await editBtn.count().then((c) => c > 0).catch(() => false)) {
        await editBtn.click();
        await page.locator('[data-testid="calendar-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
        await page.locator('[data-testid="delete-calendar-button"]').click();
        await confirmDelete(page);
      }
    } catch { /* ignore */ }
    await page?.context().close();
  });

  test("Registrations list shows the event and links to its details page", async () => {
    await navigateToRegistrations(page);
    const eventRow = page.locator("table tbody tr").filter({ hasText: EVENT_TITLE });
    await expect(eventRow).toBeVisible({ timeout: 15000 });
    await eventRow.getByRole("link").first().click();
    await page.waitForURL(new RegExp(`/registrations/${eventId}`), { timeout: 10000 });
    await expect(page.getByText(EVENT_TITLE, { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Zacchaeus AnsweredGuest")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Zacchaeus UnansweredGuest")).toBeVisible();
    await expect(page.getByText("Unanswered questions only")).toHaveCount(0);
  });

  test("Registration Questions dropdown assigns a form, revealing the Unanswered filter chip", async () => {
    await page.getByTestId("registration-settings-button").click();
    const settingsCard = page.locator(".MuiCard-root").filter({ hasText: "Registration Settings" });
    await expect(settingsCard).toBeVisible({ timeout: 10000 });
    const formSelect = settingsCard.locator('[role="combobox"]');
    await formSelect.click();
    await page.getByRole("option", { name: FORM_NAME }).click();

    const settingsPost = page.waitForResponse((r) => r.url().includes("/events") && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await settingsCard.getByRole("button", { name: "Save Settings" }).click();
    await settingsPost;

    await expect(page.getByText("Unanswered questions only")).toBeVisible({ timeout: 10000 });
  });

  test('"Unanswered questions only" filters out the registration with a submitted form', async () => {
    await expect(page.getByText("Zacchaeus AnsweredGuest")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Zacchaeus UnansweredGuest")).toBeVisible();

    const chip = page.getByText("Unanswered questions only");
    await chip.click();
    await expect(page.getByText("Zacchaeus UnansweredGuest")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Zacchaeus AnsweredGuest")).toHaveCount(0);

    await chip.click();
    await expect(page.getByText("Zacchaeus AnsweredGuest")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Zacchaeus UnansweredGuest")).toBeVisible();
  });

  test("View Answers dialog shows the submitted question answers", async () => {
    const answeredRow = page.locator("tr").filter({ hasText: "Zacchaeus AnsweredGuest" });
    await expect(answeredRow.locator('button[aria-label="View Answers"]')).toBeVisible({ timeout: 10000 });
    await answeredRow.locator('button[aria-label="View Answers"]').click();

    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "View Answers" });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Child Full Name")).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText("Zacchaeus Test Child")).toBeVisible();
    await expect(dialog.getByText("Emergency Contact Phone")).toBeVisible();
    await expect(dialog.getByText("555-0100")).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 5000 });

    const unansweredRow = page.locator("tr").filter({ hasText: "Zacchaeus UnansweredGuest" });
    await expect(unansweredRow.locator('button[aria-label="View Answers"]')).toHaveCount(0);
  });

  test("Add Attendee successfully registers a person when capacity allows", async () => {
    // Only personId sent (no members) so row shows ID not name; test by count.
    const registrationsCard = page.locator(".MuiCard-root").filter({ has: page.getByRole("button", { name: "Add Attendee" }) });
    const rowCountBefore = await registrationsCard.locator("table tbody tr").count();
    expect(rowCountBefore).toBe(2);

    await page.getByRole("button", { name: "Add Attendee" }).click();
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Add Attendee" });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await dialog.locator('input[name="personAddText"]').fill("Demo User");
    await dialog.locator('[data-testid="search-button"]').click();
    const addBtn = dialog.locator('[data-testid^="add-person-"]').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    const registerPost = page.waitForResponse((r) => r.url().includes("/registrations/register") && r.request().method() === "POST", { timeout: 15000 });
    await addBtn.click();
    const regResp = await registerPost;
    expect(regResp.ok(), "register response ok").toBeTruthy();
    addedAttendeeRegId = (await regResp.json())?.id;

    await expect(dialog).toHaveCount(0, { timeout: 10000 });
    await expect(registrationsCard.locator("table tbody tr")).toHaveCount(3, { timeout: 10000 });
    await expect(registrationsCard.getByText(/Registrations\s*\(\s*3\s*\/\s*3\s*\)/)).toBeVisible({ timeout: 10000 });
  });

  test("Add Attendee shows a clear error once the event is at capacity", async () => {
    await page.getByRole("button", { name: "Add Attendee" }).click();
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Add Attendee" });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await dialog.locator('input[name="personAddText"]').fill("Dorothy Jackson");
    await dialog.locator('[data-testid="search-button"]').click();
    const addBtn = dialog.locator('[data-testid^="add-person-"]').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    await expect(dialog.getByText("This event is at capacity.")).toBeVisible({ timeout: 10000 });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0, { timeout: 5000 });
  });
});

test.describe("Registrations — Add Attendee on standalone events, Questions default", () => {
  const start = new Date();
  start.setDate(start.getDate() + 40);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);

  let jwt = "";
  let groupId = "";
  const eventIds: string[] = [];
  const auth = () => ({ headers: { Authorization: "Bearer " + jwt } });

  async function createEvent(title: string, types: Record<string, unknown>[] = []) {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API_BASE}/content/events`, { ...auth(), data: [{ groupId, title, start, end, allDay: false, visibility: "public", registrationEnabled: true }] });
    expect(res.ok()).toBeTruthy();
    const id = (await res.json())[0].id as string;
    eventIds.push(id);
    if (types.length) {
      const typesRes = await ctx.post(`${API_BASE}/content/registrations/types`, { ...auth(), data: types.map((t) => ({ eventId: id, active: true, ...t })) });
      expect(typesRes.ok()).toBeTruthy();
    }
    await ctx.dispose();
    return id;
  }

  async function addAttendee(page: Page, name: string, typeName?: string) {
    await page.getByRole("button", { name: "Add Attendee" }).click();
    const dialog = page.locator('div[role="dialog"]').filter({ hasText: "Add Attendee" });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    if (typeName) {
      await dialog.locator('[data-testid="add-attendee-type-select"] [role="combobox"]').click();
      await page.getByRole("option", { name: typeName }).click();
    }
    await dialog.locator('input[name="personAddText"]').fill(name);
    await dialog.locator('[data-testid="search-button"]').click();
    const registerPost = page.waitForResponse((r) => r.url().includes("/registrations/register") && r.request().method() === "POST", { timeout: 15000 });
    await dialog.locator('[data-testid^="add-person-button-"]').first().click();
    const regResp = await registerPost;
    expect(regResp.ok(), "register response ok").toBeTruthy();
    await expect(dialog).toHaveCount(0, { timeout: 15000 });
    return regResp.json();
  }

  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const loginBody = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    jwt = ((loginBody.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || loginBody.userChurches[0]).jwt;
    groupId = (await (await ctx.get(`${API_BASE}/membership/groups`, auth())).json())[0].id;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    for (const id of eventIds) {
      const regs = await (await ctx.get(`${API_BASE}/content/registrations/event/${id}`, auth())).json().catch(() => []);
      for (const r of regs || []) await ctx.delete(`${API_BASE}/content/registrations/${r.id}`, auth()).catch(() => { });
      await ctx.delete(`${API_BASE}/content/events/${id}`, auth()).catch(() => { });
    }
    await ctx.dispose();
  });

  test("Add Attendee on a free event with no types shows the person and one member", async ({ page }) => {
    const id = await createEvent("Zacchaeus Free Add Attendee Event");
    await page.goto(`/registrations/${id}`);
    await addAttendee(page, "Donald Clark");
    const row = page.locator('[data-testid="registration-row"]').first();
    await expect(row).toContainText("Donald Clark", { timeout: 15000 });
    await expect(row.locator("td").nth(1)).toHaveText("1");
  });

  test("Add Attendee on a paid type saves the person as pending with a balance due", async ({ page }) => {
    const id = await createEvent("Zacchaeus Paid Add Attendee Event", [{ name: "Camper", price: 45, sort: 1 }]);
    await page.goto(`/registrations/${id}`);
    const created = await addAttendee(page, "Donald Clark", "Camper");
    expect(created.status, "admin-added paid registration status").toBe("pending");
    expect(Number(created.amountPaid || 0), "amountPaid").toBe(0);
    const row = page.locator('[data-testid="registration-row"]').first();
    await expect(row).toContainText("Donald Clark", { timeout: 15000 });
    await expect(row).toContainText("$ 0.00 / $ 45.00");
  });

  test("Registration Questions shows None when no form is chosen", async ({ page }) => {
    const id = await createEvent("Zacchaeus Questions Default Event");
    await page.goto(`/registrations/${id}?view=settings`);
    await expect(page.getByRole("combobox", { name: "Registration Questions" })).toHaveText("None", { timeout: 15000 });
  });
});
