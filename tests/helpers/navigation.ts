import type { Page } from "@playwright/test";

// Primary nav items: rendered in the top-level drawer opened via #primaryNavButton.
// Each maps to a data-testid=nav-item-<key> injected by Header.tsx useEffect.
// NOTE: "tasks" is intentionally NOT a primary item — for the demo user (who has
// plans access), Header.tsx renders /serving as primary and Tasks shows up as a
// secondary item under Serving. See SECONDARY_ROUTES below.
type PrimarySection =
  | "dashboard"
  | "people"
  | "donations"
  | "serving"
  | "sermons"
  | "website"
  | "mobile"
  | "settings";

// Secondary nav items: only visible after navigating to a parent section.
// Labels must match SecondaryMenuHelper exactly (case-sensitive text match).
type SecondarySection =
  | "groups"
  | "attendance"
  | "forms"
  | "songs"
  | "tasks"
  | "pages"
  | "blocks"
  | "appearance"
  | "files"
  | "calendars"
  | "registrations"
  | "batches"
  | "funds"
  | "statements"
  | "playlists"
  | "liveStreamTimes"
  | "serverAdmin";

export type NavSection = PrimarySection | SecondarySection;

const PRIMARY_URL_PATTERNS: Record<PrimarySection, RegExp> = {
  dashboard: /\/dashboard|\/$/,
  people: /\/people/,
  donations: /\/donations(?!\/)/,
  serving: /\/serving(?!\/)/,
  sermons: /\/sermons(?!\/)/,
  website: /\/site\/pages/,
  mobile: /\/mobile/,
  settings: /\/settings/,
};

// For each secondary section: the primary parent to open first, the text label in
// the #secondaryMenu, and the URL pattern to wait for after clicking.
const SECONDARY_ROUTES: Record<
  SecondarySection,
  { parent: PrimarySection; label: string; url: RegExp }
> = {
  groups: { parent: "people", label: "Groups", url: /\/groups/ },
  attendance: { parent: "people", label: "Attendance", url: /\/attendance/ },
  forms: { parent: "settings", label: "Forms", url: /\/forms/ },
  songs: { parent: "serving", label: "Songs", url: /\/serving\/songs/ },
  tasks: { parent: "serving", label: "Tasks", url: /\/serving\/tasks/ },
  pages: { parent: "website", label: "Pages", url: /\/site\/pages/ },
  blocks: { parent: "website", label: "Blocks", url: /\/site\/blocks/ },
  appearance: { parent: "website", label: "Appearance", url: /\/site\/appearance/ },
  files: { parent: "website", label: "Files", url: /\/site\/files/ },
  calendars: { parent: "website", label: "Calendars", url: /\/calendars/ },
  registrations: { parent: "website", label: "Registrations", url: /\/registrations/ },
  batches: { parent: "donations", label: "Batches", url: /\/donations\/batches/ },
  funds: { parent: "donations", label: "Funds", url: /\/donations\/funds/ },
  statements: { parent: "donations", label: "Giving Statements", url: /\/donations\/statements/ },
  playlists: { parent: "sermons", label: "Playlists", url: /\/sermons\/playlists/ },
  liveStreamTimes: { parent: "sermons", label: "Live Stream Times", url: /\/sermons\/times/ },
  serverAdmin: { parent: "settings", label: "Server Admin", url: /\/admin/ },
};

export async function openPrimaryNav(page: Page) {
  const menuBtn = page.locator("#primaryNavButton");
  await menuBtn.waitFor({ state: "visible", timeout: 15000 });
  await menuBtn.click();
}

async function clickPrimary(page: Page, section: PrimarySection) {
  await openPrimaryNav(page);
  const item = page.locator(`[data-testid="nav-item-${section}"]`);
  await item.waitFor({ state: "visible", timeout: 10000 });
  await item.click();
  await page.waitForURL(PRIMARY_URL_PATTERNS[section], { timeout: 15000 });
}

async function clickSecondary(page: Page, label: string, url: RegExp) {
  const item = page.locator('[id="secondaryMenu"]').getByText(label, { exact: true }).first();
  await item.waitFor({ state: "visible", timeout: 10000 });
  await item.click();
  await page.waitForURL(url, { timeout: 15000 });
}

function isPrimary(section: NavSection): section is PrimarySection {
  return section in PRIMARY_URL_PATTERNS;
}

export async function navigateTo(page: Page, section: NavSection) {
  if (isPrimary(section)) {
    await clickPrimary(page, section);
    return;
  }
  const route = SECONDARY_ROUTES[section];
  await clickPrimary(page, route.parent);
  await clickSecondary(page, route.label, route.url);
}

export async function navigateToPeople(page: Page) {
  await navigateTo(page, "people");
  await page.waitForSelector("table", { state: "visible" });
}

export async function navigateToGroups(page: Page) {
  await navigateTo(page, "groups");
}

export async function navigateToSettings(page: Page) {
  await navigateTo(page, "settings");
}

export async function navigateToForms(page: Page) {
  await navigateTo(page, "forms");
}

export async function navigateToDonations(page: Page) {
  await navigateTo(page, "donations");
}

export async function navigateToAttendance(page: Page) {
  await navigateTo(page, "attendance");
}

export async function navigateToCalendars(page: Page) {
  await navigateTo(page, "calendars");
}

export async function navigateToServing(page: Page) {
  await navigateTo(page, "serving");
}

export async function navigateToSermons(page: Page) {
  await navigateTo(page, "sermons");
}

export async function navigateToMobile(page: Page) {
  await navigateTo(page, "mobile");
}

export async function navigateToSite(page: Page) {
  await navigateTo(page, "website");
}
