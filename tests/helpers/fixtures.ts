import type { Page } from "@playwright/test";
import { navigateToPeople } from "./navigation";

// Named seed people known to exist in the reset demo database (see
// Api/tools/dbScripts/membership/demo.sql). Tests should prefer
// these over "first row" lookups, which are order-dependent.
export const SEED_PEOPLE = {
  DONALD: "Donald Clark",
  CAROL: "Carol Clark",
  DOROTHY: "Dorothy Jackson",
  JENNIFER: "Jennifer Williams",
  PATRICIA: "Patricia Moore",
  ROBERT: "Robert Moore",
  DEMO: "Demo User",
} as const;

export type SeedPersonName = (typeof SEED_PEOPLE)[keyof typeof SEED_PEOPLE];

// Navigate to People and open a known seed person's detail page.
// Replaces the brittle `page.locator('table tbody tr').first()` pattern
// that depends on default sort + prior test mutations.
export async function openKnownPerson(page: Page, name: SeedPersonName) {
  await navigateToPeople(page);
  const row = page.locator("table tbody tr").filter({ hasText: name }).first();
  await row.waitFor({ state: "visible", timeout: 10000 });
  await row.click();
  await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
}

// Same as openKnownPerson but assumes you're already on /people — just
// finds the row and clicks it.
export async function openPersonRow(page: Page, name: SeedPersonName | string) {
  const row = page.locator("table tbody tr").filter({ hasText: name }).first();
  await row.waitFor({ state: "visible", timeout: 10000 });
  await row.click();
  await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
}

// MUI icon-only button helpers. Matches buttons whose icon SVG carries the
// canonical MUI `data-testid` (auto-injected by `@mui/icons-material`). Does
// NOT broaden to text-labeled buttons (e.g. "Edit Settings"), which would
// change `.nth()` indexing in callers.

export function editIconButton(page: Page) {
  return page.locator('button:has(svg[data-testid="EditIcon"])');
}

export function closeIconButton(page: Page) {
  return page.locator('button:has(svg[data-testid="CloseIcon"])');
}

export function addIconButton(page: Page) {
  return page.locator('button:has(svg[data-testid="AddIcon"])');
}

export function checkIconButton(page: Page) {
  return page.locator('button:has(svg[data-testid="CheckIcon"])');
}

export function trashIconButton(page: Page) {
  return page.locator('button:has(svg[data-testid="DeleteIcon"])');
}

// Recover from Vite's stale-chunk error boundary: when an HMR update or
// route transition can't fetch a previously-cached chunk, the app renders
// "Failed to fetch dynamically imported module" with a Retry button.
// Click Retry first (forces the app's own retry path); fall back to a hard
// reload, which re-fetches the chunk manifest. Loop up to 4 times.
export async function recoverFromViteError(page: import("@playwright/test").Page, successLocator?: import("@playwright/test").Locator) {
  const viteError = page.locator('text=Failed to fetch dynamically imported module');
  const retryBtn = page.getByRole('button', { name: 'Retry' });
  for (let i = 0; i < 4; i++) {
    if (successLocator) {
      const result = await Promise.race([
        viteError.waitFor({ state: "visible", timeout: 8000 }).then(() => "error" as const).catch(() => null),
        successLocator.waitFor({ state: "visible", timeout: 8000 }).then(() => "success" as const).catch(() => null),
      ]);
      if (result === "success") return;
      if (result !== "error") return;
    } else {
      if (!(await viteError.isVisible({ timeout: 500 }).catch(() => false))) return;
    }
    // Try the in-app Retry button first; if that fails twice, hard-reload.
    if (i < 2 && (await retryBtn.isVisible({ timeout: 200 }).catch(() => false))) {
      await retryBtn.click().catch(() => { });
    } else {
      await page.reload();
    }
    await page.waitForLoadState("domcontentloaded").catch(() => { });
  }
}

// SendInviteDialog appears whenever a person with an email is added to a
// group, team, or role. Most demo people have emails, so any add-person flow
// must dismiss this dialog before the test continues. The dialog is opened by
// the API response (POST /groupMembers etc.), which can take >2s on a cold
// dev server — wait the full timeout before giving up. Loop in case the
// dialog reappears (some flows re-trigger it on subsequent renders).
export async function dismissSendInviteIfPresent(page: Page, timeout = 8000) {
  const dialog = page.locator('div[role="dialog"]:has-text("Send Invite Email")');
  if (!(await dialog.isVisible({ timeout }).catch(() => false))) return;
  for (let i = 0; i < 3; i++) {
    if (!(await dialog.isVisible({ timeout: 100 }).catch(() => false))) return;
    const noThanks = dialog.locator('button:has-text("No Thanks")');
    await noThanks.click({ force: true }).catch(() => { });
    await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
  }
}
