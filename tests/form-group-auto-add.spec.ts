import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToForms } from "./helpers/navigation";
import { openSeedGroup, openPersonRow, confirmDelete } from "./helpers/fixtures";
import { navigateToPeople } from "./helpers/navigation";

// Camp-registration flow (#1026): a stand-alone form that creates a person record
// and drops that person straight onto a group's roster.
const API = "http://localhost:8084";
const FORM_NAME = "Zacchaeus Camp Registration";
const GROUP_NAME = "Vacation Bible School";
const CAMPER_EMAIL = "zacchaeus.camper@example.com";
const CAMPER_NAME = "Zacchaeus Camper";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

async function selectMuiOption(page: import("@playwright/test").Page, openLocator: ReturnType<import("@playwright/test").Page["locator"]>, optionText: string) {
  await openLocator.click();
  const option = page.locator('li[role="option"]', { hasText: optionText }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 10000 }).catch(() => { });
}

test.describe.configure({ mode: "serial" });

test.describe("Form-linked group auto-add", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let formId: string;

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };
  });

  test.afterAll(async () => {
    if (formId) await ctx.delete(`${API}/membership/forms/${formId}`, auth);
    const people = await (await ctx.get(`${API}/membership/people/search?term=${encodeURIComponent(CAMPER_EMAIL)}`, auth)).json();
    for (const p of people || []) {
      const members = await (await ctx.get(`${API}/membership/groupmembers?personId=${p.id}`, auth)).json();
      for (const gm of members || []) await ctx.delete(`${API}/membership/groupmembers/${gm.id}`, auth);
      await ctx.delete(`${API}/membership/people/${p.id}`, auth);
    }
    await ctx.dispose();
  });

  test("links a stand alone form to a group from the Edit Form page", async ({ page }) => {
    await navigateToForms(page);
    await page.locator('[data-testid="add-form-button"]').click();
    await page.locator('[data-testid="form-name-input"] input').fill(FORM_NAME);
    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "Stand Alone");
    await selectMuiOption(page, page.locator('[data-testid="access-level-select"]'), "Public");
    await page.locator('[data-testid="auto-create-person-checkbox"] input').check();
    await selectMuiOption(page, page.locator('[data-testid="form-group-select"]'), GROUP_NAME);
    await page.locator("#formBox button", { hasText: /^Save$/ }).click();
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });

    const forms = await (await ctx.get(`${API}/membership/forms`, auth)).json();
    formId = (forms || []).find((f: any) => f.name === FORM_NAME)?.id;
    expect(formId).toBeTruthy();

    // Re-opening the form keeps the group selected.
    const row = page.locator("table tbody tr").filter({ hasText: FORM_NAME }).first();
    await row.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
    await expect(page.locator('[data-testid="form-group-select"]')).toContainText(GROUP_NAME, { timeout: 10000 });
    await page.locator("#formBox button", { hasText: /^Cancel$/ }).click();
  });

  test("an anonymous submission creates the person and adds them to the group", async ({ page }) => {
    const qRes = await ctx.post(`${API}/membership/questions`, {
      ...auth,
      data: [
        { formId, fieldType: "Textbox", title: "First Name", required: true },
        { formId, fieldType: "Textbox", title: "Last Name", required: true },
        { formId, fieldType: "Email", title: "Email", required: true }
      ]
    });
    expect(qRes.ok()).toBeTruthy();
    const questions = await (await ctx.get(`${API}/membership/questions/unrestricted?formId=${formId}`)).json();
    const idFor = (title: string) => questions.find((q: any) => q.title === title)?.id;

    const anon = await pwRequest.newContext();
    const subRes = await anon.post(`${API}/membership/formsubmissions`, {
      data: [
        {
          formId,
          contentType: "form",
          contentId: formId,
          answers: [
            { questionId: idFor("First Name"), value: "Zacchaeus" },
            { questionId: idFor("Last Name"), value: "Camper" },
            { questionId: idFor("Email"), value: CAMPER_EMAIL }
          ]
        }
      ]
    });
    expect(subRes.ok()).toBeTruthy();
    await anon.dispose();

    await openSeedGroup(page, GROUP_NAME);
    await expect(page.locator("#groupMembersBox")).toContainText(CAMPER_NAME, { timeout: 15000 });
  });

  test("the submission shows on the new person's Forms tab", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, CAMPER_NAME);
    await page.getByRole("tab", { name: "Forms" }).click();
    const railItem = page.getByText(FORM_NAME, { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 15000 });
    await railItem.click();
    await expect(page.locator('[data-testid="display-box-content"]').getByText(CAMPER_EMAIL)).toBeVisible({ timeout: 10000 });
  });

  test("clearing the group link stops the auto-add", async ({ page }) => {
    await navigateToForms(page);
    const row = page.locator("table tbody tr").filter({ hasText: FORM_NAME }).first();
    await row.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
    await selectMuiOption(page, page.locator('[data-testid="form-group-select"]'), "None");
    await page.locator("#formBox button", { hasText: /^Save$/ }).click();
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });

    const form = await (await ctx.get(`${API}/membership/forms/${formId}`, auth)).json();
    expect(form.groupId).toBeFalsy();

    await page.locator("table tbody tr").filter({ hasText: FORM_NAME }).first()
      .locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#formBox button", { hasText: /^Delete$/ }).click();
    await confirmDelete(page);
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
    formId = "";
  });
});
