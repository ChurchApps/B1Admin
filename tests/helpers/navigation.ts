import type { Page } from "@playwright/test";

// Tasks and calendars are secondary items per Header.tsx navigation structure.
type PrimarySection =
  | "dashboard"
  | "people"
  | "donations"
  | "serving"
  | "sermons"
  | "website"
  | "calendars"
  | "mobile"
  | "settings";

// Secondary nav items: only visible after navigating to a parent section.
// Labels must match SecondaryMenuHelper exactly (case-sensitive text match).
type SecondarySection =
  | "groups"
  | "attendance"
  | "forms"
  | "roles"
  | "songs"
  | "tasks"
  | "pages"
  | "blocks"
  | "appearance"
  | "files"
  | "roomsResources"
  | "availability"
  | "approvals"
  | "registrations"
  | "batches"
  | "funds"
  | "campaigns"
  | "statements"
  | "liveStreamTimes"
  | "labels"
  | "serverAdmin";

export type NavSection = PrimarySection | SecondarySection;

const PRIMARY_URL_PATTERNS: Record<PrimarySection, RegExp> = {
  dashboard: /\/dashboard|\/$/,
  people: /\/people\/?(\?|$)/,
  donations: /\/donations(?!\/)/,
  // Users with plan access land on /serving/plans; others fall back to /serving/tasks.
  serving: /\/serving\/(plans|tasks)/,
  sermons: /\/sermons(?!\/)/,
  website: /\/site\/pages/,
  calendars: /\/calendars(?!\/)/,
  mobile: /\/mobile/,
  settings: /\/settings/
};

// For each secondary section: the primary parent to open first, the text label in
// the header jump menu, and the URL pattern to wait for after clicking.
const SECONDARY_ROUTES: Record<
  SecondarySection,
  { parent: PrimarySection; label: string; url: RegExp }
> = {
  groups: { parent: "people", label: "Groups", url: /\/groups/ },
  attendance: { parent: "people", label: "Attendance", url: /\/attendance/ },
  forms: { parent: "people", label: "Forms", url: /\/forms/ },
  roles: { parent: "settings", label: "Roles", url: /\/settings\/roles/ },
  songs: { parent: "serving", label: "Songs", url: /\/serving\/songs/ },
  tasks: { parent: "serving", label: "My Work", url: /\/serving\/tasks/ },
  pages: { parent: "website", label: "Pages", url: /\/site\/pages/ },
  blocks: { parent: "website", label: "Blocks", url: /\/site\/blocks/ },
  appearance: { parent: "website", label: "Appearance", url: /\/site\/appearance/ },
  files: { parent: "website", label: "Files", url: /\/site\/files/ },
  roomsResources: { parent: "calendars", label: "Rooms & Resources", url: /\/calendars\/rooms/ },
  availability: { parent: "calendars", label: "Availability", url: /\/calendars\/availability/ },
  approvals: { parent: "calendars", label: "Approvals", url: /\/calendars\/approvals/ },
  registrations: { parent: "calendars", label: "Registrations", url: /\/registrations/ },
  batches: { parent: "donations", label: "Batches", url: /\/donations\/batches/ },
  funds: { parent: "donations", label: "Funds", url: /\/donations\/funds/ },
  campaigns: { parent: "donations", label: "Campaigns", url: /\/donations\/campaigns/ },
  statements: { parent: "donations", label: "Giving Statements", url: /\/donations\/statements/ },
  liveStreamTimes: { parent: "sermons", label: "Live Stream Times", url: /\/sermons\/times/ },
  labels: { parent: "mobile", label: "Labels", url: /\/mobile\/checkin\/labels/ },
  serverAdmin: { parent: "settings", label: "Server Admin", url: /\/admin/ }
};

// Exact landing pages, so "already here" never matches a sub-page like /settings/email-templates.
const PRIMARY_LANDING: Record<PrimarySection, RegExp> = {
  dashboard: /^\/(dashboard)?$/,
  people: /^\/people$/,
  donations: /^\/donations$/,
  serving: /^\/serving\/(plans|tasks)$/,
  sermons: /^\/sermons$/,
  website: /^\/site\/pages$/,
  calendars: /^\/calendars$/,
  mobile: /^\/mobile(\/navigation)?$/,
  settings: /^\/settings$/
};

// The header's search/jump bar is the main menu; its section rows carry the same labels as the old dropdown.
const PRIMARY_LABELS: Record<PrimarySection, string> = {
  dashboard: "Dashboard",
  people: "People",
  donations: "Donations",
  serving: "Serving",
  sermons: "Sermons",
  website: "Website",
  calendars: "Calendars",
  mobile: "Mobile",
  settings: "Settings"
};

export async function openPrimaryNav(page: Page) {
  // A previous step may have left the menu open; its overlay would swallow the click on the bar.
  if (await page.getByTestId("command-palette").isVisible()) await page.keyboard.press("Escape");
  const menuBtn = page.getByTestId("command-palette-open");
  await menuBtn.waitFor({ state: "visible", timeout: 15000 });
  await menuBtn.click();
  await page.getByTestId("command-palette").waitFor({ state: "visible", timeout: 10000 });
}

async function clickPrimary(page: Page, section: PrimarySection) {
  // Jumping to the page you're already on doesn't change the URL, so a test could fill a form the page then re-renders; reload for a clean page instead.
  if (PRIMARY_LANDING[section].test(new URL(page.url()).pathname.replace(/(.)\/$/, "$1"))) {
    await page.reload();
    await page.getByTestId("command-palette-open").waitFor({ state: "visible", timeout: 15000 });
    return;
  }
  await openPrimaryNav(page);
  const palette = page.getByTestId("command-palette");
  // Typing makes Enter/click jump to the section's page instead of drilling into its submenu.
  await palette.getByRole("textbox").fill(PRIMARY_LABELS[section]);
  const item = palette.getByRole("button", { name: PRIMARY_LABELS[section], exact: true }).first();
  await item.waitFor({ state: "visible", timeout: 10000 });
  await item.click();
  await palette.waitFor({ state: "hidden", timeout: 10000 });
  await page.waitForURL(PRIMARY_URL_PATTERNS[section], { timeout: 15000 });
}

// Sibling pages live in the header's jump menu, which opens with the current section expanded; returns its page rows.
export async function siblingNav(page: Page) {
  const palette = page.getByTestId("command-palette");
  if (!(await palette.isVisible())) await page.getByTestId("command-palette-open").click();
  const rows = palette.locator(".om-child");
  await rows.first().waitFor({ state: "visible", timeout: 10000 });
  return rows;
}

async function clickSecondary(page: Page, label: string, url: RegExp) {
  const item = (await siblingNav(page)).getByText(label, { exact: true }).first();
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

export async function navigateToRoles(page: Page) {
  await navigateTo(page, "roles");
}

// Developer is a section of the Settings landing's configuration list (not a
// secondary-nav item). Navigate to the landing and select the Developer section.
export async function navigateToDeveloper(page: Page) {
  await navigateToSettings(page);
  const section = page.locator('[data-testid="settings-section-developer"]');
  await section.waitFor({ state: "visible", timeout: 10000 });
  await section.click();
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

export async function navigateToRoomsResources(page: Page) {
  await navigateTo(page, "roomsResources");
}

export async function navigateToApprovals(page: Page) {
  await navigateTo(page, "approvals");
}

export async function navigateToAvailability(page: Page) {
  await navigateTo(page, "availability");
}

export async function navigateToRegistrations(page: Page) {
  await navigateTo(page, "registrations");
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
