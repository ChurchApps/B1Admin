import { request } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { confirmDelete, personAddButton } from "./helpers/fixtures";

// Issue #1259: workflow "Send email" bell notifications were saved as tasks pointing at the
// email template id, so clicking one opened /serving/tasks/<templateId> and the page crashed.

test("task link to something that is not a task shows Task not found", async ({ page }) => {
  await page.goto("/serving/tasks/ETP00000001");
  await expect(page.getByText("Task not found")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Cannot read properties of undefined/)).toHaveCount(0);
});

// Issue #1407: a hand-made task had no way to get a due date.
test("a hand-made task can be given a due date", async ({ page }) => {
  await page.goto("/serving/tasks");
  await page.locator('[data-testid="add-task-button"]').click();
  await expect(page.getByLabel("Due date")).toBeVisible({ timeout: 15000 });

  await page.goto("/serving/tasks/TSK00000001");
  const due = page.locator('[data-testid="task-due-input"] input');
  await expect(due).toBeVisible({ timeout: 15000 });
  await due.fill("2030-01-15");
  await due.blur();
  await page.reload();
  await expect(page.locator('[data-testid="task-due-input"] input')).toHaveValue("2030-01-15", { timeout: 15000 });
});

// Issue #1395: a to-do that is not about any person or group. "Associate with" used to be
// required and defaulted to the signed-in user; it is optional now and can be cleared.
test("a task can be created with no person or group", async ({ page }) => {
  await page.goto("/serving/tasks");
  await page.locator('[data-testid="add-task-button"]').click();
  const associate = page.locator('[data-testid="associate-with-input"] input');
  await expect(associate).toBeVisible({ timeout: 15000 });
  await expect(associate).toHaveValue("");

  await page.locator('[data-testid="assign-to-input"]').click();
  await page.locator('[name="personAddText"]').fill("Demo User");
  await page.locator('[data-testid="search-button"]').click();
  await personAddButton(page, "Demo User").click();

  await page.locator('[name="title"]').fill("Order more coffee");
  await page.locator("button").getByText("Save").click();

  const row = page.locator('[data-testid="task-list"] tr', { hasText: "Order more coffee" });
  await expect(row).toBeVisible({ timeout: 15000 });
  await expect(row).toContainText("Not specified");
});

test("a task's person or group can be cleared", async ({ page }) => {
  await page.goto("/serving/tasks/TSK00000001");
  await page.locator('[data-testid="task-associate"]').click();
  await page.getByRole("button", { name: "No person or group" }).click();
  const label = page.locator('[data-testid="task-associated-label"]');
  await expect(label).toHaveText("Not specified", { timeout: 15000 });
  await page.reload();
  await expect(label).toHaveText("Not specified", { timeout: 15000 });
});

// Issue #1562: reassigning a task from the task page saved silently, so the new assignee was never told.
test("reassigning a task notifies the new assignee", async ({ page }) => {
  await page.goto("/serving/tasks/TSK00000001");
  await page.locator('[data-testid="task-assign"]').click();
  await page.locator('[name="personAddText"]').fill("Donald Clark");
  await page.locator('[data-testid="search-button"]').click();
  const notification = page.waitForRequest((req) => req.method() === "POST" && req.url().includes("/notifications/create"), { timeout: 15000 });
  await personAddButton(page, "Donald Clark").click();
  const body = (await notification).postDataJSON();
  expect(body.peopleIds).toEqual(["PER00000080"]);
  expect(body.contentType).toBe("task");
  expect(body.contentId).toBe("TSK00000001");
  await expect(page.locator('[data-testid="task-assigned-label"]')).toHaveText("Donald Clark", { timeout: 15000 });
});

// ChurchAppsSupport#1574: the task page shows the phone and email of the person the task is about,
// and the person picker shows results as you type.
test("a task about a person shows their phone and email", async ({ page }) => {
  await page.goto("/serving/tasks/TSK00000104");
  const identity = page.locator('[data-testid="task-identity"]');
  await expect(identity.locator('[data-testid="card-contact-phone"]')).toHaveAttribute("href", "tel:(217) 555-0106", { timeout: 15000 });
  await expect(identity.locator('[data-testid="card-contact-email"]')).toHaveAttribute("href", "mailto:sarah.smith@email.com");
});

test("the task person picker searches as you type", async ({ page }) => {
  await page.goto("/serving/tasks");
  await page.locator('[data-testid="add-task-button"]').click();
  await page.locator('[data-testid="assign-to-input"]').click();
  await page.locator('[name="personAddText"]').fill("Donald");
  // Without a typed search the list keeps showing recent people, so only Donalds means it searched.
  await expect(personAddButton(page, "Donald Clark")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#householdMemberAddTable tr").filter({ hasNotText: "Donald" })).toHaveCount(0);
});

test("the task group picker filters as you type with no Search button", async ({ page }) => {
  await page.goto("/serving/tasks/TSK00000001");
  await page.locator('[data-testid="task-associate"]').click();
  await page.getByRole("tab", { name: "Group" }).click();
  const field = page.locator('[name="groupSearchText"]');
  await expect(field).toBeVisible({ timeout: 15000 });
  await field.fill("Youth");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Search" })).toHaveCount(0);
  await expect(page.getByRole("dialog").getByText(/Youth/).first()).toBeVisible();
});

// ChurchAppsSupport#1577: the task page shows the exact creation time, keeps a history of reassignments,
// and lets people with Edit All Cards & Tasks rename or delete any task.
const TASKS_API = (process.env.API_BASE || "http://localhost:8084") + "/doing/tasks";

async function createTask(title: string, status = "Open") {
  const ctx = await request.newContext();
  const login = await ctx.post(`${process.env.API_BASE || "http://localhost:8084"}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
  const res = await ctx.post(TASKS_API, {
    headers: { Authorization: "Bearer " + jwt },
    data: [{ title, status, dateClosed: status === "Closed" ? new Date() : undefined, createdByType: "person", createdById: "PER00000080", createdByLabel: "Donald Clark", assignedToType: "person", assignedToId: "PER00000080", assignedToLabel: "Donald Clark" }]
  });
  const id = (await res.json())[0].id as string;
  await ctx.dispose();
  return id;
}

test("a task shows its full creation date and time", async ({ page }) => {
  const id = await createTask("Check the projector bulbs " + Date.now());
  await page.goto("/serving/tasks/" + id);
  const identity = page.locator('[data-testid="task-identity"]');
  await expect(identity.getByText(/Created [A-Z][a-z]{2} \d{1,2}, \d{4},? \d{1,2}:\d{2}\s?[AP]M by Donald Clark/)).toBeVisible({ timeout: 15000 });
});

test("an admin can rename any task and the title sticks", async ({ page }) => {
  const id = await createTask("Order new hymnals " + Date.now());
  await page.goto("/serving/tasks/" + id);
  await page.locator('[data-testid="task-edit-title"]').click({ timeout: 15000 });
  const input = page.locator('[data-testid="task-title-input"] input');
  const renamed = "Order new hymnals and bookmarks " + Date.now();
  await input.fill(renamed);
  await page.locator('[data-testid="task-title-save"]').click();
  await expect(page.locator("#page-header-title")).toHaveText(renamed, { timeout: 15000 });
  await page.reload();
  await expect(page.locator("#page-header-title")).toHaveText(renamed, { timeout: 15000 });
});

test("reassigning a task adds a history line", async ({ page }) => {
  const id = await createTask("Call the plumber " + Date.now());
  await page.goto("/serving/tasks/" + id);
  await page.locator('[data-testid="task-assign"]').click({ timeout: 15000 });
  await page.locator('[name="personAddText"]').fill("Demo User");
  await page.locator('[data-testid="search-button"]').click();
  await personAddButton(page, "Demo User").click();
  await expect(page.locator('[data-testid="task-assigned-label"]')).toHaveText("Demo User", { timeout: 15000 });
  await expect(page.locator('[data-testid="task-history"]')).toContainText("Reassigned from Donald Clark to Demo User", { timeout: 15000 });
});

test("an admin can delete a closed task", async ({ page }) => {
  const title = "Old closed task " + Date.now();
  const id = await createTask(title, "Closed");
  await page.goto("/serving/tasks/" + id);
  await expect(page.locator('[data-testid="task-identity"]').getByText(/^Closed [A-Z][a-z]{2} \d{1,2}, \d{4}/)).toBeVisible({ timeout: 15000 });
  await page.locator('[data-testid="task-delete"]').click();
  await confirmDelete(page);
  await expect(page).toHaveURL(/\/serving\/tasks$/, { timeout: 15000 });
  await page.goto("/serving/tasks/" + id);
  await expect(page.getByText("Task not found")).toBeVisible({ timeout: 15000 });
});

// ChurchAppsSupport#1584: a Send now button beside Save Reminders sends the saved task reminder right away.
test("a task reminder can be sent now to the assignee", async ({ page }) => {
  await page.goto("/serving/tasks/TSK00000003");
  await page.locator('[data-testid="task-assign"]').click();
  await page.locator('[name="personAddText"]').fill("Donald Clark");
  await page.locator('[data-testid="search-button"]').click();
  await personAddButton(page, "Donald Clark").click();
  await expect(page.locator('[data-testid="task-assigned-label"]')).toHaveText("Donald Clark", { timeout: 15000 });

  await page.locator('[data-testid="task-reminders-toggle"]').click();
  const toggle = page.locator('[data-testid="task-reminder-enabled-toggle"] input');
  if (!(await toggle.isChecked())) await toggle.check();
  const sendNow = page.locator('[data-testid="task-reminder-send-now-button"]');
  const saved = page.waitForResponse((r) => /\/messaging\/reminders\/task\/TSK00000003$/.test(r.url()) && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
  await page.locator('[data-testid="task-reminder-save-button"]').click();
  await saved;
  await expect(sendNow).toBeEnabled({ timeout: 15000 });

  const sent = page.waitForResponse((r) => r.url().includes("/messaging/reminders/task/TSK00000003/sendNow") && r.ok(), { timeout: 15000 });
  await sendNow.click();
  expect((await (await sent).json()).sent).toBe(1);
  await expect(page.locator('[data-testid="task-reminder-sent-now"]')).toHaveText("Sent to 1 people");
});
