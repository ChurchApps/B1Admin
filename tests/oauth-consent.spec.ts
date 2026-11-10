import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The /oauth consent page an AI assistant (claude.ai, ChatGPT) or connected app sends people to.
const API = process.env.API_BASE || "http://localhost:8084";
const CALLBACK = "https://claude.ai/api/mcp/auth_callback";

const registerClient = async (request: import("@playwright/test").APIRequestContext) => {
  const res = await request.post(`${API}/membership/oauth/register`, { data: { client_name: "Consent Test", redirect_uris: [CALLBACK], token_endpoint_auth_method: "none" } });
  expect(res.status()).toBe(201);
  return (await res.json()).client_id as string;
};

const consentUrl = (clientId: string, scope?: string) => {
  const q = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: CALLBACK, state: "st8", code_challenge: "abc", code_challenge_method: "S256" });
  if (scope) q.set("scope", scope);
  return "/oauth?" + q.toString();
};

test.describe("OAuth consent page", () => {
  test("lists the app, church, scopes and return host, and Deny sends access_denied back", async ({ page }) => {
    const clientId = await registerClient(page.request);
    await page.route("https://claude.ai/**", (route) => route.fulfill({ contentType: "text/html", body: "<p>back</p>" }));
    await page.goto(consentUrl(clientId));

    await expect(page.getByRole("heading", { name: "Consent Test" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Grace Community Church")).toBeVisible();
    await expect(page.getByTestId("oauth-scopes")).toHaveText("Everything your B1 account can access");
    await expect(page.getByTestId("oauth-redirect-host")).toContainText("claude.ai");

    await page.getByTestId("oauth-deny-button").click();
    await page.waitForURL((url) => url.href.startsWith(CALLBACK));
    const back = new URL(page.url());
    expect(back.searchParams.get("error")).toBe("access_denied");
    expect(back.searchParams.get("state")).toBe("st8");
  });

  test("fits a phone screen without sideways scrolling", async ({ page }) => {
    const clientId = await registerClient(page.request);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(consentUrl(clientId, "people:read"));
    await expect(page.getByTestId("oauth-scopes")).toHaveText("View people, households and contact details", { timeout: 15000 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const allow = await page.getByTestId("oauth-allow-button").boundingBox();
    expect(allow).not.toBeNull();
    expect(allow!.x + allow!.width).toBeLessThanOrEqual(390);
  });
});
