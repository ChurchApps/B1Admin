import { test, expect, request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { confirmDelete, editIconButton, openKnownPerson, SEED_PEOPLE } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// Phase 3 — Check-Ins child safety (B1Admin side). Covers the Check-In Capacity
// group fields, the household Pickup card, the checkinType chip, and the
// ratioEnforcement church setting. API-driven setup creates its own groups and a
// throwaway person so it never mutates the kiosk agent's seeded rows
// (GRP00000009, Smith household HOU00000001).

const API = "http://localhost:8084";
const TS = Date.now();

let api: APIRequestContext;
let auth: { headers: { Authorization: string } };
const createdGroupIds: string[] = [];

async function apiLogin() {
  api = await pwRequest.newContext();
  const res = await api.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  auth = { headers: { Authorization: "Bearer " + uc.jwt } };
}

async function createGroup(name: string) {
  const res = await api.post(`${API}/membership/groups`, { ...auth, data: [{ name, categoryName: "CheckinSafety", trackAttendance: true, tags: "standard" }] });
  const arr = await res.json();
  createdGroupIds.push(arr[0].id);
  return arr[0];
}

async function getGroup(id: string) {
  const res = await api.get(`${API}/membership/groups/${id}`, auth);
  return res.json();
}

test.describe.serial("Check-Ins child safety", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    await apiLogin();
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    for (const id of createdGroupIds) await api.delete(`${API}/membership/groups/${id}`, auth).catch(() => {});
    await api.dispose();
    await page?.context().close();
  });

  test("Check-In Capacity fields round-trip and clear on a group", async () => {
    const group = await createGroup(`Checkin Capacity ${TS}`);
    await page.goto(`/groups/${group.id}`);
    await editIconButton(page).first().click();
    await page.locator('[data-testid="capacity-input"]').waitFor({ state: "visible", timeout: 10000 });

    await page.locator('[data-testid="capacity-input"] input, input[name="capacity"]').first().fill("10");
    await page.locator('input[name="guestCapacity"]').fill("3");
    await page.locator('input[name="volunteerRatio"]').fill("5");
    await page.locator('input[name="minVolunteers"]').fill("2");
    await page.locator('[data-testid="checkin-closed-select"]').click();
    await page.getByRole("option", { name: "Yes" }).click();

    const save1 = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST" && r.status() === 200);
    await page.getByRole("button", { name: "Save" }).click();
    await save1;

    let saved = await getGroup(group.id);
    expect(saved.capacity).toBe(10);
    expect(saved.guestCapacity).toBe(3);
    expect(saved.volunteerRatio).toBe(5);
    expect(saved.minVolunteers).toBe(2);
    expect(saved.checkinClosed).toBeTruthy();

    // Clear the capacity field — explicit null must persist through the save.
    await editIconButton(page).first().click();
    await page.locator('input[name="capacity"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('input[name="capacity"]').fill("");
    const save2 = page.waitForResponse((r) => r.url().includes("/groups") && r.request().method() === "POST" && r.status() === 200);
    await page.getByRole("button", { name: "Save" }).click();
    await save2;

    saved = await getGroup(group.id);
    expect(saved.capacity == null).toBeTruthy();
    // Other fields survive clearing a sibling field.
    expect(saved.guestCapacity).toBe(3);
  });

  test("Pickup card: add trusted + not-authorized, toggle, delete", async () => {
    await openKnownPerson(page, SEED_PEOPLE.DONALD);
    const trustedName = `Grandpa Joe ${TS}`;
    const flaggedName = `Bad Actor ${TS}`;

    const box = page.locator('[data-testid="pickup-box"]');
    await expect(box).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="pickup-add-toggle"]').click();
    await page.locator('[data-testid="pickup-name-input"] input').fill(trustedName);
    const add1 = page.waitForResponse((r) => r.url().includes("/householdpickup") && r.request().method() === "POST");
    await page.locator('[data-testid="pickup-save-button"]').click();
    await add1;
    const trustedRow = page.locator('[data-testid="pickup-row"]').filter({ hasText: trustedName });
    await expect(trustedRow).toBeVisible({ timeout: 10000 });
    await expect(trustedRow.locator('[data-testid="pickup-status-chip"]')).toHaveText("Trusted");

    await page.locator('[data-testid="pickup-add-toggle"]').click();
    await page.locator('[data-testid="pickup-name-input"] input').fill(flaggedName);
    await page.locator('[data-testid="pickup-status-select"]').click();
    await page.getByRole("option", { name: "Not Authorized" }).click();
    const add2 = page.waitForResponse((r) => r.url().includes("/householdpickup") && r.request().method() === "POST");
    await page.locator('[data-testid="pickup-save-button"]').click();
    await add2;
    const flaggedRow = page.locator('[data-testid="pickup-row"]').filter({ hasText: flaggedName });
    await expect(flaggedRow).toBeVisible({ timeout: 10000 });
    await expect(flaggedRow.locator('[data-testid="pickup-status-chip"]')).toHaveText("Not Authorized");

    const toggle = page.waitForResponse((r) => r.url().includes("/householdpickup") && r.request().method() === "POST");
    await trustedRow.locator('[data-testid="pickup-status-chip"]').click();
    await toggle;
    await expect(trustedRow.locator('[data-testid="pickup-status-chip"]')).toHaveText("Not Authorized", { timeout: 10000 });
    for (const name of [trustedName, flaggedName]) {
      const row = page.locator('[data-testid="pickup-row"]').filter({ hasText: name });
      const del = page.waitForResponse((r) => r.url().includes("/householdpickup") && r.request().method() === "DELETE");
      await row.locator('[data-testid="pickup-delete-button"]').click();
      await confirmDelete(page);
      await del;
      await expect(row).toHaveCount(0, { timeout: 10000 });
    }
  });

  test("checkinType chip renders for a volunteer visit", async () => {
    const group = await createGroup(`Checkin Type ${TS}`);
    // Link the group to a seeded service time so check-in creates a session for it.
    await api.post(`${API}/attendance/groupservicetimes`, { ...auth, data: [{ groupId: group.id, serviceTimeId: "SST00000001" }] });

    const pr = await api.post(`${API}/membership/people/loadOrCreate`, { data: { churchId: "CHU00000001", email: `vol${TS}@example.com`, firstName: "Vol", lastName: `Unteer${TS}` } });
    const person = await pr.json();

    await api.post(`${API}/attendance/visits/checkin?serviceId=SER00000001&peopleIds=${person.id}`, {
      ...auth,
      data: [{ personId: person.id, serviceId: "SER00000001", checkinType: "volunteer", visitSessions: [{ session: { serviceTimeId: "SST00000001", groupId: group.id } }] }]
    });

    await page.goto(`/groups/${group.id}`);
    await page.getByRole("tab", { name: "Sessions" }).click();
    await expect(page.locator("#groupMemberTable a.personName").first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="checkin-type-chip"]').first()).toHaveText("Volunteer", { timeout: 20000 });
    await expect(page.locator('[data-testid="volunteer-count-chip"]')).toBeVisible();
  });

  test("ratioEnforcement setting round-trips", async () => {
    await page.goto("/settings");
    await page.locator('[data-testid="settings-section-check-ins"]').click();
    await page.locator('[data-testid="settings-check-ins"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");

    await page.locator('[data-testid="ratio-enforcement-select"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[data-testid="ratio-enforcement-select"]').click();
    await page.getByRole("option", { name: "Block (prevent check-in)" }).click();

    const save = page.waitForResponse((r) => r.url().includes("/settings") && r.request().method() === "POST" && r.status() === 200);
    await page.getByRole("button", { name: "Save" }).click();
    await save;

    const res = await api.get(`${API}/membership/settings`, auth);
    const settings = await res.json();
    const found = (settings || []).find((s: any) => s.keyName === "ratioEnforcement");
    expect(found?.value).toBe("block");

    // Reset the church setting so reruns start from the default.
    if (found?.id) await api.post(`${API}/membership/settings`, { ...auth, data: [{ ...found, value: "warn" }] });
  });
});
