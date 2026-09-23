import { request, type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { personDetailsEditButton } from "./helpers/fixtures";

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const GRACE_CHURCH_ID = "CHU00000001";

let ctx: APIRequestContext;
let auth: { headers: { Authorization: string } };
const suffix = Date.now().toString().slice(-7);

async function api(method: "get" | "post" | "delete", path: string, data?: unknown) {
  const res = await ctx[method](`${API_BASE}${path}`, { ...auth, ...(data !== undefined ? { data } : {}) });
  expect(res.ok(), `${method.toUpperCase()} ${path} -> ${res.status()}`).toBeTruthy();
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function createPerson(first: string, last: string, extra: Record<string, unknown> = {}) {
  const [p] = await api("post", "/membership/people", [{ name: { first, last }, contactInfo: {}, ...extra }]);
  return p as { id: string; householdId: string };
}

async function createGroup(name: string) {
  const [g] = await api("post", "/membership/groups", [{ name, categoryName: "Test", tags: "standard" }]);
  return g as { id: string };
}

async function addToGroup(groupId: string, personId: string) {
  await api("post", "/membership/groupmembers", [{ groupId, personId }]);
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
  await ctx.dispose();
});

async function openPerson(page: Page, id: string) {
  await page.goto(`/people/${id}`);
  await expect(personDetailsEditButton(page).first()).toBeVisible({ timeout: 20000 });
}

test("merge aborts without deleting when a lookup fails, then merges without duplicate group memberships", async ({ page }) => {
  test.slow();
  const winner = await createPerson("Mergewin", `Integrity${suffix}`);
  const loser = await createPerson("Mergelose", `Integrity${suffix}`);
  const shared = await createGroup(`Merge Shared ${suffix}`);
  const loserOnly = await createGroup(`Merge LoserOnly ${suffix}`);
  await addToGroup(shared.id, winner.id);
  await addToGroup(shared.id, loser.id);
  await addToGroup(loserOnly.id, loser.id);

  await openPerson(page, winner.id);
  await personDetailsEditButton(page).first().click();
  await page.getByTestId("merge-person-button").click();
  await page.locator('[name="personAddText"]').fill(`Mergelose Integrity${suffix}`);
  await page.locator("#mergeBox").getByRole("button", { name: "Search" }).click();
  const loserRow = page.locator("#searchResults tr").filter({ hasText: "Mergelose" }).first();
  await expect(loserRow).toBeVisible({ timeout: 20000 });

  await page.route("**/donations?personId=*", (route) => route.fulfill({ status: 500, body: "{}" }));
  let deleteCalled = false;
  page.on("request", (r) => { if (r.method() === "DELETE" && r.url().includes(`/people/${loser.id}`)) deleteCalled = true; });
  await loserRow.locator('[data-testid="select-person-button"]').click();
  await page.locator('[data-cy="confirm-merge"]').click();
  await expect(page.locator("#mergeBox")).toContainText("Unable to save", { timeout: 20000 });
  expect(deleteCalled).toBe(false);
  const loserStill = await api("get", `/membership/groupmembers?personId=${loser.id}`);
  expect(loserStill).toHaveLength(2);

  await page.unroute("**/donations?personId=*");
  await loserRow.locator('[data-testid="select-person-button"]').click();
  const nav = page.waitForURL(/\/people(\?|$)/, { timeout: 30000 });
  await page.locator('[data-cy="confirm-merge"]').click();
  await nav;
  expect(deleteCalled).toBe(true);

  const winnerGroups: { groupId: string }[] = await api("get", `/membership/groupmembers?personId=${winner.id}`);
  expect(winnerGroups.filter((gm) => gm.groupId === shared.id)).toHaveLength(1);
  expect(winnerGroups.filter((gm) => gm.groupId === loserOnly.id)).toHaveLength(1);
  const loserGroups = await api("get", `/membership/groupmembers?personId=${loser.id}`);
  expect(loserGroups).toHaveLength(0);
});

test("household address update keeps the person's other edits", async ({ page }) => {
  const head = await createPerson("Housea", `Integrity${suffix}`, { contactInfo: { address1: "1 Old St", city: "Oldtown", state: "TX", zip: "75001" } });
  const spouse = await createPerson("Houseb", `Integrity${suffix}`, { contactInfo: { address1: "1 Old St", city: "Oldtown", state: "TX", zip: "75001" } });
  await api("post", `/membership/people/household/${head.householdId}`, [
    { ...(await api("get", `/membership/people/${head.id}`)), householdId: head.householdId },
    { ...(await api("get", `/membership/people/${spouse.id}`)), householdId: head.householdId }
  ]);

  await openPerson(page, head.id);
  await personDetailsEditButton(page).first().click();
  await page.locator("#first").fill("Houseedited");
  await page.locator("#address1").fill("99 New Ave");
  await page.getByRole("button", { name: "Save" }).click();
  const modal = page.locator('[data-cy="update-household-modal"]');
  await expect(modal).toBeVisible({ timeout: 15000 });
  await modal.locator('[data-cy="yes-button"]').click();
  await expect(modal).toBeHidden({ timeout: 15000 });

  await expect.poll(async () => (await api("get", `/membership/people/${head.id}`)).name.first, { timeout: 15000 }).toBe("Houseedited");
  const savedHead = await api("get", `/membership/people/${head.id}`);
  expect(savedHead.contactInfo.address1).toBe("99 New Ave");
  const savedSpouse = await api("get", `/membership/people/${spouse.id}`);
  expect(savedSpouse.contactInfo.address1).toBe("99 New Ave");
  expect(savedSpouse.name.first).toBe("Houseb");
});

test("unticking a just-granted role permission removes it", async ({ page }) => {
  const [role] = await api("post", "/membership/roles", [{ name: `Integrity Role ${suffix}` }]);
  const permissions: { section: string; action: string; displayAction: string; displaySection: string }[] = await api("get", "/membership/permissions");
  const perm = permissions[0];

  await page.goto(`/settings/role/${role.id}`);
  await page.getByTestId("role-permission-filter").locator("input").fill(perm.displaySection);
  const box = page.getByTestId(`role-permission-checkbox-${perm.section}-${perm.action}`).first().locator("input");
  await expect(box).toBeVisible({ timeout: 20000 });

  const saved = page.waitForResponse((r) => r.url().includes("/rolepermissions") && r.request().method() === "POST");
  await box.check();
  await saved;
  await expect.poll(async () => (await api("get", `/membership/rolepermissions/roles/${role.id}`)).length).toBe(1);

  const removed = page.waitForResponse((r) => r.url().includes("/rolepermissions/") && r.request().method() === "DELETE");
  await box.uncheck();
  expect((await removed).url()).not.toContain("object");
  await expect.poll(async () => (await api("get", `/membership/rolepermissions/roles/${role.id}`)).length).toBe(0);
});

test("group 'is not member of' filter excludes the group's members", async ({ page }) => {
  const member = await createPerson("Filtermember", `Integrity${suffix}`);
  const outsider = await createPerson("Filteroutsider", `Integrity${suffix}`);
  const groupName = `Filter Group ${suffix}`;
  const group = await createGroup(groupName);
  await addToGroup(group.id, member.id);

  await page.goto("/people");
  await page.locator("p").getByText(/[▶▼] Advanced/).click();
  await page.locator("#peopleSearch").getByText("Membership & Groups").click();
  const label = page.locator("#peopleSearch").getByText("Group Member", { exact: true });
  await label.locator("xpath=..").locator('input[type="checkbox"]').check();
  const row = label.locator("xpath=../..");
  const selects = row.locator('[aria-haspopup="listbox"]');
  await expect(selects).toHaveCount(2);

  // Match the search by its conditions; toggling the filter on fires its own search first.
  const searchFor = (operator: string) => page.waitForResponse((r) => r.url().includes("/people/advancedSearch") && r.ok()
    && (r.request().postData() || "").includes(`"operator":"${operator}","value":"${member.id}"`));
  const ids = async (resp: ReturnType<typeof searchFor>) => ((await (await resp).json()) as { id: string }[]).map((p) => p.id);

  const isMember = searchFor("in");
  await selects.nth(1).click();
  await page.getByRole("option", { name: groupName }).click();
  expect(await ids(isMember)).toEqual([member.id]);

  const notMember = searchFor("notEqual");
  await selects.nth(0).click();
  await page.getByRole("option", { name: "is not member of" }).click();
  const otherIds = await ids(notMember);
  expect(otherIds).not.toContain(member.id);
  expect(otherIds).toContain(outsider.id);
});
