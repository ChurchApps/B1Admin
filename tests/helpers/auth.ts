import type { Page } from "@playwright/test";

// Hide the fixed-position SuperBee chat widget (and any other configured chat
// widget) before the page renders. The bee covers the bottom-right corner and
// intercepts clicks on the last row's Edit/Archive buttons in short lists
// (forms, settings, etc.). addInitScript runs on every navigation, so the
// rule survives client-side route changes.
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
  const navButton = page.locator("#primaryNavButton");

  // Race the two terminal states. With cached storageState the dashboard
  // renders the nav button in <1s; without it the login form's email input
  // renders in <1s. Whichever appears first tells us what to do — far faster
  // than waiting out a fixed timeout on one of them.
  const winner = await Promise.race([
    navButton.waitFor({ state: "visible", timeout: 15000 }).then(() => "authenticated" as const).catch(() => null),
    emailInput.waitFor({ state: "visible", timeout: 15000 }).then(() => "login" as const).catch(() => null),
  ]);

  if (winner === "authenticated") return;
  if (winner === null) throw new Error("Neither login form nor authenticated nav appeared within 15s");

  // Full login flow
  await emailInput.fill("demo@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  // After submit, the login form stays mounted while the church selection dialog is shown.
  // SelectChurchModal always appears on a fresh session (no lastChurchId cookie).
  // Wait for either: church selection dialog OR navigation away from /login.
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => { }),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => { }),
  ]);

  // Handle church selection dialog if present
  const dialogVisible = await churchDialog.isVisible().catch(() => false);
  if (dialogVisible) {
    const graceChurch = page
      .locator('[role="dialog"] h3:has-text("Grace Community Church")')
      .first()
      .or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }

  // After login, wait for nav to be ready before returning
  await page.locator("#primaryNavButton").waitFor({ state: "visible", timeout: 30000 });
}
