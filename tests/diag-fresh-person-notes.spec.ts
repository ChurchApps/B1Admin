import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Diagnostic — reproduces the manual case the project owner reported:
 *   open /people/PER00000081 fresh (no pre-seeded conversation),
 *   log in as demo, click Notes, post a note,
 *   verify the note appears in this same tab.
 *
 * Captures all browser console output + network calls to /messaging/* so we can
 * see exactly what happens between createConversation and the broadcast/refetch.
 */

const TARGET_PERSON_ID = "PER00000081";

test("fresh person notes — same-tab post should appear", async ({ page }) => {
  page.on("console", (m) => console.log(`[browser:${m.type()}]`, m.text()));
  page.on("pageerror", (e) => console.log("[pageerr]", e.message));
  page.on("request", (r) => {
    const u = r.url();
    if (u.includes("/messaging/") || u.includes("/people")) console.log(`[net req] ${r.method()} ${u}`);
  });
  page.on("response", async (r) => {
    const u = r.url();
    if (u.includes("/messaging/messages") || u.includes("/messaging/conversations") || u.includes("/people") && r.request().method() !== "GET") {
      let body = "";
      try { body = (await r.text()).slice(0, 200); } catch {}
      console.log(`[net res] ${r.status()} ${r.request().method()} ${u} :: ${body}`);
    }
  });

  await login(page);
  await page.goto(`/people/${TARGET_PERSON_ID}`);

  const notesTab = page.getByRole("tab", { name: /Notes/i });
  await notesTab.waitFor({ state: "visible", timeout: 30000 });
  await notesTab.click();

  const notesBox = page.locator('[data-testid="notes-box"]');
  await notesBox.waitFor({ state: "visible", timeout: 30000 });

  const stamp = `diag-fresh-${Date.now()}`;
  const composer = notesBox.locator('textarea[name="noteText"]').first();
  await composer.waitFor({ state: "visible", timeout: 15000 });
  await composer.fill(stamp);
  const sendButton = notesBox.locator("button").filter({ has: page.locator('text="send"') }).last();
  await sendButton.click();

  await expect(notesBox).toContainText(stamp, { timeout: 15000 });
});
