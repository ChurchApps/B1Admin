import { test, expect, type Page } from "@playwright/test";
import crypto from "crypto";
import { login } from "./helpers/auth";
import { navigateToDeveloper } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

const KEY_NAME = "Barnabas Test Key";

const openDeveloperPage = async (page: Page) => {
  await navigateToDeveloper(page);
  await expect(page.getByRole("button", { name: "New API Key" })).toBeVisible({ timeout: 15000 });
};

test.describe.serial("Developer Portal", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await openDeveloperPage(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  // Cleanup leftover keys from prior test runs on non-reset DB.
  test("cleans up leftover test keys", async () => {
    for (let i = 0; i < 10; i++) {
      const row = page.locator("tr").filter({ hasText: KEY_NAME }).first();
      if (await row.count() === 0) break;
      await row.getByRole("button", { name: "Delete" }).click();
      await confirmDelete(page);
      await expect(row).toHaveCount(0, { timeout: 10000 }).catch(() => { });
    }
  });

  test("creates an API key and reveals the raw key once", async () => {
    await page.getByRole("button", { name: "New API Key" }).click();

    await page.getByLabel("Name", { exact: true }).fill(KEY_NAME);

    // Scope catalog loads async — wait for the checkbox before toggling it.
    const scope = page.getByLabel("people:read");
    await expect(scope).toBeVisible({ timeout: 10000 });
    await scope.check();

    const savePost = page.waitForResponse(
      (r) => r.url().includes("/apiKeys") && r.request().method() === "POST",
      { timeout: 15000 }
    );
    await page.locator("button").getByText("Save").click();
    await savePost;

    const keyDialog = page.locator('div[role="dialog"]:has-text("API Key")');
    await expect(keyDialog).toBeVisible({ timeout: 10000 });
    expect(await keyDialog.locator("input").inputValue()).toMatch(/^cak_/);
    await keyDialog.getByRole("button", { name: "Close" }).click();
    await expect(keyDialog).toHaveCount(0, { timeout: 10000 });

    await expect(page.locator("tr").filter({ hasText: KEY_NAME })).toHaveCount(1, { timeout: 10000 });
  });

  test("rejects an API key with no scopes selected", async () => {
    await page.getByRole("button", { name: "New API Key" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Barnabas Invalid Key");
    await page.locator("button").getByText("Save").click();
    // Client-side validation blocks the save and surfaces an error message.
    await expect(page.getByText("Select at least one scope")).toBeVisible({ timeout: 5000 });
    await page.locator("button").getByText("Cancel").click();
  });

  test("shows the Connected Apps section", async () => {
    await page.getByRole("tab", { name: "Connected Apps" }).click();
    await expect(page.getByRole("heading", { name: "Connected Apps" })).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "API Keys" }).click();
  });

  test("deletes the API key", async () => {
    const row = page.locator("tr").filter({ hasText: KEY_NAME }).first();
    await row.getByRole("button", { name: "Delete" }).click();
    await confirmDelete(page);
    await expect(page.locator("tr").filter({ hasText: KEY_NAME })).toHaveCount(0, { timeout: 10000 });
  });
});

// claude.ai / ChatGPT custom connectors: discover the B1 sign-in, register, get consent here, exchange with PKCE.
test.describe("AI assistant sign-in (MCP connector)", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const CALLBACK = "https://claude.ai/api/mcp/auth_callback";
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");

  test("connects claude.ai to the MCP server with a B1 login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    try {
      const unauthorized = await page.request.post(`${API}/mcp`, { data: {}, failOnStatusCode: false });
      expect(unauthorized.status()).toBe(401);
      expect(unauthorized.headers()["www-authenticate"]).toContain("/.well-known/oauth-protected-resource");

      const resource = await (await page.request.get(`${API}/.well-known/oauth-protected-resource`)).json();
      const server = await (await page.request.get(`${resource.authorization_servers[0]}/.well-known/oauth-authorization-server`)).json();
      expect(server.code_challenge_methods_supported).toContain("S256");

      const registration = await page.request.post(server.registration_endpoint, { data: { client_name: "Claude", redirect_uris: [CALLBACK], token_endpoint_auth_method: "none" } });
      expect(registration.status()).toBe(201);
      const { client_id: clientId } = await registration.json();

      await page.route("https://claude.ai/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>connected</p>" }));
      await login(page);
      const query = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: CALLBACK, scope: "people:read donations:read", state: "st8", code_challenge: challenge, code_challenge_method: "S256", resource: resource.resource });
      await page.goto(`/oauth?${query.toString()}`);

      await expect(page.getByRole("heading", { name: "Claude" })).toBeVisible({ timeout: 15000 });
      const scopes = page.getByTestId("oauth-scopes");
      await expect(scopes.getByText("View people, households and contact details")).toBeVisible();
      await expect(scopes.getByText("View giving records")).toBeVisible();
      await expect(page.getByTestId("oauth-redirect-host")).toContainText("claude.ai");
      await expect(page.getByTestId("oauth-self-registered")).toContainText("Connected Apps");

      await page.getByTestId("oauth-allow-button").click();
      await page.waitForURL((url) => url.href.startsWith(CALLBACK), { timeout: 15000 });
      const returned = new URL(page.url());
      expect(returned.searchParams.get("state")).toBe("st8");
      const code = returned.searchParams.get("code");
      expect(code).toBeTruthy();

      const tokenRes = await page.request.post(server.token_endpoint, { form: { grant_type: "authorization_code", code: code!, client_id: clientId, redirect_uri: CALLBACK, code_verifier: verifier, resource: resource.resource } });
      expect(tokenRes.status()).toBe(200);
      const token = await tokenRes.json();
      expect(token.access_token).toBeTruthy();
      expect(token.scope).toBe("people:read donations:read");

      const mcp = await page.request.post(`${API}/mcp`, {
        headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json, text/event-stream" },
        data: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "playwright", version: "1" } } }
      });
      expect(mcp.status()).toBe(200);
      expect((await mcp.json()).result?.serverInfo).toBeTruthy();
    } finally {
      await context.close();
    }
  });
});
