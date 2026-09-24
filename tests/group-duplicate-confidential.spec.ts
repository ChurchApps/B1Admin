import { request, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { confirmDelete } from "./helpers/fixtures";

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const GRACE_CHURCH_ID = "CHU00000001";

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const suffix = Date.now().toString().slice(-7);
const cleanup: string[] = [];

async function api(method: "get" | "post" | "delete", path: string, data?: unknown) {
  const res = await ctx[method](`${API_BASE}${path}`, { ...auth, ...(data !== undefined ? { data } : {}) });
  expect(res.ok(), `${method.toUpperCase()} ${path} -> ${res.status()}`).toBeTruthy();
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  ctx = await request.newContext();
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const grace = body.userChurches.find((uc: { church: { id: string } }) => uc.church.id === GRACE_CHURCH_ID);
  auth = { headers: { Authorization: "Bearer " + grace.jwt } };
});

test.afterAll(async () => {
  for (const path of cleanup.reverse()) {
    await ctx.delete(`${API_BASE}${path}`, auth).catch(() => undefined);
  }
  await ctx.dispose();
});

test("duplicating a confidential group keeps it confidential", async ({ page }) => {
  const [group] = await api("post", "/membership/groups", [{ name: `Review Confidential ${suffix}`, categoryName: "Test", tags: "standard", confidential: true, publicRoster: false }]);
  cleanup.push(`/membership/groups/${group.id}`);

  await page.goto(`/groups/${group.id}`);
  const groupPost = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST", { timeout: 15000 });
  await page.locator('[data-testid="duplicate-group-button"]').click();
  await confirmDelete(page);
  const created = await (await groupPost).json();
  const copyId = created[0].id;
  cleanup.push(`/membership/groups/${copyId}`);

  const copy = await api("get", `/membership/groups/${copyId}`);
  expect(copy.confidential).toBeTruthy();
});
