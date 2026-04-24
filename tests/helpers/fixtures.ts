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

// MUI icon-only button helpers. Behavior-preserving factoring of the SVG-path
// selectors previously inlined in specs. Matches ONLY buttons whose SVG path
// matches the specific MUI icon — does NOT broaden to text-labeled buttons
// (e.g. "Edit Settings"), which would change `.nth()` indexing.
//
// If MUI changes an icon path, update the helper once rather than every spec.
//
// `data-testid` is added as a secondary match — MUI sets it on icon SVGs
// ("EditIcon", "CloseIcon", etc.), and it's restrictive enough not to match
// text-labeled buttons.

export function editIconButton(page: Page) {
  return page
    .locator('button:has(svg[data-testid="EditIcon"])')
    .or(page.locator('button:has(svg path[d*="M3 17.25"])'));
}

export function closeIconButton(page: Page) {
  return page
    .locator('button:has(svg[data-testid="CloseIcon"])')
    .or(
      page.locator(
        'button:has(svg path[d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"])'
      )
    );
}

export function addIconButton(page: Page) {
  return page
    .locator('button:has(svg[data-testid="AddIcon"])')
    .or(page.locator('button:has(svg path[d*="M19 13h-6"])'));
}

export function checkIconButton(page: Page) {
  return page
    .locator('button:has(svg[data-testid="CheckIcon"])')
    .or(page.locator('button:has(svg path[d*="M9 16.2"])'));
}

export function trashIconButton(page: Page) {
  return page
    .locator('button:has(svg[data-testid="DeleteIcon"])')
    .or(page.locator('button:has(svg path[d*="M6 19c0"])'));
}
