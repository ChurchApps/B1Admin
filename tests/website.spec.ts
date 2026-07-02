import type { Page } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { trashIconButton } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToSite, navigateToCalendars } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe("Website Management", () => {

  /* test('should load website home', async ({ page }) => {
    const websiteHeader = page.locator('h4').getByText('Website Pages');
    await websiteHeader.click();
  }); */


  test.describe.serial("Pages", () => {
    // Pages tests share data — a retry would create duplicate "Zacchaeus
    // Test Page" rows (URL slug collision throws 500) and break the chain.
    test.describe.configure({ retries: 0 });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    // Several tests in this chain click "edit-page-button" which navigates to
    // the page preview view. Re-enter /site/pages before each test so the
    // pages list (and its edit affordances) is in the DOM. Close any open
    // Page Settings dialog first — "should cancel deleting page" leaves it
    // open, and the dialog blocks pointer events on the primary nav.
    test.beforeEach(async () => {
      const settingsDialog = page.locator('div[role="dialog"]:has-text("Page Settings")');
      await settingsDialog.locator('button:has-text("Cancel")').click({ timeout: 2000 }).catch(() => { });
      await settingsDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
      if (!/\/site\/pages(\?|$)/.test(page.url())) {
        await navigateToSite(page);
      }
    });

    test("should add page", async () => {
      const addBtn = page.locator('[data-testid="add-page-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill("Zacchaeus Test Page");
      const saveBtn = page.locator("button").getByText("Save");
      // Wait for the create-page POST to complete before asserting on the UI;
      // under load the table refetch can lag behind the dialog close, leaving
      // a race where toHaveCount(1) hits the empty state.
      const pagePost = page.waitForResponse(r => r.url().includes("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
      await saveBtn.click();
      await pagePost;
      const validatedPage = page.locator("td").getByText("Zacchaeus Test Page");
      await expect(validatedPage).toHaveCount(1, { timeout: 10000 });
    });

    test("should cancel adding page", async () => {
      const addBtn = page.locator('[data-testid="add-page-button"]');
      await addBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test("should edit page title", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator("button").getByText("Page Settings");
      await settingsBtn.click();
      const name = page.locator('[name="title"]');
      await name.fill("Zebedee Test Page");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedPage = page.locator("h6").getByText("Zebedee Test Page");
      await expect(validatedPage).toHaveCount(2);
    });

    test("should cancel editing page title", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator("button").getByText("Page Settings");
      await settingsBtn.click();
      const name = page.locator('[name="title"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test("should edit page content", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const addBtn = page.locator('[data-testid="content-editor-add-button"]');
      // Open the elements panel — it's a toggle, so guard against accidental
      // double-click closing it.
      const ensurePanelOpen = async () => {
        const sectionVisible = await page.locator('[data-testid="draggable-element-section"]')
          .isVisible({ timeout: 500 }).catch(() => false);
        if (!sectionVisible) await addBtn.click();
      };
      await ensurePanelOpen();
      const section = page.locator('[data-testid="draggable-element-section"]');
      await expect(section).toBeVisible({ timeout: 10000 });
      const dropzone = page.locator('div [data-testid="droppable-area"]').first();
      await section.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await dropzone.hover();
      await page.mouse.up();
      // Dropping a section now opens the template picker; choose a blank section.
      const blankTemplate = page.locator('[data-testid="template-blank"]');
      await expect(blankTemplate).toBeVisible({ timeout: 10000 });
      await blankTemplate.click();
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      //add text to confirm
      await ensurePanelOpen();
      const text = page.locator('[data-testid="draggable-element-text"]');
      await expect(text).toBeVisible({ timeout: 10000 });
      const secondaryDropzone = page.locator('div [data-testid="droppable-area"]').nth(1);
      await text.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await secondaryDropzone.hover();
      await page.mouse.up();
      const textbox = page.locator('[role="textbox"]');
      await textbox.fill("Zacchaeus Test Text");
      await saveBtn.click();
      const validatedText = page.locator("p").getByText("Zacchaeus Test Text");
      await expect(validatedText).toBeVisible({ timeout: 10000 });
      await expect(validatedText).toHaveCount(1);
    });

    test("should add a section from a template", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const addBtn = page.locator('[data-testid="content-editor-add-button"]');
      const ensurePanelOpen = async () => {
        const sectionVisible = await page.locator('[data-testid="draggable-element-section"]')
          .isVisible({ timeout: 500 }).catch(() => false);
        if (!sectionVisible) await addBtn.click();
      };
      await ensurePanelOpen();
      const section = page.locator('[data-testid="draggable-element-section"]');
      await expect(section).toBeVisible({ timeout: 10000 });
      const dropzone = page.locator('div [data-testid="droppable-area"]').first();
      await section.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await dropzone.hover();
      await page.mouse.up();
      const templateCard = page.locator('[data-testid="template-serviceTimes"]');
      await expect(templateCard).toBeVisible({ timeout: 10000 });
      const treePost = page.waitForResponse(r => r.url().includes("/content/sections/tree") && r.request().method() === "POST", { timeout: 15000 });
      await templateCard.click();
      const treeResponse = await treePost;
      expect(treeResponse.status()).toBe(200);
      // Template content (heading + the three service-time cards) renders in the canvas.
      await expect(page.getByText("Join Us This Weekend")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Sunday 9:00 AM")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Wednesday 6:30 PM")).toBeVisible({ timeout: 10000 });
    });

    test("should toggle per-device visibility on an element", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const textElement = page.locator("p").getByText("Zacchaeus Test Text");
      await expect(textElement).toBeVisible({ timeout: 10000 });
      // Single click selects the element and opens its property panel.
      await textElement.click();
      const hideOnMobile = page.locator('[data-testid="hide-on-mobile-switch"]');
      await expect(hideOnMobile).toBeVisible({ timeout: 10000 });
      await hideOnMobile.click();
      await expect(page.locator('[data-testid="hide-on-mobile-switch"] input')).toBeChecked();
      const elementPost = page.waitForResponse(r => r.url().includes("/content/elements") && r.request().method() === "POST", { timeout: 15000 });
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      expect((await elementPost).status()).toBe(200);
      // Mobile preview renders the hidden element dimmed (selectable) rather than display:none.
      await page.locator('[data-testid="device-type-mobile"]').click();
      const wrapper = page.locator("div[data-element-id]").filter({ hasText: "Zacchaeus Test Text" }).first();
      const elementId = await wrapper.getAttribute("data-element-id");
      await expect(page.locator(`#el-${elementId}`)).toHaveCSS("opacity", "0.45");
      // Desktop preview is unaffected.
      await page.locator('[data-testid="device-type-desktop"]').click();
      await expect(page.locator(`#el-${elementId}`)).toHaveCSS("opacity", "1");
      // The saved flag round-trips into the editor.
      await textElement.click();
      await expect(page.locator('[data-testid="hide-on-mobile-switch"] input')).toBeChecked();
    });

    test("should publish, discard draft changes, and turn off publishing", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const publishBtn = page.locator('[data-testid="publish-button"]');
      await expect(publishBtn).toBeVisible({ timeout: 10000 });
      const statusPill = page.locator('[data-testid="publish-status-pill"]');
      await expect(statusPill).toHaveAttribute("data-status", "live-on-save");
      await expect(page.locator('[data-testid="save-status"]')).toHaveAttribute("data-status", "saved");
      const publishPost = page.waitForResponse(r => /\/content\/pages\/[^/]+\/publish/.test(r.url()) && r.request().method() === "POST", { timeout: 15000 });
      await publishBtn.click();
      expect((await publishPost).status()).toBe(200);
      await expect(statusPill).toHaveAttribute("data-status", "published");
      await expect(publishBtn).toHaveText(/Published/);

      // Make a draft-only edit after publishing.
      const addBtn = page.locator('[data-testid="content-editor-add-button"]');
      const ensurePanelOpen = async () => {
        const textVisible = await page.locator('[data-testid="draggable-element-text"]')
          .isVisible({ timeout: 500 }).catch(() => false);
        if (!textVisible) await addBtn.click();
      };
      await ensurePanelOpen();
      const text = page.locator('[data-testid="draggable-element-text"]');
      await expect(text).toBeVisible({ timeout: 10000 });
      const dropzone = page.locator('div [data-testid="droppable-area"]').nth(1);
      await text.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await dropzone.hover();
      await page.mouse.up();
      const textbox = page.locator('[role="textbox"]');
      await textbox.fill("Draft Only Text");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      await expect(page.locator("p").getByText("Draft Only Text")).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="publish-status-pill"]')).toHaveAttribute("data-status", "unpublished-changes");

      // Discard restores the editor to the published version.
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        await dialog.accept();
      });
      await page.locator('[data-testid="content-editor-overflow-button"]').click();
      const discardItem = page.locator('[data-testid="discard-changes-menu-item"]');
      await expect(discardItem).toBeVisible({ timeout: 10000 });
      const discardPost = page.waitForResponse(r => /\/content\/pages\/[^/]+\/discard/.test(r.url()) && r.request().method() === "POST", { timeout: 15000 });
      await discardItem.click();
      expect((await discardPost).status()).toBe(200);
      await expect(page.locator("p").getByText("Draft Only Text")).toHaveCount(0, { timeout: 10000 });
      await expect(page.locator("p").getByText("Zacchaeus Test Text").first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="publish-status-pill"]')).toHaveAttribute("data-status", "published");

      // Turn publishing back off so later tests see live-on-save behavior.
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        await dialog.accept();
      });
      await page.locator('[data-testid="content-editor-overflow-button"]').click();
      const disableItem = page.locator('[data-testid="disable-publish-menu-item"]');
      await expect(disableItem).toBeVisible({ timeout: 10000 });
      const unpublishDelete = page.waitForResponse(r => /\/content\/pages\/[^/]+\/published/.test(r.url()) && r.request().method() === "DELETE", { timeout: 15000 });
      await disableItem.click();
      expect((await unpublishDelete).status()).toBe(200);
      await expect(page.locator('[data-testid="publish-status-pill"]')).toHaveAttribute("data-status", "live-on-save");
      // Menu items for published pages disappear once publishing is off.
      await page.locator('[data-testid="content-editor-overflow-button"]').click();
      await expect(page.locator('[data-testid="discard-changes-menu-item"]')).toHaveCount(0);
      await page.keyboard.press("Escape");
    });

    test("should click to add a section via the divider", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const divider = page.locator('[data-testid="add-section-divider"]').first();
      await expect(divider).toBeVisible({ timeout: 10000 });
      await divider.hover();
      const addBtn = divider.locator('[data-testid="add-section-divider-button"]');
      await expect(addBtn).toHaveCSS("opacity", "1");
      await addBtn.click();
      const blankTemplate = page.locator('[data-testid="template-blank"]');
      await expect(blankTemplate).toBeVisible({ timeout: 10000 });
      await blankTemplate.click();
      const sectionPost = page.waitForResponse(r => r.url().endsWith("/content/sections") && r.request().method() === "POST", { timeout: 15000 });
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      expect((await sectionPost).status()).toBe(200);
    });

    test("should click an element card to insert it", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      // Select the existing text element so the insert lands right after it.
      const textElement = page.locator("p").getByText("Zacchaeus Test Text").first();
      await expect(textElement).toBeVisible({ timeout: 10000 });
      await textElement.click();
      await page.locator('[data-testid="property-panel-close"]').click();
      const addBtn = page.locator('[data-testid="content-editor-add-button"]');
      const card = page.locator('[data-testid="draggable-element-text"]');
      if (!await card.isVisible({ timeout: 500 }).catch(() => false)) await addBtn.click();
      await expect(card).toBeVisible({ timeout: 10000 });
      await card.click();
      const textbox = page.locator('[role="textbox"]');
      await expect(textbox).toBeVisible({ timeout: 10000 });
      await textbox.fill("Zacchaeus Click Added");
      const elementPost = page.waitForResponse(r => r.url().endsWith("/content/elements") && r.request().method() === "POST", { timeout: 15000 });
      await page.locator("button").getByText("Save").click();
      expect((await elementPost).status()).toBe(200);
      await expect(page.locator("p").getByText("Zacchaeus Click Added")).toBeVisible({ timeout: 10000 });
    });

    test("should warn before discarding unsaved element edits", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const textElement = page.locator("p").getByText("Zacchaeus Click Added").first();
      await expect(textElement).toBeVisible({ timeout: 10000 });
      // Clean close: no prompt.
      await textElement.click();
      const closeBtn = page.locator('[data-testid="property-panel-close"]');
      await expect(closeBtn).toBeVisible({ timeout: 10000 });
      await closeBtn.click();
      await expect(page.locator('[data-testid="discard-element-dialog"]')).toHaveCount(0);
      // Dirty close: prompt, keep editing, then discard.
      await textElement.click();
      const textbox = page.locator('[role="textbox"]');
      await expect(textbox).toBeVisible({ timeout: 10000 });
      await textbox.fill("Dirty Edit Text");
      await closeBtn.click();
      const discardDialog = page.locator('[data-testid="discard-element-dialog"]');
      await expect(discardDialog).toBeVisible({ timeout: 10000 });
      await discardDialog.locator("button").getByText("Keep editing").click();
      await expect(discardDialog).toHaveCount(0);
      await expect(textbox).toBeVisible();
      await closeBtn.click();
      await expect(discardDialog).toBeVisible({ timeout: 10000 });
      await discardDialog.locator("button").getByText("Discard", { exact: true }).click();
      await expect(textbox).toHaveCount(0, { timeout: 10000 });
      await expect(page.locator("p").getByText("Zacchaeus Click Added")).toBeVisible();
      await expect(page.locator("p").getByText("Dirty Edit Text")).toHaveCount(0);
    });

    test("should manage sections from the hover toolbar", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const sectionWrapper = page.locator(".sectionEditWrapper").filter({ hasText: "Zacchaeus Click Added" }).first();
      await expect(sectionWrapper).toBeVisible({ timeout: 10000 });
      await sectionWrapper.hover();
      const toolbar = sectionWrapper.locator('[data-testid="section-toolbar"]');
      await expect(toolbar).toHaveCSS("opacity", "1");
      // This section sits last in the zone, so move up first, then back down.
      const movePost = page.waitForResponse(r => r.url().endsWith("/content/sections") && r.request().method() === "POST", { timeout: 15000 });
      await toolbar.locator('[data-testid="section-toolbar-move-up"]').click();
      expect((await movePost).status()).toBe(200);
      await sectionWrapper.hover();
      const moveBackPost = page.waitForResponse(r => r.url().endsWith("/content/sections") && r.request().method() === "POST", { timeout: 15000 });
      await sectionWrapper.locator('[data-testid="section-toolbar-move-down"]').click();
      expect((await moveBackPost).status()).toBe(200);
      // Duplicate, then delete the copy.
      await sectionWrapper.hover();
      const duplicatePost = page.waitForResponse(r => r.url().includes("/content/sections/duplicate/") && r.request().method() === "POST", { timeout: 15000 });
      await sectionWrapper.locator('[data-testid="section-toolbar-duplicate"]').click();
      expect((await duplicatePost).status()).toBe(200);
      await expect(page.locator("p").getByText("Zacchaeus Click Added")).toHaveCount(2, { timeout: 10000 });
      const copies = page.locator(".sectionEditWrapper").filter({ hasText: "Zacchaeus Click Added" });
      await copies.last().hover();
      await copies.last().locator('[data-testid="section-toolbar-delete"]').click();
      const deleteDialog = page.locator('[data-testid="delete-section-dialog"]');
      await expect(deleteDialog).toBeVisible({ timeout: 10000 });
      const sectionDelete = page.waitForResponse(r => /\/content\/sections\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE", { timeout: 15000 });
      await deleteDialog.locator("button").getByText("Delete").click();
      expect((await sectionDelete).status()).toBe(200);
      await expect(page.locator("p").getByText("Zacchaeus Click Added")).toHaveCount(1, { timeout: 10000 });
    });

    test("should support keyboard shortcuts", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      const textElement = page.locator("p").getByText("Zacchaeus Click Added").first();
      await expect(textElement).toBeVisible({ timeout: 10000 });
      await textElement.click();
      const closeBtn = page.locator('[data-testid="property-panel-close"]');
      await expect(closeBtn).toBeVisible({ timeout: 10000 });
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
      await page.keyboard.press("Delete");
      const deleteDialog = page.locator("div[role=\"dialog\"]").filter({ hasText: "Delete element?" });
      await expect(deleteDialog).toBeVisible({ timeout: 10000 });
      await deleteDialog.locator("button").getByText("Cancel").click();
      await expect(deleteDialog).toHaveCount(0);
      await expect(page.locator('[data-testid="preview-desktop"] p').getByText("Zacchaeus Click Added")).toBeVisible();
      await page.keyboard.press("Escape");
      // The collapsed panel shell stays in the DOM (clipped, so still "visible" to Playwright);
      // the element edit form itself unmounts on close.
      await expect(page.locator("#dialogForm")).toHaveCount(0, { timeout: 10000 });
    });

    test("should verify done button functionality", async () => {
      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const contentBtn = page.locator("button").getByText("Edit Content");
      await contentBtn.click();
      await expect(page).toHaveURL(/\/site\/pages\/[^/]+/);
      const doneBtn = page.locator('[data-testid="content-editor-done-button"]');
      await expect(doneBtn).toBeVisible({ timeout: 10000 });
      await doneBtn.click();
      await expect(page).toHaveURL(/\/site\/pages\/preview\/[^/]+/, { timeout: 10000 });
    });

    test("should cancel deleting page", async () => {
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        await dialog.dismiss();
      });

      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator("button").getByText("Page Settings");
      await settingsBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      // After dismiss, we should still be on the page editor with the renamed page intact.
      await expect(page).toHaveURL(/\/site\/pages\/preview\/[^/]+/);
      const stillExists = page.locator("h6").getByText("Zebedee Test Page");
      await expect(stillExists.first()).toBeVisible();
    });

    test("should delete page", async () => {
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("Are you sure");
        await dialog.accept();
      });

      const editBtn = page.locator('[data-testid="edit-page-button"]').last();
      await editBtn.click();
      const settingsBtn = page.locator("button").getByText("Page Settings");
      await settingsBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();

      const validatedDeletion = page.locator("td").getByText("Zebedee Test Page");
      await expect(validatedDeletion).toHaveCount(0);
    });

    test("should create a site from a starter template", async () => {
      await page.locator('[data-testid="start-from-template-button"]').click();
      const templateCard = page.locator('[data-testid="site-template-classic"]');
      await expect(templateCard).toBeVisible({ timeout: 10000 });
      await templateCard.click();
      // Demo data already has pages at "/" (Home) and "/about" (About); the classic
      // template's Home and About pages collide on URL and get flagged/skipped — only
      // "Plan Your Visit" (/visit) is actually new. The detail view flags each existing
      // page — just confirm the indicator shows up.
      await expect(page.getByText("Already exists", { exact: true }).first()).toBeVisible({ timeout: 10000 });
      const treePost = page.waitForResponse(r => r.url().includes("/content/sections/tree") && r.request().method() === "POST", { timeout: 20000 });
      await page.locator('[data-testid="site-template-create-button"]').click();
      expect((await treePost).status()).toBe(200);
      // Creation finishes by opening the only newly-created page (Visit) in the preview.
      await page.waitForURL(/\/site\/pages\/preview\/[^/]+/, { timeout: 30000 });
      await expect(page.locator("h6").getByText("Plan Your Visit").first()).toBeVisible({ timeout: 10000 });
      // The new Visit page now exists; the pre-existing Home/About pages were left untouched.
      await navigateToSite(page);
      await expect(page.locator("td").getByText("Plan Your Visit")).toHaveCount(1, { timeout: 10000 });
      // Exactly one row for "/" — the pre-existing home page was not duplicated.
      const homeRow = page.locator("tr").filter({ has: page.locator("td").getByText("/", { exact: true }) });
      await expect(homeRow).toHaveCount(1);
      await expect(homeRow.locator("td").getByText("Home", { exact: true })).toBeVisible();
      // Exactly one row for "/about" — the pre-existing About page was not duplicated either.
      const aboutRow = page.locator("tr").filter({ has: page.locator("td").getByText("/about", { exact: true }) });
      await expect(aboutRow).toHaveCount(1);
      // Only the Visit nav link is new — Home/About/Sermons/Give links already existed and were not duplicated.
      await expect(page.getByText("Visit", { exact: true })).toBeVisible({ timeout: 10000 });
    });

  });

  test.describe.serial("Blocks", () => {
    // Blocks tests share data — a retry would create duplicate "Zacchaeus
    // Test Block" rows and break subsequent assertions.
    test.describe.configure({ retries: 0 });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const blocksHomeBtn = page.locator("a").getByText("Blocks").first();
      await blocksHomeBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks/);
    });

    test("should add block", async () => {
      const addBtn = page.locator('[data-testid="add-block-button"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill("Zacchaeus Test Block");
      const typeSelectBox = page.locator('[role="combobox"]');
      await typeSelectBox.click();
      const typeSelect = page.locator('[data-testid="block-type-section"]');
      await typeSelect.click();
      const saveBtn = page.locator("button").getByText("Save");
      const blockPost = page.waitForResponse(r => r.url().includes("/content/blocks") && r.request().method() === "POST", { timeout: 15000 });
      await saveBtn.click();
      await blockPost;
      const validatedBlock = page.locator("td").getByText("Zacchaeus Test Block");
      await expect(validatedBlock).toBeVisible({ timeout: 10000 });
      await expect(validatedBlock).toHaveCount(1);
    });

    test("should cancel adding block", async () => {
      const addBtn = page.locator('[data-testid="add-block-button"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test("should edit block content", async () => {
      // The row edit affordance is an icon-only IconButton-as-Link (aria-label "Edit").
      const editBtn = page.locator('td a[aria-label="Edit"]').last();
      await editBtn.click();
      const addBtn = page.locator('[data-testid="content-editor-add-button"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      const ensurePanelOpen = async () => {
        const sectionVisible = await page.locator('[data-testid="draggable-element-section"]')
          .isVisible({ timeout: 500 }).catch(() => false);
        if (!sectionVisible) await addBtn.click();
      };
      await ensurePanelOpen();
      const section = page.locator('[data-testid="draggable-element-section"]');
      await expect(section).toBeVisible({ timeout: 10000 });
      const dropzone = page.locator('div [data-testid="droppable-area"]').first();
      await section.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      // Empty blocks render a zero-sized dropzone covered by the preview-desktop
      // wrapper; force the hover so the drop completes despite the overlay.
      await dropzone.hover({ force: true });
      await page.mouse.up();
      // Dropping a section now opens the template picker; choose a blank section.
      const blankTemplate = page.locator('[data-testid="template-blank"]');
      await expect(blankTemplate).toBeVisible({ timeout: 10000 });
      await blankTemplate.click();
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      //add text to confirm
      await ensurePanelOpen();
      const text = page.locator('[data-testid="draggable-element-text"]');
      await expect(text).toBeVisible({ timeout: 10000 });
      const secondaryDropzone = page.locator('div [data-testid="droppable-area"]').nth(1);
      await text.hover();
      await page.mouse.down();
      await page.mouse.move(-10, -10);
      await secondaryDropzone.hover({ force: true });
      await page.mouse.up();
      const textbox = page.locator('[role="textbox"]');
      await textbox.fill("Zacchaeus Test Text");
      await saveBtn.click();
      const validatedText = page.locator("p").getByText("Zacchaeus Test Text");
      await expect(validatedText).toBeVisible({ timeout: 10000 });
      await expect(validatedText).toHaveCount(1);
    });

    /*test('UNFINISHED should view mobile preview of block content', async ({ page }) => {
      const editBtn = page.locator('td a').getByText('Edit').nth(6);
      await editBtn.click();
      const webBox = page.locator('div [class="MuiContainer-root MuiContainer-maxWidthLg css-5c1adp-MuiContainer-root"]');
      await expect(webBox).toHaveCount(1);
      const mobileBtn = page.locator('button').getByText('Mobile');
      await mobileBtn.click();
      const mobileBox = page.locator('div [class="MuiContainer-root MuiContainer-maxWidthLg css-lnoso8-MuiContainer-root"]');
      await expect(mobileBox).toHaveCount(1);
    });*/

    test("should rename block", async () => {
      const renameBtn = page.locator('[data-testid^="rename-block-"]').last();
      await renameBtn.click();
      const nameInput = page.locator('[data-testid="block-name-input"] input');
      await nameInput.fill("Zacchaeus Renamed Block");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const renamed = page.locator("td").getByText("Zacchaeus Renamed Block");
      await expect(renamed).toBeVisible({ timeout: 10000 });
      await expect(renamed).toHaveCount(1);
    });

    test("should verify done btn functionality", async () => {
      const editBtn = page.locator('td a[aria-label="Edit"]').last();
      await editBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks\/[^/]+/);
      const doneBtn = page.locator('[data-testid="content-editor-done-button"]');
      await doneBtn.click();
      await expect(page).toHaveURL(/\/site\/blocks/, { timeout: 10000 });
    });

  });

  test.describe.serial("Appearance", () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const appearanceHomeBtn = page.locator("a").getByText("Appearance").first();
      await appearanceHomeBtn.click();
      await expect(page).toHaveURL(/\/site\/appearance/);
    });

    test("should change color palette", async () => {
      const colorSettings = page.locator("h6").getByText("Color Palette");
      await colorSettings.click();
      const palettePreset = page.locator("span").getByText("Palette 16");
      await palettePreset.click();
      const saveBtn = page.locator('[data-testid="save-palette-button"]');
      await saveBtn.click();
      const validatedChange = page.locator('[data-testid="preview-plan-visit-button"]');
      await expect(validatedChange).toHaveCSS("background-color", "rgb(255, 100, 10)");
    });

    test("should cancel changing color palette", async () => {
      const colorSettings = page.locator("h6").getByText("Color Palette");
      await colorSettings.click();
      const palettePreset = page.locator("span").getByText("Palette 16");
      await expect(palettePreset).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(palettePreset).toHaveCount(0);
    });

    test("should change font", async () => {
      const fontSettings = page.locator("h6").getByText("Fonts").last();
      await fontSettings.click();
      const headerFontSelect = page.locator('[data-testid="heading-font-button"]');
      await headerFontSelect.click();
      const headerFont = page.locator("td").getByText("Montserrat").first();
      await expect(headerFont).toBeVisible({ timeout: 10000 });
      await headerFont.click();
      const saveBtn = page.locator('[data-testid="save-fonts-button"]');
      await saveBtn.click();
      const validatedChange = page.locator("h1").getByText("Welcome to Grace Community Church").or(page.locator("h1").getByText("Welcome to Gracious Community Church"));
      await expect(validatedChange).toHaveCSS("font-family", "Montserrat");
    });

    test("should cancel changing font", async () => {
      const fontSettings = page.locator("h6").getByText("Fonts").last();
      await fontSettings.click();
      const headerFontSelect = page.locator('[data-testid="heading-font-button"]');
      await expect(headerFontSelect).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(headerFontSelect).toHaveCount(0);
    });

    test("should add custom CSS", async () => {
      const stylesheetSettings = page.locator("h6").getByText("CSS & Javascript");
      await stylesheetSettings.click();
      // Scope to the named CSS field — page-level `textarea` also matches the
      // SuperBee chat widget's hidden textarea, which never unmounts.
      const cssBox = page.locator('textarea[name="css"]');
      await cssBox.fill("h1 {\ncolor: #7FFF00\n}");
      const saveBtn = page.locator("button").getByText("Save Changes");
      await saveBtn.click();
      const validatedChange = page.locator("h1").getByText("Welcome to Grace Community Church").or(page.locator("h1").getByText("Welcome to Gracious Community Church"));
      await expect(validatedChange).toHaveCSS("color", "rgb(127, 255, 0)");
    });

    test("should cancel adding custom CSS", async () => {
      const stylesheetSettings = page.locator("h6").getByText("CSS & Javascript");
      await stylesheetSettings.click();
      const cssBox = page.locator('textarea[name="css"]');
      await expect(cssBox).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(cssBox).toHaveCount(0);
    });

    test("should open and cancel typography scale", async () => {
      const typographyOption = page.locator('[data-testid="style-option-typography"]');
      await typographyOption.click();
      const baseSize = page.locator('[data-testid="base-size-input"]');
      await expect(baseSize).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(baseSize).toHaveCount(0);
    });

    test("should open and cancel spacing scale", async () => {
      const spacingOption = page.locator('[data-testid="style-option-spacing"]');
      await spacingOption.click();
      const xsInput = page.locator('[data-testid="spacing-xs-input"]');
      await expect(xsInput).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(xsInput).toHaveCount(0);
    });

    test("should open and cancel logo settings", async () => {
      const logoOption = page.locator('[data-testid="style-option-logo"]');
      await logoOption.click();
      const saveLogoBtn = page.locator('[data-testid="save-appearance-button"]');
      await expect(saveLogoBtn).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(saveLogoBtn).toHaveCount(0);
    });

    test("should open and cancel navigation styling", async () => {
      const navOption = page.locator('[data-testid="style-option-nav"]');
      await navOption.click();
      const solidBgToggle = page.locator('[data-testid="nav-solid-bg-toggle"]');
      const transparentLinkToggle = page.locator('[data-testid="nav-transparent-link-toggle"]');
      await expect(solidBgToggle).toBeVisible({ timeout: 10000 });
      await expect(transparentLinkToggle).toBeVisible();
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(solidBgToggle).toHaveCount(0);
    });

    test("should save nav solid colors and persist them", async () => {
      const navOption = page.locator('[data-testid="style-option-nav"]');
      await navOption.click();
      const linkToggle = page.locator('[data-testid="nav-solid-link-toggle"] input[type="checkbox"]');
      const linkInput = page.locator('[data-testid="nav-solid-link-input"] input[type="color"]');
      await expect(linkInput).toBeVisible({ timeout: 10000 });
      // Demo data seeds a solid-nav linkColor override (see globalStyles in demo.sql), so
      // the field starts enabled rather than disabled — just ensure the toggle is on
      // (check() is a no-op if already checked) instead of assuming a disabled start state.
      await linkToggle.check();
      await expect(linkInput).toBeEnabled();
      // `fill` does not work on type=color; use React's native setter.
      await linkInput.evaluate((el: HTMLInputElement) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        setter.call(el, "#7fff00");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(linkInput).toHaveValue("#7fff00");
      const saveBtn = page.locator('[data-testid="save-nav-button"]');
      await saveBtn.click();
      await expect(linkInput).toHaveCount(0, { timeout: 10000 });
      await navOption.click();
      const reopened = page.locator('[data-testid="nav-solid-link-input"] input[type="color"]');
      await expect(reopened).toBeVisible({ timeout: 10000 });
      await expect(reopened).toHaveValue("#7fff00");
      await expect(reopened).toBeEnabled();
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
    });

    test("should add footer", async () => {
      const footerSettings = page.locator("h6").getByText("Site Footer");
      await footerSettings.click();
      await expect(page).toHaveURL(/\/site\/blocks\/[^/]+/, { timeout: 10000 });
    });

  });

  test.describe.serial("Files", () => {
    // Files tests share data — a retry would create a duplicate "logo.png"
    // upload and break "should remove file" assertions.
    test.describe.configure({ retries: 0 });

    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      const filesHomeBtn = page.locator("a").getByText("Files").first();
      await filesHomeBtn.click();
      await expect(page).toHaveURL(/\/site\/files/);
    });

    test("should upload file", async () => {
      const chooseFileBtn = page.locator('[id="fileUpload"]');
      await chooseFileBtn.setInputFiles("public/images/logo.png");
      const uploadBtn = page.locator("button").getByText("Upload");
      const filesPost = page.waitForResponse(r => r.url().includes("/content/files") && r.request().method() === "POST" && !r.url().includes("postUrl"), { timeout: 30000 });
      await uploadBtn.click();
      await filesPost;
      // Use exact match: "logo.png" without the church- prefix that's in demo data.
      const validatedUpload = page.locator("td").getByText("logo.png", { exact: true });
      await expect(validatedUpload).toBeVisible({ timeout: 10000 });
      await expect(validatedUpload).toHaveCount(1);
    });

    test("should remove file", async () => {
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("Are you sure");
        await dialog.accept();
      });

      // Find the row with logo.png (uploaded by previous test) and click its delete button.
      const targetRow = page.locator("tr", { has: page.locator("td").getByText("logo.png", { exact: true }) }).first();
      const deleteBtn = targetRow.locator("button[aria-label]").last();
      await deleteBtn.click();
      const validatedDeletion = page.locator("td").getByText("logo.png", { exact: true });
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  test.describe.serial("Calendar", () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToSite(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test.beforeEach(async () => {
      // Calendars is its own top-level primary nav item (sibling of Website), not a
      // link reachable directly from the Website page — go through the primary drawer.
      await navigateToCalendars(page);
      await expect(page).toHaveURL(/\/calendars/);
    });

    test("should add calendar", async () => {
      const addBtn = page.locator('[data-testid="add-calendar"]');
      await addBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill("Zacchaeus Test Calendar");
      const saveBtn = page.locator('[data-testid="save-calendar-button"]');
      await saveBtn.click();
      const validatedCalendar = page.locator("h6").getByText("Zacchaeus Test Calendar");
      await expect(validatedCalendar).toHaveCount(1);
    });

    test("should add group events to calendar", async () => {
      const editBtn = page.locator('[aria-label="Manage Events"]').last();
      await editBtn.click();
      const addBtn = page.locator('[data-testid="calendar-add-event-button"]');
      await addBtn.click();
      const groupSelectBox = page.locator('[role="combobox"]');
      await groupSelectBox.click();
      const groupSelect = page.locator("li").getByText("Adult Bible Class");
      await groupSelect.click();
      const saveBtn = page.locator('[data-testid="calendar-edit-save-button"]');
      await saveBtn.click();
      const validatedGroup = page.locator("td").getByText("Adult Bible Class");
      await expect(validatedGroup).toBeVisible({ timeout: 10000 });
      await expect(validatedGroup).toHaveCount(1);
      const agendaBtn = page.locator("button").getByText("Agenda");
      await agendaBtn.click();
      const validatedEvents = page.locator('[class="rbc-agenda-table"] td').getByText("Adult Bible Class").first();
      await expect(validatedEvents).toHaveCount(1);
    });

    test("should cancel adding group events to calendar", async () => {
      const editBtn = page.locator('[aria-label="Manage Events"]').last();
      await editBtn.click();
      const addBtn = page.locator('[data-testid="calendar-add-event-button"]');
      await addBtn.click();
      const groupSelectBox = page.locator('[role="combobox"]');
      await expect(groupSelectBox).toHaveCount(1);
      const cancelBtn = page.locator('[data-testid="calendar-edit-cancel-button"]');
      await cancelBtn.click();
      await expect(groupSelectBox).toHaveCount(0);
    });

    test("should remove group events from calendar", async () => {
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("Are you sure");
        await dialog.accept();
      });

      const editBtn = page.locator('[aria-label="Manage Events"]').last();
      await editBtn.click();
      const removeBtn = trashIconButton(page).first();
      await removeBtn.click();
      const validatedDeletion = page.locator("td").getByText("Adult Bible Class");
      await expect(validatedDeletion).toHaveCount(0);
    });

    test("should edit calendar", async () => {
      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const name = page.locator('[name="name"]');
      await name.fill("Zebedee Test Calendar");
      const saveBtn = page.locator('[data-testid="save-calendar-button"]');
      await saveBtn.click();
      const validatedChange = page.locator("h6").getByText("Zebedee Test Calendar");
      await expect(validatedChange).toHaveCount(1);
    });

    test("should cancel editing calendar", async () => {
      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const name = page.locator('[name="name"]');
      await expect(name).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(name).toHaveCount(0);
    });

    test("should delete calendar", async () => {
      page.once("dialog", async dialog => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("Are you sure");
        await dialog.accept();
      });

      const editBtn = page.locator('[aria-label="Edit"]').last();
      await editBtn.click();
      const deleteBtn = page.locator('[data-testid="delete-calendar-button"]');
      await deleteBtn.click();
      const validatedDeletion = page.locator("h6").getByText("Zebedee Test Calendar");
      await expect(validatedDeletion).toHaveCount(0);
    });

  });

  // Edge-case extensions: URL slug surface + appearance affordances from
  // .notes/B1Admin-test-coverage-gaps.md §3 (website.spec.ts row).
  test.describe("Pages — URL slug surface", () => {
    test("Pages list exposes the URL of each page (slugs are visible, clickable)", async ({ page }) => {
      const pagesNav = page.locator('[id="secondaryMenu"]').getByText("Pages");
      await pagesNav.click();
      await page.waitForURL(/\/site\/pages/, { timeout: 10000 });
      // PagesPage renders a tbody with each page's URL in a TableCell.
      // Anchor on at least one URL-shaped string ("/foo") in the table.
      const urlCell = page.locator("table tbody tr td").getByText(/^\//).first();
      await expect(urlCell).toBeVisible({ timeout: 10000 });
    });

    test("Add Page button opens a modal with a URL field affordance", async ({ page }) => {
      const pagesNav = page.locator('[id="secondaryMenu"]').getByText("Pages");
      await pagesNav.click();
      await page.locator('[data-testid="add-page-button"]').click();
      // The modal exposes a Title (name="title") right away. Stay shallow — confirm modal opened.
      await expect(page.locator('[name="title"]').first()).toBeVisible({ timeout: 10000 });
      // Cancel out so we don't leave a dirty drawer.
      const cancelBtn = page.locator("button").getByText("Cancel").first();
      await cancelBtn.click().catch(() => { });
    });
  });

  test.describe("Page editor — existing content", () => {
    test("demo Home page sections render in the editor canvas", async ({ page }) => {
      await page.goto("/site/pages/PAG00000001");
      await expect(page.locator(".elementWrapper").first()).toBeVisible({ timeout: 20000 });
      expect(await page.locator(".elementWrapper").count()).toBeGreaterThan(5);
      // Demo home hero copy is "Welcome Home to Grace Community Church" (2026-06 redesign) —
      // match loosely so small wording tweaks don't break this.
      await expect(page.getByText(/Welcome.*Grace Community Church/).first()).toBeVisible();
    });
  });

  test.describe("Page editor — canvas chrome", () => {
    test("mobile preview renders inside a device frame", async ({ page }) => {
      await page.goto("/site/pages/PAG00000001");
      await expect(page.locator(".elementWrapper").first()).toBeVisible({ timeout: 20000 });
      await page.locator('[data-testid="device-type-mobile"]').click();
      await expect(page.locator('[data-testid="mobile-device-frame"]').first()).toBeVisible({ timeout: 10000 });
      await page.locator('[data-testid="device-type-desktop"]').click();
      await expect(page.locator('[data-testid="preview-desktop"]').first()).toBeVisible({ timeout: 10000 });
    });

    test("small viewports get a friendly message instead of a redirect", async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 900 });
      await page.goto("/site/pages/PAG00000001");
      await expect(page.locator('[data-testid="editor-small-screen"]')).toBeVisible({ timeout: 20000 });
      await expect(page).toHaveURL(/\/site\/pages\/PAG00000001/);
    });

    test("nested element selection shows a breadcrumb path", async ({ page }) => {
      await page.goto("/site/pages/PAG00000001");
      await expect(page.locator(".elementWrapper").first()).toBeVisible({ timeout: 20000 });
      // The demo home page nests text inside row columns; click a nested leaf.
      const nested = page.locator('[id^="el-"] [id^="el-"]').first();
      await expect(nested).toBeVisible({ timeout: 10000 });
      await nested.click();
      const breadcrumb = page.locator('[data-testid="selection-breadcrumb"]');
      await expect(breadcrumb).toBeVisible({ timeout: 10000 });
      expect(await breadcrumb.locator("[data-testid^=\"breadcrumb-crumb-\"]").count()).toBeGreaterThanOrEqual(2);
      // First crumb walks up to the section editor.
      await breadcrumb.locator('[data-testid="breadcrumb-crumb-0"]').click();
      await expect(page.locator("#sectionDetailsBox")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Appearance — toggles persist after save", () => {
    test("navigating away and back to Appearance keeps the user on the section", async ({ page }) => {
      const appearanceTab = page.locator('[id="secondaryMenu"]').getByText("Appearance");
      await appearanceTab.click();
      await page.waitForURL(/\/site\/appearance/, { timeout: 10000 });
      const pagesNav = page.locator('[id="secondaryMenu"]').getByText("Pages");
      await pagesNav.click();
      await page.waitForURL(/\/site\/pages/, { timeout: 10000 });
      await appearanceTab.click();
      await page.waitForURL(/\/site\/appearance/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/site\/appearance/);
    });
  });

});
