import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { confirmDelete } from "./helpers/fixtures";

// Account deletion approval: when a church has a directory approval group, "Delete my account"
// on /profile files an accountDeletion task instead of deleting the login, and staff approve
// (GDPR anonymize + remove login) or reject it from Serving > Tasks.
const API = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const DEMO_PERSON_ID = "PER00000082"; // demo@b1.church
const APPROVAL_GROUP_ID = "GRP00000001"; // Sunday Morning Service

const auth = (jwt: string) => ({ headers: { Authorization: "Bearer " + jwt } });

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

async function loadApprovalSetting(ctx: APIRequestContext, jwt: string): Promise<any | undefined> {
  const res = await ctx.get(`${API}/membership/settings`, auth(jwt));
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as any[]).find((s) => s.keyName === "directoryApprovalGroupId");
}

async function saveApprovalSetting(ctx: APIRequestContext, jwt: string, existing: any | undefined, value: string) {
  const setting = { ...(existing || { churchId: CHURCH_ID, public: 1, keyName: "directoryApprovalGroupId" }), value };
  const res = await ctx.post(`${API}/membership/settings`, { ...auth(jwt), data: [setting] });
  expect(res.ok()).toBeTruthy();
}

async function openDeletionRequests(ctx: APIRequestContext, jwt: string): Promise<any[]> {
  const res = await ctx.get(`${API}/doing/tasks`, auth(jwt));
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as any[]).filter((t) => t.taskType === "accountDeletion" && t.status === "Open");
}

test.describe.configure({ mode: "serial" });

test.describe("Account deletion approval", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  let previousSetting: any | undefined;
  let throwawayPersonId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
    previousSetting = await loadApprovalSetting(ctx, jwt);
    await saveApprovalSetting(ctx, jwt, previousSetting, APPROVAL_GROUP_ID);
  });

  test.afterAll(async () => {
    // Put the church back the way the seed left it and drop the throwaway person.
    const current = await loadApprovalSetting(ctx, jwt);
    await saveApprovalSetting(ctx, jwt, current, previousSetting?.value || "");
    for (const t of await openDeletionRequests(ctx, jwt)) {
      await ctx.post(`${API}/doing/tasks`, { ...auth(jwt), data: [{ ...t, status: "Closed", dateClosed: new Date() }] });
    }
    if (throwawayPersonId) await ctx.delete(`${API}/membership/people/${throwawayPersonId}`, auth(jwt));
    await ctx.dispose();
  });

  test("delete my account sends a request for review instead of deleting the login", async ({ page }) => {
    // Safety net: the pre-feature page deletes the login outright; never let that hit the demo user.
    await page.route("**/membership/users", (route) => (route.request().method() === "DELETE" ? route.fulfill({ json: {} }) : route.continue()));

    await page.goto("/profile");
    const deleteButton = page.getByTestId("delete-account-button");
    await expect(deleteButton).toBeVisible({ timeout: 15000 });
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();
    await confirmDelete(page);

    await expect(page.getByTestId("account-deletion-pending")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("account-deletion-pending")).toContainText("awaiting review");
    await expect(deleteButton).toBeDisabled();

    // The request survives a reload and the login is still alive.
    await page.reload();
    await expect(page.getByTestId("account-deletion-pending")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("delete-account-button")).toBeDisabled();

    const requests = await openDeletionRequests(ctx, jwt);
    expect(requests).toHaveLength(1);
    expect(requests[0].associatedWithId).toBe(DEMO_PERSON_ID);
    expect(requests[0].assignedToId).toBe(APPROVAL_GROUP_ID);
    expect(requests[0].createdById).toBe(DEMO_PERSON_ID);
  });

  test("submitting again reuses the open request rather than filing a duplicate", async () => {
    const res = await ctx.post(`${API}/doing/tasks?type=accountDeletion`, { ...auth(jwt), data: [{ title: "again" }] });
    expect(res.ok()).toBeTruthy();
    expect(await openDeletionRequests(ctx, jwt)).toHaveLength(1);
  });

  test("staff can reject the request from the task page and the member can ask again", async ({ page }) => {
    const [request] = await openDeletionRequests(ctx, jwt);
    await page.goto("/serving/tasks/" + request.id);
    await expect(page.getByText("Account Deletion Request", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Demo User").first()).toBeVisible();

    await page.getByTestId("account-deletion-reject").click();
    await page.waitForURL(/\/serving\/tasks$/, { timeout: 15000 });

    expect(await openDeletionRequests(ctx, jwt)).toHaveLength(0);
    const closed = await (await ctx.get(`${API}/doing/tasks/${request.id}`, auth(jwt))).json();
    expect(closed.status).toBe("Closed");
    expect(JSON.parse(closed.data || "{}").outcome).toBe("rejected");

    await page.goto("/serving/tasks/" + request.id);
    await expect(page.getByTestId("account-deletion-outcome")).toContainText("rejected", { timeout: 15000 });

    // Rejected means nothing happened: the login still works and the member may ask again.
    await page.goto("/profile");
    await expect(page.getByTestId("delete-account-button")).toBeEnabled({ timeout: 15000 });
    await expect(page.getByTestId("account-deletion-pending")).toHaveCount(0);
  });

  test("approving a request anonymizes the person and removes their login", async ({ page }) => {
    const personRes = await ctx.post(`${API}/membership/people`, { ...auth(jwt), data: [{ name: { first: "Leaving", last: "Member" }, contactInfo: { email: "leaving.member@example.com" }, membershipStatus: "Member" }] });
    expect(personRes.ok()).toBeTruthy();
    const person = (await personRes.json())[0];
    throwawayPersonId = person.id;

    const taskRes = await ctx.post(`${API}/doing/tasks`, {
      ...auth(jwt),
      data: [
        {
          taskType: "accountDeletion",
          status: "Open",
          title: "Account deletion request from Leaving Member",
          associatedWithType: "person",
          associatedWithId: person.id,
          associatedWithLabel: "Leaving Member",
          createdByType: "person",
          createdById: person.id,
          createdByLabel: "Leaving Member",
          assignedToType: "group",
          assignedToId: APPROVAL_GROUP_ID,
          assignedToLabel: "Sunday Morning Service"
        }
      ]
    });
    expect(taskRes.ok()).toBeTruthy();
    const task = (await taskRes.json())[0];

    await page.goto("/serving/tasks/" + task.id);
    await expect(page.getByText("Account Deletion Request", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("account-deletion-approve")).toBeVisible();
    await page.screenshot({ path: ".pr-screenshots/after.png", fullPage: true });

    await page.getByTestId("account-deletion-approve").click();
    await confirmDelete(page);
    await page.waitForURL(/\/serving\/tasks$/, { timeout: 20000 });

    // The person drops out of the directory (removed) and the surviving row carries no PII.
    const direct = await ctx.get(`${API}/membership/people/${person.id}`, auth(jwt));
    expect((await direct.text()).includes("Leaving")).toBeFalsy();
    const rows = await (await ctx.get(`${API}/membership/people/ids?ids=${person.id}`, auth(jwt))).json();
    expect(rows).toHaveLength(1);
    expect(rows[0].name?.display).toBe("Anonymized");
    expect(rows[0].name?.last).toBe("User");
    expect(rows[0].contactInfo?.email || "").toBe("");

    const closed = await (await ctx.get(`${API}/doing/tasks/${task.id}`, auth(jwt))).json();
    expect(closed.status).toBe("Closed");
    expect(JSON.parse(closed.data || "{}").outcome).toBe("approved");
  });
});
