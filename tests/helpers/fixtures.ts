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
