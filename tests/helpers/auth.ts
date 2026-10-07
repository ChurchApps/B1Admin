import type { Page } from "@playwright/test";

// Hide chat widget (it covers bottom-right corner and intercepts clicks); addInitScript persists across navigation.
const HIDE_CHAT_CSS = `
  div[aria-label="Open SuperBee chat"],
  div[aria-label="Open Bez chat"],
  div[aria-label="Open Doc chat"] { display: none !important; }
`;

async function hideChatWidgets(page: Page) {
  await page.addInitScript((css) => {
    const inject = () => {
      if (document.head && !document.getElementById("__test-hide-chat__")) {
        const style = document.createElement("style");
        style.id = "__test-hide-chat__";
        style.textContent = css;
        document.head.appendChild(style);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inject);
    } else {
      inject();
    }
  }, HIDE_CHAT_CSS);
}

export async function login(page: Page) {
  await hideChatWidgets(page);
  await page.goto("/");

  const emailInput = page.locator('input[type="email"]');
  const navButton = page.getByTestId("command-palette-open");

  // Race dashboard nav vs login form to detect cached vs fresh session.
  const winner = await Promise.race([
    navButton.waitFor({ state: "visible", timeout: 15000 }).then(() => "authenticated" as const).catch((): null => null),
    emailInput.waitFor({ state: "visible", timeout: 15000 }).then(() => "login" as const).catch((): null => null)
  ]);

  if (winner === "authenticated") return;
  if (winner === null) throw new Error("Neither login form nor authenticated nav appeared within 15s");

  await emailInput.fill("demo@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  // SelectChurchModal appears on fresh session; wait for dialog or nav away from /login.
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => { }),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => { })
  ]);

  const dialogVisible = await churchDialog.isVisible().catch(() => false);
  if (dialogVisible) {
    const graceChurch = page
      .locator('[role="dialog"] h3:has-text("Grace Community Church")')
      .first()
      .or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }

  await page.getByTestId("command-palette-open").waitFor({ state: "visible", timeout: 30000 });
}
