import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { groupsTest as test, loggedInTest, expect } from "./helpers/test-fixtures";

test.describe("Check-in: group configuration", () => {
  test("opens a seeded group detail page from the list", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
  });

  test("displays Track Attendance, Parent Pickup, Print Nametag from seed", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await expect(page.getByText("Track Attendance").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Parent Pickup").first()).toBeVisible();
    await expect(page.getByText(/Print Nametag|Print Name Tag/i).first()).toBeVisible();
  });

  test("edit form exposes Track Attendance, Parent Pickup, Print Nametag selects", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await page.getByTestId("edit-group-button").click();

    await expect(page.locator('[data-cy="select-attendance-type"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[name="parentPickup"]')).toBeVisible();
    await expect(page.locator('[name="printNametag"]')).toBeVisible();

    // Cancel out without mutating — other tests share this seed group.
    await page.locator("button").getByText("Cancel").click();
  });

  test("shows assigned service times for the group", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await expect(page.getByText("9:00 AM Service").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("10:30 AM Service").first()).toBeVisible();
  });

  test("edit form lists available service times for assignment", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await page.getByTestId("edit-group-button").click();

    const select = page.locator('[data-cy="choose-service-time"]');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();

    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await expect(options.filter({ hasText: "9:00 AM Service" }).first()).toBeVisible();

    await page.keyboard.press("Escape");
    await page.locator("button").getByText("Cancel").click();
  });

  test("saves a Parent Pickup toggle and reflects it in the display", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    // Target role=combobox, not [name="parentPickup"] (hidden native input).
    const parentPickupCombo = page.locator("#mui-component-select-parentPickup");

    await page.getByTestId("edit-group-button").click();
    await expect(parentPickupCombo).toBeVisible({ timeout: 10000 });
    await parentPickupCombo.click();
    await page.getByRole("option", { name: "Yes", exact: true }).click();

    const groupSavePromise = page.waitForResponse(
      (r) => r.url().includes("/groups") && r.request().method() === "POST",
      { timeout: 10000 }
    );
    await page.locator("button").getByText("Save").click();
    await groupSavePromise;

    await expect(parentPickupCombo).toHaveCount(0, { timeout: 10000 });

    const parentPickupRow = page.getByText("Parent Pickup", { exact: true }).locator("..");
    await expect(parentPickupRow.locator('svg[data-testid="CheckCircleIcon"]')).toBeVisible({ timeout: 10000 });

    // Restore seed state for parallel/subsequent runs.
    await page.getByTestId("edit-group-button").click();
    await expect(parentPickupCombo).toBeVisible({ timeout: 10000 });
    await parentPickupCombo.click();
    await page.getByRole("option", { name: "No", exact: true }).click();
    const revertPromise = page.waitForResponse(
      (r) => r.url().includes("/groups") && r.request().method() === "POST",
      { timeout: 10000 }
    );
    await page.locator("button").getByText("Save").click();
    await revertPromise;
    await expect(parentPickupCombo).toHaveCount(0, { timeout: 10000 });
    await expect(parentPickupRow.locator('svg[data-testid="CancelIcon"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Check-in: kiosk configuration links", () => {
  loggedInTest("Attendance Setup links to the check-in kiosk, QR and labels page", async ({ page }) => {
    await page.goto("/attendance");
    await page.getByTestId("attendance-verb-setup").click();
    const link = page.locator("a, button").filter({ hasText: "Check-in kiosk, QR, and labels" }).first();
    await link.waitFor({ state: "visible", timeout: 15000 });
    await link.click();
    await expect(page).toHaveURL(/\/mobile\/checkin$/, { timeout: 15000 });
  });

  loggedInTest("Settings Check-In section links to the same page", async ({ page }) => {
    await page.goto("/settings");
    await page.locator('[data-testid="settings-section-check-ins"]').click();
    const link = page.getByRole("link", { name: /Check-in kiosk, QR, and labels/ });
    await link.waitFor({ state: "visible", timeout: 15000 });
    await link.click();
    await expect(page).toHaveURL(/\/mobile\/checkin$/, { timeout: 15000 });
  });
});

// ChurchAppsSupport#1354: the QR sign-up checklist saves as the public guestRegistrationFields setting.
loggedInTest.describe("Check-in: QR sign-up fields", () => {
  loggedInTest.describe.configure({ mode: "serial" });
  const API = process.env.API_BASE || "http://localhost:8084";
  const CHURCH_ID = "CHU00000001";
  let ctx: APIRequestContext;
  let headers: Record<string, string>;
  let originals: any[] = [];

  const loadSettings = async () => (await (await ctx.get(`${API}/membership/settings`, { headers })).json()) as any[];

  loggedInTest.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = (login.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID);
    headers = { Authorization: "Bearer " + uc.jwt };
    const all = await loadSettings();
    originals = ["enableQRGuestRegistration", "guestRegistrationFields", "guestRegistrationGroupId"].map((k) => all.find((s) => s.keyName === k)).filter(Boolean);
    const qr = all.find((s) => s.keyName === "enableQRGuestRegistration") || { churchId: CHURCH_ID, keyName: "enableQRGuestRegistration", public: 1 };
    const fields = all.find((s) => s.keyName === "guestRegistrationFields") || { churchId: CHURCH_ID, keyName: "guestRegistrationFields", public: 1 };
    const res = await ctx.post(`${API}/membership/settings`, { headers, data: [{ ...qr, value: "true" }, { ...fields, value: "{}" }] });
    expect(res.ok()).toBeTruthy();
  });

  loggedInTest.afterAll(async () => {
    const all = await loadSettings();
    const fallback: Record<string, string> = { enableQRGuestRegistration: "false", guestRegistrationFields: "{}", guestRegistrationGroupId: "" };
    const restore = ["enableQRGuestRegistration", "guestRegistrationFields", "guestRegistrationGroupId"].map((k) => {
      const current = all.find((s) => s.keyName === k);
      const original = originals.find((s) => s.keyName === k);
      return current ? { ...current, value: original?.value ?? fallback[k] } : null;
    }).filter(Boolean);
    if (restore.length) await ctx.post(`${API}/membership/settings`, { headers, data: restore });
    await ctx.dispose();
  });

  loggedInTest("lists the profile fields with Required locked until Include is on", async ({ page }) => {
    await page.goto("/mobile/checkin");
    const table = page.getByTestId("guest-registration-fields");
    await expect(table.getByText("Sign-up fields")).toBeVisible({ timeout: 15000 });
    await expect(table.getByText(/added to People as a Visitor/)).toBeVisible();
    for (const label of [
      "Email", "Phone", "Home address", "Birth date", "Gender", "Marital status", "Grade", "Comments"
    ]) {
      await expect(page.getByLabel("Include " + label, { exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Include Email", { exact: true })).toBeChecked();
    await expect(page.getByLabel("Include Home address", { exact: true })).not.toBeChecked();
    await expect(page.getByLabel("Required Home address", { exact: true })).toBeDisabled();
  });

  loggedInTest("saves included and required fields as a public setting", async ({ page }) => {
    await page.goto("/mobile/checkin");
    await page.getByLabel("Include Home address", { exact: true }).check({ timeout: 15000 });
    await page.getByLabel("Required Home address", { exact: true }).check();
    await page.getByLabel("Include Grade", { exact: true }).check();
    await page.getByLabel("Include Gender", { exact: true }).check();
    await page.getByLabel("Required Gender", { exact: true }).check();
    // Turning Include off clears Required.
    await page.getByLabel("Include Gender", { exact: true }).uncheck();
    await expect(page.getByLabel("Required Gender", { exact: true })).not.toBeChecked();
    await page.getByLabel("Required Phone", { exact: true }).check();

    const saved = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByTestId("qr-guest-registration-save").click();
    await saved;

    const options = await (await ctx.get(`${API}/membership/people/guest-register/options?churchId=${CHURCH_ID}`)).json();
    expect(options).toEqual({ email: "optional", phone: "required", address: "required", birthDate: "off", gender: "off", maritalStatus: "off", grade: "optional", comments: "off" });

    await page.reload();
    await expect(page.getByLabel("Required Home address", { exact: true })).toBeChecked({ timeout: 15000 });
    await expect(page.getByLabel("Include Grade", { exact: true })).toBeChecked();
    await expect(page.getByLabel("Include Gender", { exact: true })).not.toBeChecked();
  });
  // ChurchAppsSupport#1374: the church picks a group for this occasion, and a guest's comment lands on their Notes tab.
  loggedInTest("adds new guests to the chosen group and saves their comment as a note", async ({ page }) => {
    const lastName = "Zebedeepicnic";
    // Start from the default checklist; the test above leaves phone and address required.
    const fieldsRow = (await loadSettings()).find((s) => s.keyName === "guestRegistrationFields");
    await ctx.post(`${API}/membership/settings`, { headers, data: [{ ...fieldsRow, value: "{}" }] });
    await page.goto("/mobile/checkin");
    await page.getByLabel("Include Comments", { exact: true }).check({ timeout: 15000 });
    await page.getByTestId("guest-registration-group").click();
    await page.getByRole("option", { name: "Young Adults Class", exact: true }).click();
    await expect(page.getByText("Change this before each event to follow up its guests together.")).toBeVisible();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.screenshot({ path: ".pr-screenshots/after.png", fullPage: true });

    const saved = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByTestId("qr-guest-registration-save").click();
    await saved;

    // The group is private: the guest page never sees it, but the admin list keeps it.
    const groupSetting = (await loadSettings()).find((s) => s.keyName === "guestRegistrationGroupId");
    expect(groupSetting?.value).toBe("GRP00000005");
    expect(Number(groupSetting?.public ?? 0)).toBe(0);
    const options = await (await ctx.get(`${API}/membership/people/guest-register/options?churchId=${CHURCH_ID}`)).json();
    expect(options.comments).toBe("optional");

    const reg = await ctx.post(`${API}/membership/people/guest-register`, { data: { churchId: CHURCH_ID, members: [{ firstName: "Zelda", lastName }], comments: "Met you at the church picnic" } });
    expect(reg.ok()).toBeTruthy();
    const head = (await reg.json()).people[0];
    try {
      const roster = (await (await ctx.get(`${API}/membership/groupmembers?groupId=GRP00000005`, { headers })).json()) as any[];
      expect(roster.some((gm) => gm.personId === head.id)).toBeTruthy();

      await page.goto(`/people/${head.id}?view=notes`);
      await expect(page.getByTestId("notes-box").getByText("Met you at the church picnic")).toBeVisible({ timeout: 15000 });

      await page.goto("/mobile/checkin");
      await expect(page.getByTestId("guest-registration-group")).toContainText("Young Adults Class", { timeout: 15000 });
    } finally {
      const roster = (await (await ctx.get(`${API}/membership/groupmembers?groupId=GRP00000005`, { headers })).json()) as any[];
      for (const gm of roster.filter((m) => m.personId === head.id)) await ctx.delete(`${API}/membership/groupmembers/${gm.id}`, { headers });
      await ctx.delete(`${API}/membership/people/${head.id}`, { headers });
    }
  });
});
