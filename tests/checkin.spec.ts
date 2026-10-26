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

  const GUEST_KEYS = ["enableQRGuestRegistration", "guestRegistrationFields", "guestRegistrationGroupId", "guestRegistrationRecordAttendance", "guestRegistrationImage"];
  const loadSettings = async () => (await (await ctx.get(`${API}/membership/settings`, { headers })).json()) as any[];

  loggedInTest.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    const uc = (login.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID);
    headers = { Authorization: "Bearer " + uc.jwt };
    const all = await loadSettings();
    originals = GUEST_KEYS.map((k) => all.find((s) => s.keyName === k)).filter(Boolean);
    const qr = all.find((s) => s.keyName === "enableQRGuestRegistration") || { churchId: CHURCH_ID, keyName: "enableQRGuestRegistration", public: 1 };
    const fields = all.find((s) => s.keyName === "guestRegistrationFields") || { churchId: CHURCH_ID, keyName: "guestRegistrationFields", public: 1 };
    const res = await ctx.post(`${API}/membership/settings`, { headers, data: [{ ...qr, value: "true" }, { ...fields, value: "{}" }] });
    expect(res.ok()).toBeTruthy();
  });

  loggedInTest.afterAll(async () => {
    const all = await loadSettings();
    const fallback: Record<string, string> = { enableQRGuestRegistration: "false", guestRegistrationFields: "{}", guestRegistrationGroupId: "", guestRegistrationRecordAttendance: "false", guestRegistrationImage: "" };
    const restore = GUEST_KEYS.map((k) => {
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

  // ChurchAppsSupport#1375: a guest who signs up while one of the group's scheduled service times is under way is marked present.
  loggedInTest("records attendance for guests who sign up during the group's scheduled service time", async ({ page }) => {
    const lastName = "Zebedeeattends";
    const personIds: string[] = [];
    const register = async (firstName: string) => {
      const reg = await ctx.post(`${API}/membership/people/guest-register`, { data: { churchId: CHURCH_ID, members: [{ firstName, lastName }] } });
      expect(reg.ok()).toBeTruthy();
      const id = (await reg.json()).people[0].id;
      personIds.push(id);
      return id;
    };
    const visitsFor = async (personId: string) => (await (await ctx.get(`${API}/attendance/visits?personId=${personId}`, { headers })).json()) as any[];

    await page.goto("/mobile/checkin");
    // The switch only makes sense once a group is picked.
    await expect(page.getByTestId("guest-registration-group")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("guest-registration-group").click();
    await page.getByRole("option", { name: "None", exact: true }).click();
    await expect(page.getByLabel("Also record attendance", { exact: true })).toHaveCount(0);
    await page.getByTestId("guest-registration-group").click();
    await page.getByRole("option", { name: "Young Adults Class", exact: true }).click();
    await page.getByLabel("Also record attendance", { exact: true }).check();
    await expect(page.getByText(/scheduled service times are marked present/)).toBeVisible();
    await page.getByTestId("guest-registration-group").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.screenshot({ path: ".pr-screenshots/after.png" });

    const saved = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByTestId("qr-guest-registration-save").click();
    await saved;
    const flag = (await loadSettings()).find((s) => s.keyName === "guestRegistrationRecordAttendance");
    expect(flag?.value).toBe("true");
    expect(Number(flag?.public ?? 0)).toBe(0);

    let serviceTimeId = "";
    let linkId = "";
    try {
      // The seeded service times have no schedule, so they never count as under way.
      const early = await register("Zinnia");
      expect(await visitsFor(early)).toHaveLength(0);

      // A service time open all of today (any church time zone) linked to the guest group.
      const now = new Date();
      const st = (await (await ctx.post(`${API}/attendance/servicetimes`, { headers, data: [{ serviceId: "SER00000001", name: "Guest Sign-up Test", dayOfWeek: now.getUTCDay(), startTime: "00:00", endTime: "23:59", checkinOpenMinutes: 720, checkinCloseMinutes: 720 }] })).json())[0];
      serviceTimeId = st.id;
      linkId = (await (await ctx.post(`${API}/attendance/groupservicetimes`, { headers, data: [{ groupId: "GRP00000005", serviceTimeId }] })).json())[0].id;

      const during = await register("Zeke");
      const visits = await visitsFor(during);
      expect(visits).toHaveLength(1);
      expect(visits[0]).toEqual(expect.objectContaining({ groupId: "GRP00000005", serviceId: "SER00000001" }));

      await page.reload();
      await expect(page.getByLabel("Also record attendance", { exact: true })).toBeChecked({ timeout: 15000 });
    } finally {
      for (const id of personIds) {
        for (const v of await visitsFor(id)) await ctx.delete(`${API}/attendance/visits/${v.id}`, { headers });
      }
      if (linkId) await ctx.delete(`${API}/attendance/groupservicetimes/${linkId}`, { headers });
      if (serviceTimeId) await ctx.delete(`${API}/attendance/servicetimes/${serviceTimeId}`, { headers });
      const roster = (await (await ctx.get(`${API}/membership/groupmembers?groupId=GRP00000005`, { headers })).json()) as any[];
      for (const gm of roster.filter((m) => personIds.includes(m.personId))) await ctx.delete(`${API}/membership/groupmembers/${gm.id}`, { headers });
      for (const id of personIds) await ctx.delete(`${API}/membership/people/${id}`, { headers });
    }
  });

  // ChurchAppsSupport#1375: the church can show its own photo at the top of the sign-up page.
  loggedInTest("saves a header photo for the sign-up page and can remove it", async ({ page }) => {
    await page.goto("/mobile/checkin");
    const photo = page.getByTestId("guest-registration-photo");
    await expect(page.getByText("Header photo", { exact: true })).toBeVisible({ timeout: 15000 });
    await photo.getByRole("button", { name: "Change photo" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const imageRow = (await loadSettings()).find((s) => s.keyName === "guestRegistrationImage") || { churchId: CHURCH_ID, keyName: "guestRegistrationImage", public: 1 };
    const imageUrl = new URL("/images/logo-login.png", page.url()).toString();
    await ctx.post(`${API}/membership/settings`, { headers, data: [{ ...imageRow, value: imageUrl }] });
    const publicSettings = await (await ctx.get(`${API}/membership/settings/public/${CHURCH_ID}`)).json();
    expect(publicSettings.guestRegistrationImage).toBe(imageUrl);

    await page.reload();
    await expect(photo.getByRole("img", { name: "Header photo" })).toHaveAttribute("src", imageUrl, { timeout: 15000 });
    await photo.getByRole("button", { name: "Remove" }).click();
    await expect(photo.getByRole("img")).toHaveCount(0);
    const saved = page.waitForResponse((r) => r.url().includes("/membership/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByTestId("qr-guest-registration-save").click();
    await saved;
    expect((await loadSettings()).find((s) => s.keyName === "guestRegistrationImage")?.value || "").toBe("");
  });
});
