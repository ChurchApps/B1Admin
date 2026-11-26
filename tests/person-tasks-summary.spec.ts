import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";

// Tasks on the person record: the newest tasks about the person, open and closed, with All tasks for the full list.
const DONALD_CLARK = "PER00000080"; // no tasks about him in the seed
const API = process.env.API_BASE || "http://localhost:8084";

async function adminAuth(ctx: APIRequestContext) {
  const login = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await login.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

test.describe.serial("People - Tasks on the person record", () => {
  const taskIds: string[] = [];

  test.beforeAll(async () => {
    const api = await pwRequest.newContext();
    const auth = await adminAuth(api);
    // Saved one at a time so each gets a later taskNumber; the last saved is the newest.
    for (let i = 1; i <= 4; i++) {
      const res = await api.post(`${API}/doing/tasks`, {
        ...auth,
        data: [
          {
            title: `Care visit ${i}`,
            status: i === 1 ? "Closed" : "Open",
            associatedWithType: "person",
            associatedWithId: DONALD_CLARK,
            associatedWithLabel: "Donald Clark",
            assignedToType: "person",
            assignedToId: "PER00000082",
            assignedToLabel: "Demo User"
          }
        ]
      });
      expect(res.ok()).toBe(true);
      taskIds.push((await res.json())[0].id);
    }
    await api.dispose();
  });

  test.afterAll(async () => {
    const api = await pwRequest.newContext();
    const auth = await adminAuth(api);
    for (const id of taskIds) await api.delete(`${API}/doing/tasks/${id}`, auth);
    await api.dispose();
  });

  test("shows the three newest tasks about the person with their status", async ({ page }) => {
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });
    const section = page.getByTestId("person-tasks-section");
    await expect(section.getByRole("heading", { name: "Tasks" })).toBeVisible({ timeout: 30000 });
    const rows = section.getByTestId("person-task-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("Care visit 4");
    await expect(rows.first()).toContainText("Open");
    await expect(section).not.toContainText("Care visit 1");
    await expect(section).toContainText("showing latest 3");
    if (process.env.PR_SCREENSHOT) await page.screenshot({ path: `.pr-screenshots/${process.env.PR_SCREENSHOT}.png`, fullPage: true });
  });

  test("All tasks shows every task, closed ones included, on the record", async ({ page }) => {
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });
    await page.getByTestId("person-tasks-all").click({ timeout: 30000 });
    await expect(page).toHaveURL(/view=tasks/);
    const rows = page.getByTestId("person-tasks-section").getByTestId("person-task-row");
    await expect(rows).toHaveCount(4);
    await expect(rows.last()).toContainText("Care visit 1");
    await expect(rows.last()).toContainText("Closed");
    await expect(page.getByTestId("person-tasks-all")).toHaveCount(0);
    await expect(page.getByTestId("person-record-back")).toBeVisible();
  });

  test("a task row opens the task", async ({ page }) => {
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });
    await page.getByTestId("person-tasks-section").getByRole("link", { name: "Care visit 4" }).click({ timeout: 30000 });
    await expect(page).toHaveURL(new RegExp(`/serving/tasks/${taskIds[3]}$`));
  });
});
