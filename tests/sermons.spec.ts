import { test as plainTest, type Page } from "@playwright/test";
import { sermonsTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSermons, siblingNav } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";
import { loginAsVolunteer } from "./helpers/names-only-role";

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe("Sermons Management", () => {

  /* test('should load sermons home', async ({ page }) => {
    const sermonsHeader = page.locator('h4').getByText('Sermons');
    await sermonsHeader.click();
  }); */

  test.describe.serial("Sermons Home", () => {
    // Add sermon / add live URL aren't idempotent — a retry re-adds the row and
    // the toHaveCount(1) assertions see duplicates. Same policy as Live Stream Times.
    test.describe.configure({ retries: 0 });
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test("should add sermon", async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const sermonBtn = page.locator("li").getByText("Add Sermon");
      await sermonBtn.click();
      const date = page.locator('[name="publishDate"]');
      await date.fill("2025-12-02");
      const name = page.locator('[name="title"]');
      await name.fill("Zacchaeus Test Sermon");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedSermon = page.locator("td").getByText("Zacchaeus Test Sermon");
      await expect(validatedSermon).toHaveCount(1);
    });

    test("should edit sermon", async () => {
      const sermonRow = page.locator("tr").filter({ hasText: "Zacchaeus Test Sermon" });
      const editBtn = sermonRow.locator('[data-testid^="edit-sermon-"]');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveValue("Zacchaeus Test Sermon", { timeout: 10000 });
      const date = page.locator('[name="publishDate"]');
      await date.fill("2025-12-02");
      await name.fill("Zebedee Test Sermon");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedSermon = page.locator("td").getByText("Zebedee Test Sermon");
      await expect(validatedSermon).toHaveCount(1);
    });

    test("should search for a sermon", async () => {
      const searchBar = page.locator('[data-testid="sermon-search-input"]');
      await searchBar.fill("Zebedee Test Sermon");
      const validatedSermon = page.locator("td").getByText("Zebedee Test Sermon");
      await expect(validatedSermon).toHaveCount(1);
      // The filter persists on the page; clear it so later tests in this chain see their new rows.
      await searchBar.fill("");
    });

    test("should set a podcast audio url on a sermon", async () => {
      const sermonRow = page.locator("tr").filter({ hasText: "Zebedee Test Sermon" });
      await sermonRow.locator('[data-testid^="edit-sermon-"]').click();
      const audio = page.locator('[name="audioUrl"]');
      await expect(audio).toBeVisible({ timeout: 10000 });
      await audio.fill("https://content.churchapps.org/demo/zebedee.mp3");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(audio).toHaveCount(0, { timeout: 10000 });

      await sermonRow.locator('[data-testid^="edit-sermon-"]').click();
      await expect(page.locator('[name="audioUrl"]')).toHaveValue("https://content.churchapps.org/demo/zebedee.mp3", { timeout: 10000 });
      await page.getByRole("button", { name: "Cancel" }).click();
    });

    test("should show a copyable podcast feed url", async () => {
      const feed = page.locator('[data-testid="podcast-feed-url"]');
      await expect(feed).toBeVisible({ timeout: 10000 });
      await expect(feed).toContainText("/sermons/rss/");
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.locator('[data-testid="copy-podcast-feed-url"]').click();
      await expect(page.getByText("Podcast feed URL copied")).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: test.info().outputPath("podcast-rss-after.png"), fullPage: true });
    });

    test("should cancel editing sermon", async () => {
      const sermonRow = page.locator("tr").filter({ hasText: "Zebedee Test Sermon" });
      const editBtn = sermonRow.locator('[data-testid^="edit-sermon-"]');
      await editBtn.click();
      const date = page.locator('[name="publishDate"]');
      await expect(date).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(date).toHaveCount(0);
    });

    test("should delete sermon", async () => {
      const sermonRow = page.locator("tr").filter({ hasText: "Zebedee Test Sermon" });
      const editBtn = sermonRow.locator('[data-testid^="edit-sermon-"]');
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);
      const validatedDeletion = page.getByText("Zebedee Test Sermon");
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test("should add live URL", async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const urlBtn = page.locator("li").getByText("Add Permanent Live URL");
      await urlBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill("Zacchaeus Test Live URL");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedUrl = page.locator("td").getByText("Zacchaeus Test Live URL");
      await expect(validatedUrl).toHaveCount(1);
    });

    test("should edit live URL", async () => {
      const urlRow = page.locator("tr").filter({ hasText: "Zacchaeus Test Live URL" });
      const editBtn = urlRow.locator('[data-testid^="edit-sermon-"]');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveValue("Zacchaeus Test Live URL", { timeout: 10000 });
      await name.fill("Zebedee Test Live URL");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedUrl = page.locator("td").getByText("Zebedee Test Live URL");
      await expect(validatedUrl).toHaveCount(1);
    });

    test("should cancel editing live URL", async () => {
      const urlRow = page.locator("tr").filter({ hasText: "Zebedee Test Live URL" });
      const editBtn = urlRow.locator('[data-testid^="edit-sermon-"]');
      await editBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test("should delete live URL", async () => {
      const urlRow = page.locator("tr").filter({ hasText: "Zebedee Test Live URL" });
      const editBtn = urlRow.locator('[data-testid^="edit-sermon-"]');
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);
      const validatedDeletion = page.getByText("Zebedee Test Live URL");
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

  });

  test.describe.serial("Playlists", () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    const panel = () => page.locator('[data-testid="playlists-panel"]');
    const panelEditButton = () => panel().locator('[data-testid^="edit-playlist-"]').first();

    test("should add playlist", async () => {
      const addBtn = panel().locator('[data-testid="add-playlist-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill("Zacchaeus Test Playlist");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedPlaylist = page.locator("td").getByText("Zacchaeus Test Playlist");
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test("should edit playlist", async () => {
      await panelEditButton().click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill("Zebedee Test Playlist");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedPlaylist = page.locator("td").getByText("Zebedee Test Playlist");
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test("should search for a playlist", async () => {
      // The playlist search field only renders once there are more than 5 playlists.
      const searchBar = panel().locator('[data-testid="playlist-search-input"]');
      if (await searchBar.count() > 0) await searchBar.fill("Zebedee Test Playlist");
      const validatedPlaylist = panel().locator("td").getByText("Zebedee Test Playlist");
      await expect(validatedPlaylist).toHaveCount(1);
    });

    test("should cancel editing playlist", async () => {
      await panelEditButton().click();
      const name = page.locator('[name="title"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test("should delete playlist", async () => {
      await panelEditButton().click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);
      const validatedDeletion = page.getByText("Zebedee Test Playlist");
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

  });

  test.describe.serial("Live Stream Times", () => {
    // Live stream services share data — a retry would create duplicate
    // "Zacchaeus Test Service" rows and break subsequent assertions.
    test.describe.configure({ retries: 0 });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const streamHomeBtn = (await siblingNav(page)).getByText("Live Stream Times");
      await streamHomeBtn.click();
    });

    // Target the test's own row: the seeded service can sort after it, and .last() then edited and deleted the seed.
    const serviceRow = (name: string) => page.locator("#servicesBox tbody tr", { hasText: name });

    // Issue #1432: the Stream page counts Minutes Before back from when the video starts, so the chip has to as well.
    test("chat open chip counts back from the video start", async () => {
      await page.locator('[data-testid="add-service-button"]').click();

      const chatBefore = page.locator('[name="chatBefore"]');
      await expect(chatBefore).toBeVisible({ timeout: 10000 });
      const earlyStart = page.locator('[name="earlyStart"]');
      const chatChip = page.locator(".MuiTextField-root", { has: chatBefore });

      // A new service is next Sunday at 9:00 AM with both values at 10.
      await expect(chatBefore).toHaveValue("10");
      await expect(earlyStart).toHaveValue("10");
      await expect(chatChip).toContainText("8:40 AM");

      await earlyStart.fill("");
      await expect(chatChip).toContainText("8:50 AM");

      await page.locator("button").getByText("Cancel").click();
      await expect(page.locator('[name="serviceLabel"]')).toHaveCount(0);
    });

    test("should add service", async () => {
      const addBtn = page.locator('[data-testid="add-service-button"]');
      await addBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill("Zacchaeus Test Service");
      const saveBtn = page.locator("button").getByText("Save");
      const post = page.waitForResponse(r => r.url().includes("/streamingServices") && r.request().method() === "POST", { timeout: 15000 });
      await saveBtn.click();
      await post;
      await expect(serviceRow("Zacchaeus Test Service")).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit service", async () => {
      const editBtn = serviceRow("Zacchaeus Test Service").getByRole("button", { name: "Edit" });
      await editBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      await name.fill("Zebedee Test Service");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedService = page.locator("td").getByText("Zebedee Test Service");
      await expect(validatedService).toHaveCount(1);
    });

    test("should cancel editing service", async () => {
      const editBtn = serviceRow("Zebedee Test Service").getByRole("button", { name: "Edit" });
      await editBtn.click();
      const name = page.locator('[name="serviceLabel"]');
      await expect(name).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test("should delete service", async () => {
      const editBtn = serviceRow("Zebedee Test Service").getByRole("button", { name: "Edit" });
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);
      const validatedDeletion = page.getByText("Zebedee Test Service");
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test.skip("should view your stream", async () => {
      const context = page.context();
      const settingsBtn = page.locator('[role="tablist"]').getByText("Settings");
      await settingsBtn.click();

      const viewBtn = page.locator("a").getByText("View Your Stream");
      await expect(viewBtn).toBeVisible({ timeout: 10000 });
      await viewBtn.click();

      const [newPage] = await Promise.all([
        context.waitForEvent("page"),
        viewBtn.click()
      ]);
      await newPage.waitForLoadState();
      await expect(newPage).toHaveURL(/vercel.com\/[^/]+/);
    });

    test("should show settings tab with sidebar tabs section and view stream link", async () => {
      await expect(page.getByRole("link", { name: "View Your Stream" })).toBeVisible({ timeout: 10000 });
      await (await siblingNav(page)).getByText("Settings", { exact: true }).first().click();
      await expect(page.getByRole("heading", { name: "Content Tabs" })).toBeVisible({ timeout: 10000 });
    });

    test("content tabs: only external links are links, and tabs reorder with named arrows", async () => {
      await page.goto("/sermons/settings");
      await expect(page.getByRole("heading", { name: "Content Tabs" })).toBeVisible({ timeout: 10000 });
      // The seeded Chat tab has no URL; it used to be a link that reloaded the page.
      await expect(page.getByTestId("stream-tab-0")).toContainText("Chat");
      await expect(page.getByTestId("stream-tab-0").getByRole("link")).toHaveCount(0);

      await page.getByRole("button", { name: "Add", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Tab Text").fill("Zacchaeus Notes");
      await dialog.getByTestId("tab-url-input").locator("input").fill("https://example.com/notes");
      await dialog.getByRole("button", { name: "Save Tab" }).click();
      await expect(dialog).toBeHidden({ timeout: 10000 });

      const added = page.getByTestId("stream-tab-1");
      await expect(added.getByRole("link", { name: /Zacchaeus Notes/ })).toHaveAttribute("target", "_blank");
      const moved = page.waitForResponse((r) => r.url().includes("/links") && r.request().method() === "POST");
      await added.getByRole("button", { name: "Move up" }).click();
      await moved;
      await expect(page.getByTestId("stream-tab-0")).toContainText("Zacchaeus Notes", { timeout: 10000 });
      await expect(page.getByTestId("stream-tab-0").getByRole("button", { name: "Move down" })).toBeVisible();

      await page.getByTestId("stream-tab-0").getByRole("button", { name: "Edit" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await page.getByRole("dialog").filter({ hasText: "Delete Tab" }).getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText("Zacchaeus Notes")).toHaveCount(0, { timeout: 10000 });
      await expect(page.getByTestId("stream-tab-0")).toContainText("Chat");
    });

  });

  test.describe.serial("Bulk Import", () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      await navigateToSermons(page);
      await page.locator('[data-testid="add-sermon-button"]').click();
      await page.locator('[data-testid="bulk-import-menu-item"]').click();
      await expect(page).toHaveURL(/\/sermons\/bulk/, { timeout: 10000 });
    });

    test("should show YouTube and Vimeo source cards", async () => {
      await expect(page.locator('[data-testid="import-youtube-button"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="import-vimeo-button"]')).toBeVisible();
    });

    test("should open YouTube import form when YouTube card is selected", async () => {
      await page.locator('[data-testid="import-youtube-button"]').click();
      const channelInput = page.locator('[name="channelId"]');
      await expect(channelInput).toBeVisible({ timeout: 10000 });
      await expect(page.locator("button").getByText("Fetch")).toBeVisible();
    });

    test("should return to source selection via the header Back button", async () => {
      await page.locator('[data-testid="import-youtube-button"]').click();
      await expect(page.locator('[name="channelId"]')).toBeVisible({ timeout: 10000 });

      // "Back to Selection" became an icon-only AppIconButton in the page header.
      const backBtn = page.locator('button[aria-label="Back"]');
      await backBtn.click();

      await expect(page.locator('[data-testid="import-youtube-button"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="import-vimeo-button"]')).toBeVisible();
    });

    test("should open Vimeo import form when Vimeo card is selected", async () => {
      await page.locator('[data-testid="import-vimeo-button"]').click();
      const channelInput = page.locator('[name="channelId"]');
      await expect(channelInput).toBeVisible({ timeout: 10000 });
      await expect(page.locator("button").getByText("Fetch")).toBeVisible();
    });

    test("a failed fetch says so instead of doing nothing", async () => {
      await page.route("**/sermons/vimeoImport/**", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { message: "forbidden" } }) }));
      await page.locator('[data-testid="import-vimeo-button"]').click();
      await page.locator('[name="channelId"]').fill("no-such-channel");
      await page.getByRole("button", { name: "Fetch" }).click();
      await expect(page.getByText("Couldn't load videos. Check the channel ID and try again.")).toBeVisible({ timeout: 10000 });
      await page.unroute("**/sermons/vimeoImport/**");
    });

    test("imports only the checked videos into the chosen playlist", async () => {
      const videos = [
        { videoType: "youtube", videoData: "vid-one", title: "Zacchaeus Import One", duration: 60, thumbnail: "" },
        { videoType: "youtube", videoData: "vid-two", title: "Zacchaeus Import Two", duration: 60, thumbnail: "" }
      ];
      await page.route("**/sermons/youtubeImport/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(videos) }));
      let posted: any[] = [];
      await page.route("**/content/sermons", async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        posted = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(posted) });
      });
      await page.locator('[data-testid="import-youtube-button"]').click();
      await page.locator('[name="channelId"]').fill("UCtest");
      await page.getByRole("button", { name: "Fetch" }).click();
      const row = page.locator("tr", { hasText: "Zacchaeus Import Two" });
      await expect(row).toBeVisible({ timeout: 10000 });

      await page.getByLabel("Import Into Playlist").click();
      await page.getByRole("option").first().click();
      await page.getByRole("button", { name: "Import", exact: true }).click();
      await expect(page.getByText("Check at least one video to import.")).toBeVisible();
      expect(posted).toHaveLength(0);

      await row.locator('input[type="checkbox"]').check();
      await page.getByRole("button", { name: "Import", exact: true }).click();
      await expect(page.locator('[data-testid="import-youtube-button"]')).toBeVisible({ timeout: 10000 });
      expect(posted.map((s) => s.title)).toEqual(["Zacchaeus Import Two"]);
      expect(posted[0].playlistId).toBeTruthy();
      await page.unroute("**/sermons/youtubeImport/**");
      await page.unroute("**/content/sermons");
    });
  });

  // Edge-case extensions: provider validation + live-stream config gaps from
  // .notes/B1Admin-test-coverage-gaps.md §3 (sermons row).
  test.describe.serial("Sermon edit — video provider details", () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSermons(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test("opens a fresh sermon and exposes the video provider dropdown", async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const openSermonOption = page.locator("li").getByText("Add Sermon");
      if (await openSermonOption.isVisible().catch(() => false)) {
        await openSermonOption.click();
      }
      await expect(page.locator('[data-testid="video-provider-select"]')).toBeVisible({ timeout: 10000 });
    });

    test("video provider dropdown exposes YouTube / Vimeo / Facebook / Custom", async () => {
      // The drawer is still open from the previous test (serial chain). If the runtime
      // reset between tests, re-open it.
      let providerSel = page.locator('[data-testid="video-provider-select"]');
      if (!(await providerSel.isVisible().catch(() => false))) {
        await page.locator('[data-testid="add-sermon-button"]').click();
        const openSermonOption = page.locator("li").getByText("Add Sermon");
        if (await openSermonOption.isVisible().catch(() => false)) await openSermonOption.click();
        providerSel = page.locator('[data-testid="video-provider-select"]');
      }
      await providerSel.click();
      for (const option of ["YouTube", "Vimeo", "Facebook"]) {
        await expect(page.locator('li[role="option"]', { hasText: new RegExp(`^${option}\\b`) })).toBeVisible({ timeout: 10000 });
      }
      await expect(page.locator('li[role="option"]', { hasText: /Custom/i })).toBeVisible();
      await page.keyboard.press("Escape");
    });

    test("switching provider to Vimeo updates the video ID input label", async () => {
      let providerSel = page.locator('[data-testid="video-provider-select"]');
      if (!(await providerSel.isVisible().catch(() => false))) {
        await page.locator('[data-testid="add-sermon-button"]').click();
        const openSermonOption = page.locator("li").getByText("Add Sermon");
        if (await openSermonOption.isVisible().catch(() => false)) await openSermonOption.click();
        providerSel = page.locator('[data-testid="video-provider-select"]');
      }
      await providerSel.click();
      await page.locator('li[role="option"]', { hasText: /^Vimeo/ }).click();
      await expect(page.locator('[data-testid="fetch-vimeo-button"]')).toBeVisible({ timeout: 10000 });
      // Cancel out so we don't pollute later tests.
      await page.locator("button").getByText("Cancel").first().click().catch(() => { });
    });

    test("publish date input is present on a new sermon", async () => {
      const addBtn = page.locator('[data-testid="add-sermon-button"]');
      await addBtn.click();
      const openSermonOption = page.locator("li").getByText("Add Sermon");
      if (await openSermonOption.isVisible().catch(() => false)) {
        await openSermonOption.click();
      }
      await expect(page.locator('[data-testid="publish-date-input"]')).toBeVisible({ timeout: 10000 });
      await page.locator("button").getByText("Cancel").first().click().catch(() => { });
    });

    test("Fetch explains when the video's details can't be loaded", async () => {
      await page.route("**/sermons/lookup**", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { message: "forbidden" } }) }));
      await page.locator('[data-testid="add-sermon-button"]').click();
      await page.locator("li").getByText("Add Sermon").click();
      await page.locator('[data-testid="video-data-input"] input').fill("notARealId");
      await page.locator('[data-testid="fetch-youtube-button"]').click();
      await expect(page.getByText("Couldn't fetch that video's details. Check the ID, or fill them in yourself.")).toBeVisible({ timeout: 10000 });
      await page.unroute("**/sermons/lookup**");

      await page.locator('[data-testid="add-to-playlist-link"]').click();
      await expect(page.locator('[data-testid="add-to-playlist-button"]')).toHaveText("Add");
      await page.locator("button").getByText("Cancel").first().click();
    });
  });
});

// Without Streaming Services / Edit, every Sermons page explains why instead of rendering blank.
plainTest.describe("Sermons pages without streaming permission", () => {
  plainTest.use({ storageState: { cookies: [], origins: [] } });

  plainTest("Live Stream Times, Settings and Bulk Import show a permission message", async ({ page }) => {
    await loginAsVolunteer(page);
    for (const path of ["/sermons", "/sermons/times", "/sermons/settings", "/sermons/bulk"]) {
      await page.goto(path);
      await expect(page.getByText("You don't have permission to view this page.")).toBeVisible({ timeout: 15000 });
    }
  });
});
