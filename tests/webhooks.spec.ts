import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateToDeveloper } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or
// Zebedee entered anywhere, it is a result of these tests.
const WEBHOOK_NAME = "Zacchaeus Test Webhook";
const WEBHOOK_NAME_EDITED = "Zebedee Test Webhook";
const WEBHOOK_URL = "https://example.com/hooks/playwright";

// Webhooks lives as a sub-tab of the Developer section on the Settings landing.
const openWebhooksPage = async (page: Page) => {
  await navigateToDeveloper(page);
  await page.getByRole("tab", { name: "Webhooks", exact: true }).click();
  await expect(page.getByRole("button", { name: "New Webhook" })).toBeVisible({ timeout: 15000 });
};

test.describe.serial("Webhooks", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await openWebhooksPage(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  // Re-runs on a non-reset local DB can leave test webhooks behind; clear them
  // so the create assertion starts from a known state. In CI the DB is fresh.
  test("cleans up leftover test webhooks", async () => {
    for (let i = 0; i < 10; i++) {
      const row = page.locator("tr").filter({ hasText: /Zacchaeus Test Webhook|Zebedee Test Webhook/ }).first();
      if (await row.count() === 0) break;
      await row.getByRole("button", { name: "Delete" }).click();
      await confirmDelete(page);
      await expect(row).toHaveCount(0, { timeout: 10000 }).catch(() => { });
    }
  });

  test("creates a webhook and reveals the signing secret once", async () => {
    await page.getByRole("button", { name: "New Webhook" }).click();

    await page.getByLabel("Name", { exact: true }).fill(WEBHOOK_NAME);
    await page.getByLabel("Payload URL", { exact: true }).fill(WEBHOOK_URL);

    // Event catalog loads async — wait for the checkbox before toggling it.
    const personCreated = page.getByLabel("person.created");
    await expect(personCreated).toBeVisible({ timeout: 10000 });
    await personCreated.check();

    const savePost = page.waitForResponse(
      (r) => r.url().includes("/webhooks") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.locator("button").getByText("Save").click();
    await savePost;

    // Create returns the secret exactly once, shown in a dialog.
    const secretDialog = page.locator('div[role="dialog"]:has-text("Signing Secret")');
    await expect(secretDialog).toBeVisible({ timeout: 10000 });
    await secretDialog.getByRole("button", { name: "Close" }).click();
    await expect(secretDialog).toHaveCount(0, { timeout: 10000 });

    const row = page.locator("tr").filter({ hasText: WEBHOOK_NAME });
    await expect(row).toHaveCount(1, { timeout: 10000 });
  });

  test("rejects a webhook with no events selected", async () => {
    await page.getByRole("button", { name: "New Webhook" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Zacchaeus Invalid Webhook");
    await page.getByLabel("Payload URL", { exact: true }).fill(WEBHOOK_URL);
    await page.locator("button").getByText("Save").click();
    // Client-side validation blocks the save and surfaces an error message.
    await expect(page.getByText("Select at least one event")).toBeVisible({ timeout: 5000 });
    await page.locator("button").getByText("Cancel").click();
  });

  test("edits a webhook", async () => {
    await page.locator("tr").filter({ hasText: WEBHOOK_NAME }).first().getByText(WEBHOOK_NAME).click();
    const nameField = page.getByLabel("Name", { exact: true });
    await expect(nameField).toHaveValue(WEBHOOK_NAME, { timeout: 10000 });
    await nameField.fill(WEBHOOK_NAME_EDITED);

    const savePost = page.waitForResponse(
      (r) => r.url().includes("/webhooks") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.locator("button").getByText("Save").click();
    await savePost;

    // Updates do not return a secret, so no dialog — we land back on the list.
    await expect(page.locator("tr").filter({ hasText: WEBHOOK_NAME_EDITED })).toHaveCount(1, { timeout: 10000 });
  });

  test("sends a test event", async () => {
    await page.locator("tr").filter({ hasText: WEBHOOK_NAME_EDITED }).first().getByText(WEBHOOK_NAME_EDITED).click();
    const testButton = page.getByRole("button", { name: "Send Test Event" });
    await expect(testButton).toBeVisible({ timeout: 10000 });

    // The test route builds a synthetic payload and delivers it synchronously.
    const testPost = page.waitForResponse(
      (r) => /\/webhooks\/[^/]+\/test$/.test(r.url()) && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await testButton.click();
    await testPost;

    // The delivery log refreshes and shows the synthetic delivery for the
    // webhook's first subscribed event (person.created).
    await expect(page.locator("tr").filter({ hasText: "person.created" }).first()).toBeVisible({ timeout: 10000 });

    // Return to the list so the next test starts from the webhook list view.
    await page.locator("button").getByText("Cancel").click();
    await expect(page.getByRole("button", { name: "New Webhook" })).toBeVisible({ timeout: 10000 });
  });

  test("delivers Slack-formatted payloads for a Slack connector", async () => {
    await page.locator("tr").filter({ hasText: WEBHOOK_NAME_EDITED }).first().getByText(WEBHOOK_NAME_EDITED).click();

    // Switch the connector type to Slack — a single MUI Select on the editor.
    const connectorSelect = page.getByRole("combobox");
    await expect(connectorSelect).toBeVisible({ timeout: 10000 });
    await connectorSelect.click();
    await page.getByRole("option", { name: "Slack", exact: true }).click();

    const savePost = page.waitForResponse(
      (r) => r.url().includes("/webhooks") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.locator("button").getByText("Save").click();
    await savePost;

    // Reopen and confirm the connector type persisted.
    await page.locator("tr").filter({ hasText: WEBHOOK_NAME_EDITED }).first().getByText(WEBHOOK_NAME_EDITED).click();
    await expect(page.getByRole("combobox")).toHaveText("Slack", { timeout: 10000 });

    // A test delivery for a Slack connector carries a Slack {text} message,
    // not the raw {event,...} envelope — the test route returns the delivery.
    const testPost = page.waitForResponse(
      (r) => /\/webhooks\/[^/]+\/test$/.test(r.url()) && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.getByRole("button", { name: "Send Test Event" }).click();
    const delivery = await (await testPost).json();
    expect(delivery.payload).toContain('"text"');
    expect(delivery.payload).not.toContain('"occurredAt"');

    await page.locator("button").getByText("Cancel").click();
    await expect(page.getByRole("button", { name: "New Webhook" })).toBeVisible({ timeout: 10000 });
  });

  test("shows Mailchimp credential fields instead of a URL", async () => {
    await page.getByRole("button", { name: "New Webhook" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Zacchaeus Mailchimp Webhook");

    const connectorSelect = page.getByRole("combobox");
    await connectorSelect.click();
    await page.getByRole("option", { name: "Mailchimp", exact: true }).click();

    await expect(page.getByLabel("Mailchimp API Key", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel("Audience ID", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Payload URL", { exact: true })).toHaveCount(0);

    // Catalog collapses to sync-capable events, pre-selected; unmapped ones disappear.
    await expect(page.getByLabel("person.created")).toBeChecked({ timeout: 10000 });
    await expect(page.getByLabel("donation.created")).toHaveCount(0);

    await page.locator("button").getByText("Cancel").click();
    await expect(page.getByRole("button", { name: "New Webhook" })).toBeVisible({ timeout: 10000 });
  });

  test("surfaces Mailchimp credential validation from the API", async () => {
    await page.getByRole("button", { name: "New Webhook" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Zacchaeus Mailchimp Webhook");

    const connectorSelect = page.getByRole("combobox");
    await connectorSelect.click();
    await page.getByRole("option", { name: "Mailchimp", exact: true }).click();

    const apiKeyField = page.getByLabel("Mailchimp API Key", { exact: true });
    await expect(apiKeyField).toBeVisible({ timeout: 10000 });

    // Malformed key (no -dcN suffix) is rejected server-side before touching Mailchimp.
    await apiKeyField.fill("bogus-key");
    await page.getByLabel("Audience ID", { exact: true }).fill("abc123");
    const savePost = page.waitForResponse(
      (r) => r.url().includes("/webhooks") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.locator("button").getByText("Save").click();
    expect((await savePost).status()).toBe(400);
    await expect(page.getByText(/data center suffix/)).toBeVisible({ timeout: 10000 });

    // No webhook row was created.
    await page.locator("button").getByText("Cancel").click();
    await expect(page.getByRole("button", { name: "New Webhook" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tr").filter({ hasText: "Zacchaeus Mailchimp Webhook" })).toHaveCount(0);
  });

  test("deletes a webhook", async () => {
    const row = page.locator("tr").filter({ hasText: WEBHOOK_NAME_EDITED }).first();
    await row.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page.locator("tr").filter({ hasText: WEBHOOK_NAME_EDITED })).toHaveCount(0, { timeout: 10000 });
  });
});
