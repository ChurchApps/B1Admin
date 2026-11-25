import type { APIRequestContext, Page } from "@playwright/test";
import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { recoverFromViteError } from "./helpers/fixtures";

// A workflow step's Set Field action can set one of the church's custom person fields. The value is stored
// in the same format the person edit form stores it, so it displays like one typed in by staff.
// Rows these tests create are named "Zz WF ..." / "Zacchaeus ..." and removed again through the API.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const SUFFIX = Date.now().toString().slice(-6);
const PERSON = { id: "PER00000001", label: "John Smith" };

interface Auth { headers: { Authorization: string } }
interface Field { id: string; name: string; fieldType: string; choices?: string }
interface StepAction { actionType: string; config: Record<string, unknown> }
interface CardHistory { message: string }

async function apiAuth(ctx: APIRequestContext): Promise<Auth> {
  const loginRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(loginRes.ok()).toBeTruthy();
  const body = await loginRes.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

async function createFields(ctx: APIRequestContext, auth: Auth, fields: Omit<Field, "id">[]): Promise<Field[]> {
  const res = await ctx.post(`${API_BASE}/membership/personfields`, { ...auth, data: fields });
  expect(res.status()).toBe(200);
  return res.json();
}

async function deleteFields(ctx: APIRequestContext, auth: Auth, fields: Field[]) {
  for (const field of fields) await ctx.delete(`${API_BASE}/membership/personfields/${field.id}`, auth);
}

// A workflow whose middle "Auto" step carries the given on-enter actions.
async function buildWorkflow(ctx: APIRequestContext, auth: Auth, actions: StepAction[]) {
  const wf = (await (await ctx.post(`${API_BASE}/doing/workflows`, { ...auth, data: [{ name: "Zacchaeus Custom Field WF", active: true }] })).json())[0];
  const steps = await (await ctx.post(`${API_BASE}/doing/workflowSteps`, {
    ...auth,
    data: [{ workflowId: wf.id, name: "Greet", sort: 1 }, { workflowId: wf.id, name: "Auto", sort: 2 }, { workflowId: wf.id, name: "Done", sort: 3 }]
  })).json();
  const auto = steps.find((s: { name?: string }) => s.name === "Auto");
  if (actions.length) {
    await ctx.post(`${API_BASE}/doing/workflowStepActions`, { ...auth, data: actions.map((a, i) => ({ stepId: auto.id, sort: i + 1, actionType: a.actionType, config: JSON.stringify(a.config) })) });
  }
  return { wf, auto };
}

async function openStepEditor(page: Page, workflowId: string, stepId: string) {
  await page.goto("/serving/tasks/workflows/" + workflowId);
  await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
  await page.locator('[data-testid="workflow-board"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator(`[data-testid="edit-step-${stepId}"]`).click();
  await expect(page.locator('[data-testid="add-action-button"]')).toBeVisible({ timeout: 10000 });
}

async function addSetFieldAction(page: Page, index: number, fieldName: string) {
  await page.locator('[data-testid="add-action-button"]').click();
  await page.locator(`[data-testid="action-type-${index}"]`).click();
  await page.getByRole("option", { name: "Set Field", exact: true }).click();
  await page.locator(`[data-testid="action-field-${index}"]`).click();
  await page.getByRole("option", { name: fieldName, exact: true }).click();
}

async function addPersonToStep(ctx: APIRequestContext, auth: Auth, workflowId: string, stepId: string) {
  const added = await ctx.post(`${API_BASE}/doing/tasks/addToWorkflow`, { ...auth, data: { workflowId, stepId, associatedWith: { type: "person", ...PERSON } } });
  expect(added.status()).toBe(200);
  const card = await added.json();
  return ((JSON.parse(card.data || "{}").history || []) as CardHistory[]).map((h) => h.message);
}

const loadPersonValues = async (ctx: APIRequestContext, auth: Auth): Promise<{ fieldId: string; value: string }[]> =>
  (await ctx.get(`${API_BASE}/membership/personfieldvalues/person/${PERSON.id}`, auth)).json();

test.describe("Workflow Set Field action with custom fields", () => {
  test("sets each type of custom field in the format the person edit form stores", async ({ page }) => {
    test.slow();
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const [yesNo, choice, date, whole, text] = await createFields(ctx, auth, [
      { name: `Zz WF Baptized ${SUFFIX}`, fieldType: "Yes/No" },
      { name: `Zz WF Service ${SUFFIX}`, fieldType: "Multiple Choice", choices: JSON.stringify([{ value: "am", text: "Morning" }, { value: "pm", text: "Evening" }]) },
      { name: `Zz WF Joined ${SUFFIX}`, fieldType: "Date" },
      { name: `Zz WF Years ${SUFFIX}`, fieldType: "Whole Number" },
      { name: `Zz WF Shirt ${SUFFIX}`, fieldType: "Textbox" }
    ]);
    const { wf, auto } = await buildWorkflow(ctx, auth, []);

    try {
      await openStepEditor(page, wf.id, auto.id);

      // The picker lists the built-in fields and the custom fields under their own headings.
      await page.locator('[data-testid="add-action-button"]').click();
      await page.locator('[data-testid="action-type-0"]').click();
      await page.getByRole("option", { name: "Set Field", exact: true }).click();
      await page.locator('[data-testid="action-field-0"]').click();
      const options = page.getByRole("listbox");
      await expect(options.getByText("Person fields", { exact: true })).toBeVisible();
      await expect(options.getByText("Custom fields", { exact: true })).toBeVisible();
      await expect(options.getByRole("option", { name: "membershipStatus", exact: true })).toBeVisible();
      await options.getByRole("option", { name: yesNo.name, exact: true }).click();
      await page.locator('[data-testid="action-value-0"]').click();
      await page.getByRole("option", { name: "Yes", exact: true }).click();

      await addSetFieldAction(page, 1, choice.name);
      await page.locator('[data-testid="action-value-1"]').click();
      await page.getByRole("option", { name: "Evening", exact: true }).click();

      await addSetFieldAction(page, 2, date.name);
      await expect(page.locator('[data-testid="action-value-2"] input')).toHaveAttribute("type", "date");
      await page.locator('[data-testid="action-value-2"] input').fill("2024-05-01");

      await addSetFieldAction(page, 3, whole.name);
      await expect(page.locator('[data-testid="action-value-3"] input')).toHaveAttribute("type", "number");
      await page.locator('[data-testid="action-value-3"] input').fill("12");

      await addSetFieldAction(page, 4, text.name);
      await page.locator('[data-testid="action-value-4"] input').fill("Large");

      const saved = page.waitForResponse((r) => r.url().includes("/workflowStepActions") && r.request().method() === "POST");
      await page.locator('[data-testid="step-save-button"]').click();
      expect((await saved).status()).toBe(200);

      const actions: { actionType: string; config: string; sort: number }[] = await (await ctx.get(`${API_BASE}/doing/workflowStepActions/step/${auto.id}`, auth)).json();
      actions.sort((a, b) => a.sort - b.sort);
      expect(actions.map((a) => a.actionType)).toEqual(["setField", "setField", "setField", "setField", "setField"]);
      expect(actions.map((a) => JSON.parse(a.config))).toEqual([
        { field: "personField_" + yesNo.id, fieldLabel: yesNo.name, value: "True" },
        { field: "personField_" + choice.id, fieldLabel: choice.name, value: "pm" },
        { field: "personField_" + date.id, fieldLabel: date.name, value: "2024-05-01" },
        { field: "personField_" + whole.id, fieldLabel: whole.name, value: "12" },
        { field: "personField_" + text.id, fieldLabel: text.name, value: "Large" }
      ]);

      // Reopening the step shows each saved field and value again.
      await openStepEditor(page, wf.id, auto.id);
      await expect(page.locator('[data-testid="action-field-0"]')).toContainText(yesNo.name, { timeout: 10000 });
      await expect(page.locator('[data-testid="action-value-0"]')).toContainText("Yes");
      await expect(page.locator('[data-testid="action-value-1"]')).toContainText("Evening");
      await expect(page.locator('[data-testid="action-value-2"] input')).toHaveValue("2024-05-01");
      await expect(page.locator('[data-testid="action-value-3"] input')).toHaveValue("12");
      await expect(page.locator('[data-testid="action-value-4"] input')).toHaveValue("Large");

      // A card entering the step sets the fields on its person, and the card names them. The person already
      // has a Yes/No value saved the way the edit form saves it, so that row is updated and the rest are added.
      const preset = await ctx.post(`${API_BASE}/membership/personfieldvalues`, { ...auth, data: [{ personId: PERSON.id, fieldId: yesNo.id, value: "False" }] });
      expect(preset.status()).toBe(200);
      const history = await addPersonToStep(ctx, auth, wf.id, auto.id);
      for (const field of [yesNo, choice, date, whole, text]) expect(history).toContain("Set " + field.name);
      const values = await loadPersonValues(ctx, auth);
      const stored = (field: Field) => values.filter((v) => v.fieldId === field.id).map((v) => v.value);
      expect(stored(yesNo)).toEqual(["True"]);
      expect(stored(choice)).toEqual(["pm"]);
      expect(stored(date)).toEqual(["2024-05-01"]);
      expect(stored(whole)).toEqual(["12"]);
      expect(stored(text)).toEqual(["Large"]);

      // The person page shows them exactly as it shows values typed into the edit form.
      await page.goto("/people/" + PERSON.id);
      await expect(page.getByText(`${yesNo.name}: Yes`, { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(`${choice.name}: Evening`, { exact: true })).toBeVisible();
      await expect(page.getByText(`${date.name}: 5/1/2024`, { exact: true })).toBeVisible();
      await expect(page.getByText(`${whole.name}: 12`, { exact: true })).toBeVisible();
      await expect(page.getByText(`${text.name}: Large`, { exact: true })).toBeVisible();
    } finally {
      await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
      await deleteFields(ctx, auth, [yesNo, choice, date, whole, text]);
      await ctx.dispose();
    }
  });

  test("an action whose custom field was deleted says so and sets nothing", async ({ page }) => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const [field] = await createFields(ctx, auth, [{ name: `Zz WF Gone ${SUFFIX}`, fieldType: "Yes/No" }]);
    const { wf, auto } = await buildWorkflow(ctx, auth, [{ actionType: "setField", config: { field: "personField_" + field.id, fieldLabel: field.name, value: "True" } }]);
    await deleteFields(ctx, auth, [field]);

    try {
      await openStepEditor(page, wf.id, auto.id);
      await expect(page.locator('[data-testid="action-type-0"]')).toContainText("Set Field", { timeout: 10000 });
      await expect(page.locator('[data-testid="action-field-0"]')).toContainText(field.name);
      await expect(page.locator('[data-testid="action-field-deleted-0"]')).toHaveText("This custom field no longer exists, so nothing will be set. Pick another field.");

      // The action stays editable: picking a field that exists clears the warning.
      await page.locator('[data-testid="action-field-0"]').click();
      await page.getByRole("option", { name: "membershipStatus", exact: true }).click();
      await expect(page.locator('[data-testid="action-field-deleted-0"]')).toHaveCount(0);

      // Unsaved, so the stored action still points at the deleted field: the card records the failure.
      const history = await addPersonToStep(ctx, auth, wf.id, auto.id);
      expect(history).toContain(`Action setField failed: Invalid person field: personField_${field.id}`);
      expect((await loadPersonValues(ctx, auth)).filter((v) => v.fieldId === field.id)).toEqual([]);
    } finally {
      await ctx.delete(`${API_BASE}/doing/workflows/${wf.id}`, auth);
      await ctx.dispose();
    }
  });
});
