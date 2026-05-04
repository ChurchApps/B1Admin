import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Cross-user realtime test for person notes — the exact manual scenario the
 * project owner reported as broken: two staff each viewing the same person's
 * Notes tab; one posts a note; the other should see it instantly.
 *
 * Both demo@b1.church and tester@b1.church are Domain Admins in Grace Community
 * Church (per the membership demo seed), so both can open /people/PER00000081
 * (Carol Clark) and reach the Notes tab.
 */

const TARGET_PERSON_ID = "PER00000081"; // Carol Clark — neutral target neither tester is
const API_BASE = "http://localhost:8084";

async function signIn(page: Page, email: string) {
  // Use the same login helper the rest of the suite uses. It accepts any seeded
  // user as long as the auth form is on the default email/password mode.
  // We override the cached storageState in the calling test by passing a fresh
  // context with `storageState: undefined`.
  await page.goto("/", { timeout: 60000 });

  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 30000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  // SelectChurchModal appears for users with no lastChurchId cookie
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {}),
  ]);

  if (await churchDialog.isVisible().catch(() => false)) {
    const grace = page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first();
    await grace.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }

  await page.locator("#primaryNavButton").waitFor({ state: "visible", timeout: 30000 });
}

async function openPersonNotes(page: Page) {
  await page.goto(`/people/${TARGET_PERSON_ID}`, { timeout: 60000 });
  const notesTab = page.getByRole("tab", { name: /Notes/i });
  await notesTab.waitFor({ state: "visible", timeout: 30000 });
  await notesTab.click();
  const notesBox = page.locator('[data-testid="notes-box"]');
  await notesBox.waitFor({ state: "visible", timeout: 30000 });
  return notesBox;
}

async function postNote(page: Page, content: string) {
  const notesBox = page.locator('[data-testid="notes-box"]');
  const composer = notesBox.locator('textarea[name="noteText"]').first();
  await composer.waitFor({ state: "visible", timeout: 15000 });
  await composer.fill(content);
  // Send is the IconButton wrapping <Icon>send</Icon> (MUI font icon, not SVG).
  const sendButton = notesBox.locator("button").filter({ has: page.locator('text="send"') }).last();
  await sendButton.click();
}

/**
 * Block until the server-side connections table reports at least `expected`
 * sockets joined to (churchId, conversationId). Used to remove the timing race
 * between "Notes mounted" and "POST /connections completed".
 */
async function waitForRoomJoinCount(page: Page, churchId: string, conversationId: string, expected: number) {
  const apiBase = "http://localhost:8084";
  await page.waitForFunction(
    async ([base, ch, cv, want]) => {
      try {
        const res = await fetch(`${base}/messaging/connections/${ch}/${cv}`);
        if (!res.ok) return false;
        const list = await res.json();
        return Array.isArray(list) && list.length >= (want as number);
      } catch { return false; }
    },
    [apiBase, churchId, conversationId, expected],
    { timeout: 20000, polling: 250 }
  );
}

test.describe("Realtime — cross-user person notes", () => {
  test.describe.configure({ mode: "serial" });

  let demoContext: BrowserContext;
  let testerContext: BrowserContext;
  let demoPage: Page;
  let testerPage: Page;

  test.beforeAll(async ({ browser }) => {
    // No pre-seed — both tabs land on a person with no prior conversation. The first
    // post creates the conversation; the server's `conversationActivity` broadcast
    // (sent to a content-scoped room that PersonPage subscribes to) tells the second
    // tab to refetch the person, picking up the new conversationId.
    demoContext = await browser.newContext({ storageState: undefined });
    testerContext = await browser.newContext({ storageState: undefined });
    demoPage = await demoContext.newPage();
    testerPage = await testerContext.newPage();

    await Promise.all([
      signIn(demoPage, "demo@b1.church"),
      signIn(testerPage, "tester@b1.church"),
    ]);

    await Promise.all([
      openPersonNotes(demoPage),
      openPersonNotes(testerPage),
    ]);

    // Both tabs need a moment to open their socket and join the content-scoped room.
    await demoPage.waitForTimeout(1500);
    await testerPage.waitForTimeout(1500);
  });

  test.afterAll(async () => {
    await demoContext?.close();
    await testerContext?.close();
  });

  test("demo's note appears on tester's open tab without reload", async () => {
    const stamp = `note-from-demo-${Date.now()}`;
    await postNote(demoPage, stamp);

    await expect(testerPage.locator('[data-testid="notes-box"]')).toContainText(stamp, { timeout: 15000 });
    await expect(demoPage.locator('[data-testid="notes-box"]')).toContainText(stamp, { timeout: 15000 });
  });

  test("tester's reply appears on demo's open tab without reload", async () => {
    const stamp = `note-from-tester-${Date.now()}`;
    await postNote(testerPage, stamp);

    await expect(demoPage.locator('[data-testid="notes-box"]')).toContainText(stamp, { timeout: 15000 });
    await expect(testerPage.locator('[data-testid="notes-box"]')).toContainText(stamp, { timeout: 15000 });
  });
});
