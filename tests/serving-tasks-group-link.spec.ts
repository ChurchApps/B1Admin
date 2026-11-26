import { request } from "@playwright/test";
import { type TaskInterface } from "@churchapps/helpers";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { createNamesOnlyRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";

// A task assigned to a group links to that group's page, where the roster and contact details live.
// The associated person links to their record only for viewers who may open people.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const GREETERS = { id: "GRP00000025", label: "Greeters Ministry" };
const DONALD = { id: "PER00000080", label: "Donald Clark" };

async function demoAuth() {
  const ctx = await request.newContext();
  const body = await (await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { ctx, auth: { headers: { Authorization: "Bearer " + (uc?.jwt as string) } } };
}

let task: TaskInterface;
let roleId = "";

test.beforeAll(async () => {
  const { ctx, auth } = await demoAuth();
  const saved = await (await ctx.post(`${API_BASE}/doing/tasks`, {
    ...auth,
    data: [{ title: `Group link task ${Date.now()}`, status: "Open", assignedToType: "group", assignedToId: GREETERS.id, assignedToLabel: GREETERS.label, associatedWithType: "person", associatedWithId: DONALD.id, associatedWithLabel: DONALD.label }]
  })).json();
  task = saved[0];
  await ctx.dispose();
});

test.afterAll(async () => {
  await deleteRole(roleId);
  if (!task?.id) return;
  const { ctx, auth } = await demoAuth();
  await ctx.delete(`${API_BASE}/doing/tasks/${task.id}`, auth);
  await ctx.dispose();
});

test("group-assigned task links to the group page and the associated person", async ({ page }) => {
  await page.goto(`/serving/tasks/${task.id}`);
  const assigned = page.getByTestId("task-assigned-label");
  await expect(assigned).toHaveText(GREETERS.label, { timeout: 15000 });
  await expect(assigned).toHaveAttribute("href", new RegExp(`/groups/${GREETERS.id}$`));
  await expect(page.getByTestId("task-associated-label")).toHaveAttribute("href", new RegExp(`/people/${DONALD.id}$`));

  await assigned.click();
  await expect(page).toHaveURL(new RegExp(`/groups/${GREETERS.id}$`));
  await expect(page.getByText("Kevin Martin").first()).toBeVisible({ timeout: 15000 });
});

test.describe("viewer without people access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("group member sees the group link but not a person link", async ({ browser }) => {
    roleId = await createNamesOnlyRole(`Task link names-only ${Date.now()}`);
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await loginAsVolunteer(page);
    await page.goto(`/serving/tasks/${task.id}`);
    await expect(page.getByTestId("task-assigned-label")).toHaveAttribute("href", new RegExp(`/groups/${GREETERS.id}$`), { timeout: 15000 });
    const associated = page.getByTestId("task-associated-label");
    await expect(associated).toHaveText(DONALD.label);
    await expect(associated).not.toHaveAttribute("href", /.*/);
    await context.close();
  });
});
