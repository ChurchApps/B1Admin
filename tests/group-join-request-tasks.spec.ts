import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// A request-to-join files an Open groupJoinRequest task assigned to each group leader.
// Leaders approve or decline from Serving > Tasks; that is the #1055 flow.
const API = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const GROUP_ID = "GRP00000023"; // Community Service Team — Demo User is the leader
const VOLUNTEER_PERSON_ID = "PER00000069"; // volunteer@b1.church, Rachel Martin, not a member

const auth = (jwt: string) => ({ headers: { Authorization: "Bearer " + jwt } });

async function apiLogin(ctx: APIRequestContext, email: string): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email, password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

async function openJoinTasks(ctx: APIRequestContext, jwt: string): Promise<any[]> {
  const res = await ctx.get(`${API}/doing/tasks`, auth(jwt));
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as any[]).filter((t) => t.taskType === "groupJoinRequest" && t.status === "Open");
}

test.describe.configure({ mode: "serial" });

test.describe("Group join request tasks", () => {
  let ctx: APIRequestContext;
  let demoJwt: string;
  let volunteerJwt: string;
  let originalGroup: any;
  let requestId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    demoJwt = await apiLogin(ctx, "demo@b1.church");
    volunteerJwt = await apiLogin(ctx, "volunteer@b1.church");
    const groupRes = await ctx.get(`${API}/membership/groups/${GROUP_ID}`, auth(demoJwt));
    expect(groupRes.ok()).toBeTruthy();
    originalGroup = await groupRes.json();
    const saveRes = await ctx.post(`${API}/membership/groups`, { ...auth(demoJwt), data: [{ ...originalGroup, joinPolicy: "request" }] });
    expect(saveRes.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    if (requestId) await ctx.delete(`${API}/membership/groupjoinrequests/${requestId}`, auth(volunteerJwt)).catch(() => {});
    const membersRes = await ctx.get(`${API}/membership/groupmembers?groupId=${GROUP_ID}`, auth(demoJwt));
    if (membersRes.ok()) {
      const members: any[] = await membersRes.json();
      for (const m of members) {
        if (m.personId === VOLUNTEER_PERSON_ID) await ctx.delete(`${API}/membership/groupmembers/${m.id}`, auth(demoJwt)).catch(() => {});
      }
    }
    if (originalGroup?.id) await ctx.post(`${API}/membership/groups`, { ...auth(demoJwt), data: [originalGroup] }).catch(() => {});
    for (const t of await openJoinTasks(ctx, demoJwt)) {
      await ctx.post(`${API}/doing/tasks`, { ...auth(demoJwt), data: [{ ...t, status: "Closed", dateClosed: new Date() }] }).catch(() => {});
    }
    await ctx.dispose();
  });

  test("a join request creates a task the group leader can approve", async ({ page }) => {
    await page.goto("/serving/tasks");
    await expect(page.getByTestId("add-task-button")).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: ".pr-screenshots/before.png", fullPage: true });

    const mine: any[] = await (await ctx.get(`${API}/membership/groupjoinrequests/my`, auth(volunteerJwt))).json();
    for (const r of mine) {
      if (r.groupId === GROUP_ID && r.status === "pending") await ctx.delete(`${API}/membership/groupjoinrequests/${r.id}`, auth(volunteerJwt));
    }

    const reqRes = await ctx.post(`${API}/membership/groupjoinrequests`, {
      ...auth(volunteerJwt),
      data: { groupId: GROUP_ID, message: "I'd like to help with community projects." }
    });
    expect(reqRes.ok()).toBeTruthy();
    const saved = await reqRes.json();
    requestId = saved.id;
    expect(requestId).toBeTruthy();

    const tasks = await openJoinTasks(ctx, demoJwt);
    const task = tasks.find((t) => {
      try { return JSON.parse(t.data || "{}").requestId === requestId; } catch { return false; }
    });
    expect(task).toBeTruthy();
    expect(task.assignedToId).toBe("PER00000082");
    expect(task.title).toMatch(/Rachel Martin requested to join Community Service Team/i);

    await page.goto("/serving/tasks/" + task.id);
    await expect(page.getByTestId("group-join-request-task")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("group-join-request-task")).toContainText("Rachel Martin");
    await expect(page.getByTestId("group-join-request-message")).toContainText("community projects");
    await expect(page.getByTestId("group-join-request-approve")).toBeVisible();
    await page.screenshot({ path: ".pr-screenshots/after.png", fullPage: true });

    await page.getByTestId("group-join-request-approve").click();
    await page.waitForURL(/\/serving\/tasks$/, { timeout: 15000 });

    const members: any[] = await (await ctx.get(`${API}/membership/groupmembers?groupId=${GROUP_ID}`, auth(demoJwt))).json();
    expect(members.some((m) => m.personId === VOLUNTEER_PERSON_ID)).toBeTruthy();

    const closed = await (await ctx.get(`${API}/doing/tasks/${task.id}`, auth(demoJwt))).json();
    expect(closed.status).toBe("Closed");
    requestId = "";
  });
});
