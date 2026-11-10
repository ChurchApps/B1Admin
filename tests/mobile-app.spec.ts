import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToMobile, siblingNav } from "./helpers/navigation";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// Mobile App Settings tests per ChurchAppsSupport/b1Admin/mobile-admin.md.
const DISPOSABLE_TAB = "Zacchaeus Test Tab";
const API = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";

async function openMobileSettings(page: import("@playwright/test").Page) {
  await navigateToMobile(page);
  await page.waitForURL(/\/mobile\/navigation/, { timeout: 15000 });
  // Use #page-header-title to avoid getByRole heading strict-mode collision with subtitle.
  await page.locator("#page-header-title").filter({ hasText: "Navigation" })
    .waitFor({ state: "visible", timeout: 15000 });
}

async function openAddTabDrawer(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /^Add Tab$/i }).first().click();
  await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
}

async function selectMuiByLabel(page: import("@playwright/test").Page, labelText: string, optionText: string) {
  const select = page.getByLabel(labelText, { exact: true }).first();
  await select.click();
  const option = page.locator('li[role="option"]', { hasText: new RegExp(`^${optionText}$`, "i") }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
}

async function saveSettings(page: Page) {
  const saved = page.waitForResponse((r) => r.url().includes("/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
  await page.getByRole("button", { name: /^Save$/ }).click();
  await saved;
}

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

async function findTabRow(page: import("@playwright/test").Page, tabName: string) {
  // Wait for heading to confirm existence, then return listitem via filter for button scope.
  const heading = page.getByRole("heading", { level: 3, name: tabName, exact: true });
  await heading.first().waitFor({ state: "visible", timeout: 15000 });
  return page.getByRole("listitem").filter({ has: heading }).first();
}

test.describe("Mobile App Settings page", () => {
  test("renders the page with header, subtitle, and Add Tab button", async ({ page }) => {
    await openMobileSettings(page);
    await expect(page.locator("#page-header-title")).toContainText("Navigation");
    await expect(page.locator("#page-header-subtitle")).toContainText("Tabs on the B1.church app");
    await expect(page.getByRole("button", { name: /^Add Tab$/ }).first()).toBeVisible();
  });

  test("explains the three-tab phone tab bar cap", async ({ page }) => {
    await openMobileSettings(page);
    await expect(page.getByText("The first three tabs appear in the phone tab bar; the rest are under More.")).toBeVisible();
  });

  test("shows the App Tabs card heading", async ({ page }) => {
    await openMobileSettings(page);
    await expect(page.getByText("App Tabs").first()).toBeVisible({ timeout: 15000 });
  });

  test("opens Add Tab drawer with Name, Type, Visibility, and Save controls", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await expect(page.locator('input[name="text"]')).toBeVisible();
    await expect(page.getByLabel("Tab Type")).toBeVisible();
    await expect(page.getByLabel("Visibility")).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Tab/i })).toBeVisible();
  });

  test("Tab Type dropdown exposes documented options (Bible, Live Stream, Donation, External URL)", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.getByLabel("Tab Type").click();
    await expect(page.locator('li[role="option"]', { hasText: /^Bible$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('li[role="option"]', { hasText: /^Live Stream$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^Donation$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^External URL$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^Registrations$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^Requests$/ })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /^Lessons$/ })).toHaveCount(0);
    await expect(page.locator('li[role="option"]', { hasText: /^Donation Landing$/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("Visibility dropdown exposes documented options including Specific Groups", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.getByLabel("Visibility").click();
    await expect(page.locator('li[role="option"]', { hasText: /Everyone/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('li[role="option"]', { hasText: /Logged-in Users/i })).toBeVisible();
    await expect(page.locator('li[role="option"]', { hasText: /Specific Groups/i })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("switching Tab Type to External URL surfaces the URL field", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await selectMuiByLabel(page, "Tab Type", "External URL");
    await expect(page.locator('input[name="url"]')).toBeVisible({ timeout: 10000 });
  });

  test("switching Visibility to Specific Groups surfaces the group picker", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await selectMuiByLabel(page, "Visibility", "Specific Groups...");
    // The group picker section displays "Select Groups:" or "No groups found"
    await expect(page.getByText(/Select Groups|No groups found/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("a Member Directory tab points from Visibility to Show in Directory", async ({ page }) => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    const hint = page.getByText(/Who can open the directory is set by Show in Directory/i);
    await selectMuiByLabel(page, "Tab Type", "Bible");
    await expect(hint).toHaveCount(0);
    await selectMuiByLabel(page, "Tab Type", "Member Directory");
    await expect(hint).toBeVisible({ timeout: 10000 });
  });
});

test.describe.serial("Mobile tab lifecycle", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("creates a new External URL tab", async () => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(DISPOSABLE_TAB);
    await selectMuiByLabel(page, "Tab Type", "External URL");
    await page.locator('input[name="url"]').fill("https://example.org");
    await page.getByRole("button", { name: /Save Tab/i }).click();
    const row = await findTabRow(page, DISPOSABLE_TAB);
    await expect(row.getByText("Everyone (including anonymous)", { exact: true })).toBeVisible();
  });

  test("opens the existing tab in the edit drawer with delete affordance", async () => {
    await openMobileSettings(page);
    const row = await findTabRow(page, DISPOSABLE_TAB);
    await row.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator('input[name="text"]')).toHaveValue(DISPOSABLE_TAB, { timeout: 10000 });
    await expect(page.getByRole("button", { name: /Delete Tab/i })).toBeVisible();
  });

  test("deletes the disposable tab", async () => {
    await openMobileSettings(page);
    const row = await findTabRow(page, DISPOSABLE_TAB);
    await row.getByRole("button", { name: "Edit" }).click();
    await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: /Delete Tab/i }).click();
    await confirmDelete(page);
    await expect(page.getByRole("heading", { level: 3, name: DISPOSABLE_TAB, exact: true }))
      .toHaveCount(0, { timeout: 15000 });
  });
});

// ChurchAppsSupport#1503: Requests opens the member's My Requests screen in the app.
test.describe.serial("Mobile Requests tab", () => {
  test.describe.configure({ retries: 0 });
  let page: Page;
  const TAB = "Zacchaeus Requests Tab";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("creates a Requests tab and keeps its type", async () => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(TAB);
    await selectMuiByLabel(page, "Tab Type", "Requests");
    await selectMuiByLabel(page, "Visibility", "Logged-in Users");
    await page.getByRole("button", { name: /Save Tab/i }).click();
    const row = await findTabRow(page, TAB);
    await expect(row.getByText("requests", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator('input[name="text"]')).toHaveValue(TAB, { timeout: 10000 });
    await expect(page.getByLabel("Tab Type")).toHaveText("Requests");
  });

  test("deletes the Requests tab", async () => {
    await openMobileSettings(page);
    const row = await findTabRow(page, TAB);
    await row.getByRole("button", { name: "Edit" }).click();
    await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: /Delete Tab/i }).click();
    await confirmDelete(page);
    await expect(page.getByRole("heading", { level: 3, name: TAB, exact: true })).toHaveCount(0, { timeout: 15000 });
  });
});

// mobile-admin.md steps 12-13: tab ordering via the row Move Up / Move Down
// icon buttons (each move POSTs the re-sorted list to /links).
test.describe.serial("Mobile tab ordering", () => {
  // Retries would duplicate tabs; data is shared across serial tests.
  test.describe.configure({ retries: 0 });
  let page: Page;
  const TAB_A = "Zacchaeus Order Tab A";
  const TAB_B = "Zacchaeus Order Tab B";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  async function createUrlTab(name: string) {
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(name);
    await selectMuiByLabel(page, "Tab Type", "External URL");
    await page.locator('input[name="url"]').fill("https://example.org");
    await page.getByRole("button", { name: /Save Tab/i }).click();
    await findTabRow(page, name);
  }

  async function tabNames() {
    return page.getByRole("listitem").getByRole("heading", { level: 3 }).allTextContents();
  }

  test("moves the lower of two created tabs above the other and persists the order", async () => {
    await openMobileSettings(page);
    await createUrlTab(TAB_A);
    await createUrlTab(TAB_B);
    // Derive which tab is lower since sort isn't deterministic.
    const before = await tabNames();
    const lower = before.indexOf(TAB_A) > before.indexOf(TAB_B) ? TAB_A : TAB_B;
    const upper = lower === TAB_A ? TAB_B : TAB_A;

    // Move Up only guarantees one adjacent swap; repeat until above.
    for (let i = 0; i < 6; i++) {
      const names = await tabNames();
      if (names.indexOf(lower) < names.indexOf(upper)) break;
      const row = await findTabRow(page, lower);
      const moveUp = row.getByRole("button", { name: "Move Up" });
      // Concurrent delete may disable Move Up; the order is settled if so.
      if (await moveUp.isDisabled().catch(() => true)) continue;
      const saved = page.waitForResponse(r => r.url().includes("/links") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 }).catch((): null => null);
      await moveUp.click({ timeout: 5000 }).catch(() => { });
      await saved;
    }
    await expect.poll(async () => {
      const names = await tabNames();
      return names.indexOf(lower) !== -1 && names.indexOf(lower) < names.indexOf(upper);
    }, { timeout: 10000 }).toBe(true);

    // The new order survives a reload (sort persisted via POST /links).
    await page.reload();
    await findTabRow(page, lower);
    const after = await tabNames();
    expect(after.indexOf(lower)).toBeLessThan(after.indexOf(upper));
  });

  test("deletes the ordering tabs", async () => {
    await openMobileSettings(page);
    for (const name of [TAB_A, TAB_B]) {
      const row = await findTabRow(page, name);
      await row.getByRole("button", { name: "Edit" }).click();
      await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: /Delete Tab/i }).click();
      await confirmDelete(page);
      await expect(page.getByRole("heading", { level: 3, name, exact: true })).toHaveCount(0, { timeout: 15000 });
    }
  });
});

// ChurchAppsSupport#1459: a Folder tab holds other tabs. Children list indented under their
// folder, reorder among themselves, and return to the top level when the folder is deleted.
test.describe.serial("Mobile tab folders", () => {
  test.describe.configure({ retries: 0 });
  let page: Page;
  const FOLDER = "Zacchaeus Portal";
  const CHILD_A = "Zacchaeus Portal Groups";
  const CHILD_B = "Zacchaeus Portal Directory";
  // A second folder keeps the Parent tab select on screen after FOLDER is deleted.
  const SPARE = "Zacchaeus Spare Folder";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  async function saveTab() {
    const saved = page.waitForResponse(r => r.url().includes("/links") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.getByRole("button", { name: /Save Tab/i }).click();
    await saved;
  }

  async function createChild(name: string, type: string) {
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(name);
    await selectMuiByLabel(page, "Tab Type", type);
    await selectMuiByLabel(page, "Parent tab", FOLDER);
    await saveTab();
    await findTabRow(page, name);
  }

  async function tabNames() {
    return page.getByRole("listitem").getByRole("heading", { level: 3 }).allTextContents();
  }

  test("creates a Folder tab with no URL or parent of its own", async () => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(FOLDER);
    await selectMuiByLabel(page, "Tab Type", "Folder");
    await expect(page.locator('input[name="url"]')).toHaveCount(0);
    await expect(page.getByLabel("Parent tab", { exact: true })).toHaveCount(0);
    await saveTab();
    const row = await findTabRow(page, FOLDER);
    await expect(row).toContainText("Folder · 0 tabs");
  });

  test("puts two tabs inside the folder, listed indented right under it", async () => {
    await openMobileSettings(page);
    await createChild(CHILD_A, "My Groups");
    await createChild(CHILD_B, "Member Directory");
    await expect(await findTabRow(page, FOLDER)).toContainText("Folder · 2 tabs");
    for (const name of [CHILD_A, CHILD_B]) await expect((await findTabRow(page, name)).locator("[data-nested]").first()).toHaveAttribute("data-nested", "true");
    const names = await tabNames();
    const folderAt = names.indexOf(FOLDER);
    expect([names[folderAt + 1], names[folderAt + 2]].sort()).toEqual([CHILD_A, CHILD_B].sort());
  });

  test("reorders tabs within the folder", async () => {
    await openMobileSettings(page);
    await findTabRow(page, CHILD_A);
    const before = await tabNames();
    const lower = before.indexOf(CHILD_A) > before.indexOf(CHILD_B) ? CHILD_A : CHILD_B;
    const upper = lower === CHILD_A ? CHILD_B : CHILD_A;
    const lowerRow = await findTabRow(page, lower);
    // The last child cannot move down past its folder's end.
    await expect(lowerRow.getByRole("button", { name: "Move Down" })).toBeDisabled();
    const saved = page.waitForResponse(r => r.url().includes("/links") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await lowerRow.getByRole("button", { name: "Move Up" }).click();
    await saved;
    await page.reload();
    await findTabRow(page, lower);
    const after = await tabNames();
    expect(after.indexOf(lower)).toBe(after.indexOf(FOLDER) + 1);
    expect(after.indexOf(upper)).toBe(after.indexOf(FOLDER) + 2);
  });

  test("editing a child shows its folder as the parent", async () => {
    await openMobileSettings(page);
    await (await findTabRow(page, CHILD_A)).getByRole("button", { name: "Edit" }).click();
    await expect(page.getByLabel("Parent tab", { exact: true })).toHaveText(FOLDER, { timeout: 10000 });
    await page.getByRole("button", { name: /^Cancel$/ }).click();
  });

  test("deleting the folder moves its tabs back to the top level", async () => {
    await openMobileSettings(page);
    await openAddTabDrawer(page);
    await page.locator('input[name="text"]').fill(SPARE);
    await selectMuiByLabel(page, "Tab Type", "Folder");
    await saveTab();
    await findTabRow(page, SPARE);
    // Fail the editor's own tab list load so the delete cannot lean on it.
    await page.route(url => url.pathname.endsWith("/links") && url.searchParams.get("category") === "b1Tab", route => route.abort(), { times: 1 });
    await (await findTabRow(page, FOLDER)).getByRole("button", { name: "Edit" }).click();
    await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: /Delete Tab/i }).click();
    await confirmDelete(page);
    // The editor closes only after the delete and the release of its tabs have finished.
    await expect(page.locator('input[name="text"]')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByRole("heading", { level: 3, name: FOLDER, exact: true })).toHaveCount(0, { timeout: 15000 });
    await page.reload();
    for (const name of [CHILD_A, CHILD_B]) {
      const row = await findTabRow(page, name);
      await expect(row.locator("[data-nested]").first()).toHaveAttribute("data-nested", "false");
      await row.getByRole("button", { name: "Edit" }).click();
      await expect(page.getByLabel("Parent tab", { exact: true })).toHaveText("None (top level)", { timeout: 10000 });
      await page.getByRole("button", { name: /^Cancel$/ }).click();
    }
  });

  test("deletes the former folder tabs", async () => {
    await openMobileSettings(page);
    for (const name of [CHILD_A, CHILD_B, SPARE]) {
      await (await findTabRow(page, name)).getByRole("button", { name: "Edit" }).click();
      await page.locator('input[name="text"]').waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: /Delete Tab/i }).click();
      await confirmDelete(page);
      await expect(page.getByRole("heading", { level: 3, name, exact: true })).toHaveCount(0, { timeout: 15000 });
    }
  });
});

// Every save below posts the whole B1 Mobile form, so these run one at a time or one
// worker's save would overwrite another's setting.
// ChurchAppsSupport#1373: the Save buttons under Mobile confirm with a "Saved" message.
test.describe("Mobile saves confirm", () => {
  async function expectSaved(page: Page, save: import("@playwright/test").Locator) {
    await expect(save).toBeEnabled({ timeout: 15000 });
    const saved = page.waitForResponse((r) => r.url().includes("/settings") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await save.click();
    await saved;
    await expect(page.locator(".MuiSnackbar-root").getByText("Saved", { exact: true })).toBeVisible({ timeout: 10000 });
  }

  test("B1 Mobile Save shows Saved", async ({ page }) => {
    await page.goto("/mobile/b1-mobile");
    await expectSaved(page, page.getByRole("button", { name: /^Save$/ }));
  });

  test("QR Guest Registration Save shows Saved", async ({ page }) => {
    await page.goto("/mobile/checkin");
    await expectSaved(page, page.getByTestId("qr-guest-registration-save"));
  });

  test("App Theme Save shows Saved", async ({ page }) => {
    await page.goto("/mobile/theme");
    await expectSaved(page, page.getByRole("button", { name: /^Save$/ }));
  });
});

// ChurchAppsSupport#1437: each App Theme color takes a typed hex value beside its swatch.
test.describe("App Theme hex entry", () => {
  test("typing a hex updates the swatch and a partial value snaps back", async ({ page }) => {
    await page.goto("/mobile/theme");
    const hex = page.getByTestId("app-theme-hex-light-primary");
    await expect(hex).toBeVisible({ timeout: 15000 });
    const swatch = page.locator('input[type="color"]').nth(2);
    await hex.fill("#123456");
    await expect(swatch).toHaveValue("#123456");
    await hex.fill("#12");
    await expect(swatch).toHaveValue("#123456");
    await hex.blur();
    await expect(hex).toHaveValue("#123456");
  });
});

test.describe("B1 Mobile page saves", () => {
  test.describe.configure({ mode: "serial" });

  // ChurchAppsSupport#1058: the church-wide contact visibility defaults on the B1 Mobile page gain
  // two stricter levels, "My Group Leaders and Staff" and "Staff Only", below "Groups Only".
  test.describe("B1 Mobile contact visibility levels", () => {
    const VISIBILITY_FIELDS = ["Address", "Phone Number", "Email"];

    async function openB1MobileSettings(page: Page) {
      await page.goto("/mobile/b1-mobile");
      await page.getByLabel("Address", { exact: true }).first().waitFor({ state: "visible", timeout: 15000 });
    }

    // With nothing saved the Api uses "members" for each field; the boxes used to show blank.
    test("contact visibility defaults show Members when none has been saved", async ({ page }) => {
      await openB1MobileSettings(page);
      for (const label of VISIBILITY_FIELDS) {
        await expect(page.getByLabel(label, { exact: true }).first()).toHaveText("Members", { timeout: 15000 });
      }
    });

    test("address, phone and email defaults offer My Group Leaders and Staff and Staff Only", async ({ page }) => {
      await openB1MobileSettings(page);
      for (const label of VISIBILITY_FIELDS) {
        await page.getByLabel(label, { exact: true }).first().click();
        const listbox = page.locator('[role="listbox"]');
        await expect(listbox.locator('li[role="option"]', { hasText: /^Groups Only$/ })).toBeVisible({ timeout: 10000 });
        await expect(listbox.locator('li[role="option"]', { hasText: /^My Group Leaders and Staff$/ })).toBeVisible();
        await expect(listbox.locator('li[role="option"]', { hasText: /^Staff Only$/ })).toBeVisible();
        await page.keyboard.press("Escape");
        await listbox.waitFor({ state: "hidden", timeout: 5000 });
      }
    });

    test("saving Staff Only as the email default persists across a reload", async ({ page }) => {
      await openB1MobileSettings(page);
      await selectMuiByLabel(page, "Email", "Staff Only");
      await saveSettings(page);
      await page.reload();
      await expect(page.getByLabel("Email", { exact: true }).first()).toHaveText("Staff Only", { timeout: 15000 });

      // Put the effective default back so directory specs keep seeing member-visible emails.
      await selectMuiByLabel(page, "Email", "Members");
      await saveSettings(page);
      await page.reload();
      await expect(page.getByLabel("Email", { exact: true }).first()).toHaveText("Members", { timeout: 15000 });
    });
  });

  // The directory gate reads directoryVisibility from the public settings endpoint, so a row stored
  // with public = 0 must come back public after saving the B1 Mobile page.
  test.describe("Show in Directory saves as a public setting", () => {
    let ctx: APIRequestContext;
    let auth: { headers: { Authorization: string } };
    let original: any;

    test.beforeAll(async () => {
      ctx = await pwRequest.newContext();
      auth = { headers: { Authorization: "Bearer " + await apiLogin(ctx) } };
      const all = await (await ctx.get(`${API}/membership/settings`, auth)).json();
      original = (all as any[]).find(s => s.keyName === "directoryVisibility");
      const row = { ...(original || {}), churchId: CHURCH_ID, keyName: "directoryVisibility", value: "Members", public: 0 };
      const res = await ctx.post(`${API}/membership/settings`, { ...auth, data: [row] });
      expect(res.ok()).toBeTruthy();
    });

    test.afterAll(async () => {
      // Put the original tier back so directory specs keep their default.
      const current = ((await (await ctx.get(`${API}/membership/settings`, auth)).json()) as any[]).find(s => s.keyName === "directoryVisibility");
      if (current) await ctx.post(`${API}/membership/settings`, { ...auth, data: [{ ...current, value: original?.value ?? "Members", public: 1 }] });
      await ctx.dispose();
    });

    // ChurchAppsSupport#1316: the tiers read Admins Only through Visitors and Above; Guests are never an option.
    test("Show in Directory lists Admins Only through Visitors and Above, in order", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      await page.getByLabel("Show in Directory", { exact: true }).first().click();
      const options = page.locator('[role="listbox"] li[role="option"]');
      await expect(options).toHaveText(["Admins Only", "Members and Above", "Regular Attendees and Above", "Visitors and Above"], { timeout: 10000 });
      await page.keyboard.press("Escape");
    });

    test("saving Regular Attendees is visible to the public settings endpoint", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      await expect(page.getByLabel("Show in Directory", { exact: true }).first()).toContainText("Members and Above", { timeout: 15000 });
      await selectMuiByLabel(page, "Show in Directory", "Regular Attendees and Above");
      await saveSettings(page);

      const pub = await (await ctx.get(`${API}/membership/settings/public/${CHURCH_ID}`)).json();
      expect(pub.directoryVisibility).toBe("Regular Attendees");
    });
  });

  // Saving before the existing settings load would post every setting without its id and
  // create duplicate rows, so Save stays disabled until the settings GET completes.
  test.describe("B1 Mobile Save waits for settings load", () => {
    test("Save stays disabled until the existing settings have loaded", async ({ page }) => {
      let release: () => void = () => { };
      const held = new Promise<void>((resolve) => { release = resolve; });
      await page.route((url) => url.pathname.endsWith("/membership/settings"), async (route) => {
        if (route.request().method() !== "GET") return route.continue();
        await held;
        await route.continue();
      });

      await page.goto("/mobile/b1-mobile");
      const save = page.getByRole("button", { name: /^Save$/ });
      await expect(save).toBeVisible({ timeout: 15000 });
      await expect(save).toBeDisabled();

      const loaded = page.waitForResponse((r) => r.url().endsWith("/membership/settings") && r.request().method() === "GET");
      release();
      await loaded;
      await expect(save).toBeEnabled();
    });
  });

  // ChurchAppsSupport#1189: a church can hide the app's home-screen sign-in prompt or change its
  // wording. #1313: it can also pick how photo links appear on that screen. #1331: it can show the
  // Me tab's My Attendance and My Forms on that screen too. All save as public
  // Membership settings so the B1.church app can read them. Serial: each save posts the whole form.
  test.describe("B1 Mobile home screen settings", () => {
    test.describe.configure({ mode: "serial" });
    let ctx: APIRequestContext;
    let auth: { headers: { Authorization: string } };

    const publicSettings = async () => (await ctx.get(`${API}/membership/settings/public/${CHURCH_ID}`)).json();

    test.beforeAll(async () => {
      ctx = await pwRequest.newContext();
      auth = { headers: { Authorization: "Bearer " + await apiLogin(ctx) } };
    });

    test.afterAll(async () => {
      // Put the prompt and tiles back to the defaults so B1App dashboard specs see them.
      const defaults: Record<string, string> = { mobileHideSignInPrompt: "false", mobileSignInPromptText: "", mobileTileLayout: "grid", mobileHomeAttendance: "false", mobileHomeForms: "false", mobileHomeNews: "false", mobileHomeNewsCategory: "" };
      const all = (await (await ctx.get(`${API}/membership/settings`, auth)).json()) as any[];
      const rows = all.filter(s => s.keyName in defaults).map(s => ({ ...s, value: defaults[s.keyName] }));
      if (rows.length) await ctx.post(`${API}/membership/settings`, { ...auth, data: rows });
      await ctx.dispose();
    });

    test("custom prompt text saves as a public setting", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      const toggle = page.getByLabel("Show sign-in prompt on the app home screen");
      await expect(toggle).toBeChecked({ timeout: 15000 });
      const text = page.getByLabel("Sign-in prompt text");
      await expect(text).toHaveAttribute("placeholder", "Sign in to see your groups, giving, and more.");
      await text.fill("Sign in to get conference alerts");
      await saveSettings(page);

      const pub = await publicSettings();
      expect(pub.mobileSignInPromptText).toBe("Sign in to get conference alerts");
      expect(pub.mobileHideSignInPrompt).toBe("false");
    });

    test("turning the prompt off saves, disables the text field, and survives a reload", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      const toggle = page.getByLabel("Show sign-in prompt on the app home screen");
      await expect(toggle).toBeChecked({ timeout: 15000 });
      await toggle.uncheck();
      await expect(page.getByLabel("Sign-in prompt text")).toBeDisabled();
      await saveSettings(page);

      expect((await publicSettings()).mobileHideSignInPrompt).toBe("true");
      await page.reload();
      await expect(page.getByLabel("Show sign-in prompt on the app home screen")).not.toBeChecked({ timeout: 15000 });
      await expect(page.getByLabel("Sign-in prompt text")).toHaveValue("Sign in to get conference alerts");
    });

    test("home screen tiles default to Grid and List saves as a public setting that survives a reload", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      await expect(page.getByRole("heading", { name: "Home screen tiles" })).toBeVisible({ timeout: 15000 });
      const layout = page.getByRole("combobox", { name: "Layout" });
      await expect(layout).toHaveText("Grid");
      await layout.click();
      await expect(page.getByRole("option", { name: "Scrolling row" })).toBeVisible();
      await page.getByRole("option", { name: "List", exact: true }).click();
      await saveSettings(page);

      const pub = await (await ctx.get(`${API}/membership/settings/public/${CHURCH_ID}`)).json();
      expect(pub.mobileTileLayout).toBe("list");
      await page.reload();
      await expect(page.getByRole("combobox", { name: "Layout" })).toHaveText("List", { timeout: 15000 });
    });

    test("home screen tiles can be set to an automatically scrolling row", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      const layout = page.getByRole("combobox", { name: "Layout" });
      await expect(layout).toBeVisible({ timeout: 15000 });
      await layout.click();
      await page.getByRole("option", { name: "Scrolling (automatic)", exact: true }).click();
      await saveSettings(page);

      expect((await publicSettings()).mobileTileLayout).toBe("autoscroll");
      await page.reload();
      await expect(page.getByRole("combobox", { name: "Layout" })).toHaveText("Scrolling (automatic)", { timeout: 15000 });
    });

    // ChurchAppsSupport#1494: two combined layouts feature the first three photo links and list the rest beneath.
    test("home screen tiles offer Grid and list and Scrolling (automatic) and list", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      const layout = page.getByRole("combobox", { name: "Layout" });
      await expect(layout).toBeVisible({ timeout: 15000 });
      await layout.click();
      await expect(page.getByRole("option", { name: "Scrolling (automatic) and list", exact: true })).toBeVisible();
      await page.getByRole("option", { name: "Grid and list", exact: true }).click();
      await saveSettings(page);
      expect((await publicSettings()).mobileTileLayout).toBe("gridlist");
      await page.reload();
      await expect(page.getByRole("combobox", { name: "Layout" })).toHaveText("Grid and list", { timeout: 15000 });

      await page.getByRole("combobox", { name: "Layout" }).click();
      await page.getByRole("option", { name: "Scrolling (automatic) and list", exact: true }).click();
      await saveSettings(page);
      expect((await publicSettings()).mobileTileLayout).toBe("autoscrolllist");
      await page.reload();
      await expect(page.getByRole("combobox", { name: "Layout" })).toHaveText("Scrolling (automatic) and list", { timeout: 15000 });
    });

    test("My Attendance and My Forms on Home start off and save as public settings that survive a reload", async ({ page }) => {
      await page.goto("/mobile/b1-mobile");
      await expect(page.getByRole("heading", { name: "Home screen sections" })).toBeVisible({ timeout: 15000 });
      const attendance = page.getByLabel("Show My Attendance on Home");
      const forms = page.getByLabel("Show My Forms on Home");
      await expect(attendance).not.toBeChecked();
      await expect(forms).not.toBeChecked();
      await attendance.check();
      await forms.check();
      await saveSettings(page);

      const pub = await publicSettings();
      expect(pub.mobileHomeAttendance).toBe("true");
      expect(pub.mobileHomeForms).toBe("true");
      await page.reload();
      await expect(page.getByLabel("Show My Attendance on Home")).toBeChecked({ timeout: 15000 });
      await expect(page.getByLabel("Show My Forms on Home")).toBeChecked();
    });

    // ChurchAppsSupport#1470: the app Home can show the latest blog posts as a News strip, optionally from one category.
    test("News on Home starts off and saves with one blog category as public settings", async ({ page }) => {
      const posts = await (await ctx.post(`${API}/content/posts`, {
        ...auth,
        data: [{ title: "Zacchaeus Picnic Sign-ups", slug: `zacchaeus-picnic-${Date.now().toString(36)}`, category: "Announcements", content: "Bring a dish.", publishDate: new Date(Date.now() - 86400000).toISOString() }]
      })).json();
      try {
        await page.goto("/mobile/b1-mobile");
        await expect(page.getByRole("heading", { name: "Home screen sections" })).toBeVisible({ timeout: 15000 });
        const news = page.getByLabel("Show News on Home");
        await expect(news).not.toBeChecked();
        await expect(page.getByRole("combobox", { name: "Only this category" })).toHaveCount(0);
        await news.check();
        const category = page.getByRole("combobox", { name: "Only this category" });
        await expect(category).toHaveText("All posts");
        await category.click();
        await page.getByRole("option", { name: "Announcements", exact: true }).click();
        await saveSettings(page);

        const pub = await publicSettings();
        expect(pub.mobileHomeNews).toBe("true");
        expect(pub.mobileHomeNewsCategory).toBe("Announcements");
        await page.reload();
        await expect(page.getByLabel("Show News on Home")).toBeChecked({ timeout: 15000 });
        await expect(page.getByRole("combobox", { name: "Only this category" })).toHaveText("Announcements");
      } finally {
        if (posts?.[0]?.id) await ctx.delete(`${API}/content/posts/${posts[0].id}`, auth);
      }
    });
  });
});

// Scheduled push notifications (ChurchAppsSupport#1411): a send time on the Notify dialog and a
// Push Notifications page under Mobile to see, edit, send now or cancel what is queued.
test.describe.serial("Scheduled push notifications", () => {
  // Cancelled rows stay in the history, so each run gets its own titles.
  const RUN = Date.now().toString(36);
  const TITLE = `Zacchaeus Main Session ${RUN}`;
  const EDITED = `Zacchaeus Main Session Moved ${RUN}`;
  const GROUP_TITLE = `Zacchaeus Prayer Reminder ${RUN}`;
  const GROUP_ID = "GRP00000003"; // Wednesday Prayer Service
  let page: Page;
  let ctx: APIRequestContext;
  let auth: { headers: Record<string, string> };

  // The picker's sections take digits in order: MM DD YYYY hh mm, then A/P for the meridiem.
  const setSendAt = async (digits: string) => {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("spinbutton", { name: "Month" }).click();
    await page.keyboard.type(digits);
  };

  const loadScheduled = async () => (await (await ctx.get(`${API}/messaging/scheduledNotifications`, auth)).json()) as any[];

  test.beforeAll(async ({ browser }) => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: `Bearer ${await apiLogin(ctx)}` } };
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    const rows = await loadScheduled().catch(() => [] as any[]);
    for (const r of rows.filter((r: any) => r.status === "pending" && String(r.title).startsWith("Zacchaeus"))) {
      await ctx.delete(`${API}/messaging/scheduledNotifications/${r.id}`, auth);
    }
    await page?.context().close();
    await ctx?.dispose();
  });

  test("the Mobile menu links to a Push Notifications page", async () => {
    // Wait out the /mobile -> /mobile/navigation redirect first; it re-renders the header and closes the jump menu.
    await openMobileSettings(page);
    await (await siblingNav(page)).getByText("Push Notifications", { exact: true }).first().click();
    await page.waitForURL(/\/mobile\/notifications/, { timeout: 15000 });
    await expect(page.locator("#page-header-title")).toHaveText("Push Notifications");
    await expect(page.getByRole("heading", { name: "Scheduled" })).toBeVisible();
  });

  test("schedules a notification for everyone with the app", async () => {
    await page.goto("/mobile/notifications");
    await page.getByRole("button", { name: "Send Notification" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByTestId("push-audience-select")).toContainText("Everyone with the app");
    await dialog.getByRole("radio", { name: "Schedule for later" }).check();
    await setSendAt("122520270915A");
    await expect(dialog.getByText(/Times are in /)).toBeVisible();
    await dialog.getByLabel("Title").fill(TITLE);
    await dialog.getByLabel("Message").fill("Starts in 15 minutes in the main hall.");
    const saved = page.waitForResponse((r) => r.url().includes("/scheduledNotifications") && r.request().method() === "POST");
    await dialog.getByRole("button", { name: "Schedule Notification" }).click();
    expect((await saved).ok()).toBeTruthy();
    await expect(dialog.getByText(/is scheduled for/)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();

    const row = page.getByTestId("scheduled-table").getByRole("row").filter({ hasText: TITLE });
    await expect(row).toContainText("Everyone with the app");
    await expect(row).toContainText("Dec 25, 2027");
    await expect(row).toContainText("9:15 AM");

    const stored = (await loadScheduled()).find((r: any) => r.title === TITLE && r.status === "pending");
    expect(stored?.status).toBe("pending");
    expect(stored?.audience).toBe("church");
    expect(new Date(stored.sendAt).getTime()).toBe(new Date(2027, 11, 25, 9, 15).getTime());
  });

  test("edits the scheduled notification before it goes out", async () => {
    await page.goto("/mobile/notifications");
    const row = page.getByTestId("scheduled-table").getByRole("row").filter({ hasText: TITLE });
    await row.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Title")).toHaveValue(TITLE);
    await dialog.getByLabel("Title").fill(EDITED);
    await dialog.getByRole("button", { name: "Save Changes" }).click();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("scheduled-table").getByRole("row").filter({ hasText: EDITED })).toBeVisible();
    // Editing updates the queued row rather than adding a second one.
    expect((await loadScheduled()).filter((r: any) => r.status === "pending" && (r.title === TITLE || r.title === EDITED))).toHaveLength(1);
  });

  test("cancels it, which moves it to Recent", async () => {
    await page.goto("/mobile/notifications");
    const row = page.getByTestId("scheduled-table").getByRole("row").filter({ hasText: EDITED });
    await row.getByRole("button", { name: "Cancel" }).click();
    await confirmDelete(page);
    await expect(page.getByTestId("recent-table").getByRole("row").filter({ hasText: EDITED })).toContainText("Cancelled");
    await expect(page.getByTestId("scheduled-table").getByRole("row").filter({ hasText: EDITED })).toHaveCount(0);
  });

  // ChurchAppsSupport#1456: a finished notification can be removed from Recent.
  test("removes the cancelled notification from Recent", async () => {
    await page.goto("/mobile/notifications");
    const row = page.getByTestId("recent-table").getByRole("row").filter({ hasText: EDITED });
    await row.getByTestId("remove-notification").click();
    await expect(page.getByRole("dialog")).toContainText("Remove this notification from the list?");
    const removed = page.waitForResponse(r => r.url().includes("/messaging/scheduledNotifications/") && r.request().method() === "DELETE");
    await confirmDelete(page);
    expect((await removed).ok()).toBeTruthy();
    await expect(page.getByTestId("recent-table").getByRole("row").filter({ hasText: EDITED })).toHaveCount(0);
    expect((await loadScheduled()).some((r: any) => r.title === EDITED)).toBe(false);
  });

  test("the group Notify dialog can schedule for later", async () => {
    await page.goto(`/groups/${GROUP_ID}`);
    await page.getByTestId("notify-group-button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("radio", { name: "Send now" })).toBeChecked();
    await dialog.getByRole("radio", { name: "Schedule for later" }).check();
    await setSendAt("122620270700P");
    await dialog.getByLabel("Title").fill(GROUP_TITLE);
    await dialog.getByLabel("Message").fill("Prayer starts at 7.");
    await dialog.getByRole("button", { name: "Schedule Notification" }).click();
    await expect(dialog.getByText(/is scheduled for/)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();

    await page.goto("/mobile/notifications");
    const row = page.getByTestId("scheduled-table").getByRole("row").filter({ hasText: GROUP_TITLE });
    await expect(row).toContainText("Wednesday Prayer Service");
    await expect(row).toContainText("7:00 PM");
  });

  test("Clear all empties the Recent list", async () => {
    const queued = (await loadScheduled()).find((r: any) => r.title === GROUP_TITLE && r.status === "pending");
    expect((await ctx.delete(`${API}/messaging/scheduledNotifications/${queued.id}`, auth)).ok()).toBeTruthy();
    await page.goto("/mobile/notifications");
    await expect(page.getByTestId("recent-table").getByRole("row").filter({ hasText: GROUP_TITLE })).toContainText("Cancelled");
    await page.getByTestId("clear-recent").click();
    await expect(page.getByRole("dialog")).toContainText("Remove all sent, failed and cancelled notifications");
    await confirmDelete(page);
    await expect(page.getByTestId("recent-table")).toContainText("No notifications have gone out yet.");
    await expect(page.getByTestId("clear-recent")).toHaveCount(0);
    expect((await loadScheduled()).filter((r: any) => !["pending", "processing"].includes(r.status))).toHaveLength(0);
  });
});
