import type { Page } from "@playwright/test";
import { loggedInTest, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { buildEmbedCode } from "../src/helpers/embedCode";
import { MAX_EMBED_DOMAINS, parseEmbedDomains } from "../src/helpers/embedDomains";

// "Embed on your own website": the allowed-websites field on the site pages screen (public setting
// embedDomains) and the embed code dialog for the giving form, a stand-alone form and a curated calendar.
// FRM00000004 (stand-alone), FRM00000001 (person form) and CAL00000004 are seeded in Api/tools/dbScripts.

const test = loggedInTest;

test.describe("Embed domain rules", () => {
  test("accepts plain hostnames and normalizes what people paste", () => {
    const result = parseEmbedDomains("https://www.GraceChurch.org/give, give.example.com:8443\nexample.net");
    expect(result.hosts).toEqual(["gracechurch.org", "give.example.com", "example.net"]);
    expect(result.rejected).toEqual([]);
  });

  test("rejects everything that could change the security header", () => {
    for (const entry of [
      "*", "*.example.com", "'self'", "https:", "example.com;script-src", "1.2.3.4", "localhost", "exa_mple.com", "user@example.com"
    ]) {
      const result = parseEmbedDomains(entry);
      expect(result.hosts, entry).toEqual([]);
      expect(result.rejected, entry).toHaveLength(1);
    }
  });

  test("keeps the first websites and reports the rest when the list is too long", () => {
    const names = Array.from({ length: MAX_EMBED_DOMAINS + 2 }, (_, i) => `church${i}.org`);
    const result = parseEmbedDomains(names.join("\n"));
    expect(result.hosts).toEqual(names.slice(0, MAX_EMBED_DOMAINS));
    expect(result.overLimit).toEqual(names.slice(MAX_EMBED_DOMAINS));
  });
});

test.describe("Embed code", () => {
  test("the giving snippet frames /embed/donate and allows wallet payments", () => {
    const code = buildEmbedCode("https://grace.b1.church", "giving", "Give to Grace Community Church");
    expect(code.split("\n")[0]).toBe('<iframe src="https://grace.b1.church/embed/donate" title="Give to Grace Community Church" loading="lazy" allow="payment" height="900" style="width:100%;border:0"></iframe>');
    expect(code).toContain('var origin = "https://grace.b1.church";');
    expect(code).toContain("event.origin !== origin");
    expect(code).toContain('event.data.type !== "b1-embed-height"');
    expect(code).toContain("frame.contentWindow === event.source");
    expect(code).not.toContain("innerHTML");
  });

  test("form and calendar snippets point at their embed routes and escape the name", () => {
    const form = buildEmbedCode("https://grace.b1.church", "form", 'Kids "VBS" <2026> & more', "FRM00000004");
    expect(form).toContain('src="https://grace.b1.church/embed/forms/FRM00000004"');
    expect(form).toContain('title="Kids &quot;VBS&quot; &lt;2026&gt; &amp; more"');
    expect(form).not.toContain("allow=");
    const calendar = buildEmbedCode("https://grace.b1.church", "calendar", "Main Church Calendar", "CAL00000004");
    expect(calendar).toContain('src="https://grace.b1.church/embed/calendar/CAL00000004"');
  });

  test("the script resizes only the frame that sent the message, and only for the B1 site", () => {
    const code = buildEmbedCode("https://grace.b1.church", "giving", "Give");
    const script = code.slice(code.indexOf("<script>") + 8, code.indexOf("</script>"));
    // Website editors often encode these characters inside pasted code.
    expect(script).not.toMatch(/[<>&]/);

    type Frame = { contentWindow: object; style: { height?: string } };
    type Message = { origin: string; data: unknown; source: object };
    const frames: Frame[] = [{ contentWindow: {}, style: {} }, { contentWindow: {}, style: {} }];
    const listeners: ((event: Message) => void)[] = [];
    const fakeWindow = { addEventListener: (_type: string, listener: (event: Message) => void) => { listeners.push(listener); } };
    const fakeDocument = { getElementsByTagName: () => frames };
    // Two snippets on one page register a single listener.
    new Function("window", "document", script)(fakeWindow, fakeDocument);
    new Function("window", "document", script)(fakeWindow, fakeDocument);
    expect(listeners).toHaveLength(1);
    const send = (origin: string, data: unknown, source: object) => listeners.forEach((listener) => listener({ origin, data, source }));

    send("https://evil.example", { type: "b1-embed-height", height: 500 }, frames[0].contentWindow);
    send("https://grace.b1.church", { type: "something-else", height: 500 }, frames[0].contentWindow);
    send("https://grace.b1.church", { type: "b1-embed-height", height: -5 }, frames[0].contentWindow);
    send("https://grace.b1.church", { type: "b1-embed-height", height: "tall" }, frames[0].contentWindow);
    send("https://grace.b1.church", null, frames[0].contentWindow);
    expect(frames.map((f) => f.style.height)).toEqual([undefined, undefined]);

    send("https://grace.b1.church", { type: "b1-embed-height", height: 812.4 }, frames[1].contentWindow);
    expect(frames.map((f) => f.style.height)).toEqual([undefined, "813px"]);
  });
});

test.describe.serial("Allowed websites and the giving embed code", () => {
  // The tests share the church's embedDomains setting; a retry would start from the wrong value.
  test.describe.configure({ retries: 0 });
  let page: Page;

  const settingsPost = (p: Page) => p.waitForResponse(r => /\/content\/settings$/.test(r.url()) && r.request().method() === "POST", { timeout: 15000 });
  const input = () => page.getByTestId("embed-domains-input");

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    page = await context.newPage();
    await login(page);
    await navigateToSite(page);
  });

  test.afterAll(async () => {
    // Leave the demo church with no allowed websites for every other spec.
    if (page && (await input().inputValue().catch(() => "")) !== "") {
      await input().fill("");
      const save = page.getByTestId("embed-domains-save");
      if (await save.isEnabled().catch(() => false)) {
        const saved = settingsPost(page);
        await save.click();
        await saved;
      }
    }
    await page?.context().close();
  });

  test("warns in the embed code dialog while no website is listed", async () => {
    await expect(input()).toHaveValue("", { timeout: 15000 });
    await page.getByTestId("giving-embed-code-button").click();
    await expect(page.getByTestId("embed-code-dialog")).toBeVisible();
    await expect(page.getByTestId("embed-code-no-domains")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("embed-code-domains-link").click();
    await expect(page.getByTestId("embed-code-dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/site\/pages#embed-domains$/);
    await expect(input()).toBeFocused();
  });

  test("shows rejected entries and saves only the valid websites as a public setting", async () => {
    await input().fill("https://www.Embed-Test-Church.org/give, bad_entry");
    await expect(page.getByTestId("embed-domains-rejected")).toContainText("bad_entry");
    const saved = settingsPost(page);
    await page.getByTestId("embed-domains-save").click();
    const body = (await saved).request().postDataJSON();
    expect(body[0]).toMatchObject({ keyName: "embedDomains", value: "embed-test-church.org" });
    expect([1, true]).toContain(body[0].public);
    await expect(page.getByTestId("embed-domains-saved")).toBeVisible();
    await expect(input()).toHaveValue("embed-test-church.org");
    await expect(page.getByTestId("embed-domains-rejected")).toHaveCount(0);
    await expect(page.getByTestId("embed-domains-save")).toBeDisabled();
  });

  test("keeps the allowed websites after reload", async () => {
    await page.reload();
    await expect(input()).toHaveValue("embed-test-church.org", { timeout: 15000 });
  });

  test("the giving embed code is ready to paste and copies to the clipboard", async () => {
    await page.getByTestId("giving-embed-code-button").click();
    const dialog = page.getByTestId("embed-code-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Giving form");
    const code = await page.getByTestId("embed-code-text").inputValue();
    expect(code).toMatch(/^<iframe src="https?:\/\/grace\.[^"/]+\/embed\/donate" title="Give to Grace Community Church" loading="lazy" allow="payment" height="900" style="width:100%;border:0"><\/iframe>\n<script>/);
    expect(code).toContain('event.data.type !== "b1-embed-height"');
    expect(code).not.toContain("innerHTML");
    // A website is listed now, so the notice is gone.
    await expect(page.getByTestId("embed-code-no-domains")).toHaveCount(0);
    await page.getByTestId("embed-code-copy").click();
    await expect(page.getByTestId("embed-code-copied")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await page.getByTestId("embed-code-close").click();
    await expect(dialog).toBeHidden();
  });

  test("clearing the list turns embedding off again", async () => {
    await input().fill("");
    const saved = settingsPost(page);
    await page.getByTestId("embed-domains-save").click();
    const body = (await saved).request().postDataJSON();
    expect(body[0]).toMatchObject({ keyName: "embedDomains", value: "" });
    await expect(input()).toHaveValue("");
  });
});

test.describe("Embed code entry points", () => {
  test("a stand-alone form's page offers its embed code", async ({ page }) => {
    await page.goto("/forms/FRM00000004");
    await page.getByTestId("form-embed-code-button").click();
    await expect(page.getByTestId("embed-code-dialog")).toContainText("VBS Registration (Public)");
    const code = await page.getByTestId("embed-code-text").inputValue();
    expect(code).toMatch(/^<iframe src="https?:\/\/grace\.[^"/]+\/embed\/forms\/FRM00000004" title="VBS Registration \(Public\)" loading="lazy" height="800" /);
  });

  test("a person form has no embed code", async ({ page }) => {
    await page.goto("/forms/FRM00000001");
    await expect(page.getByTestId("form-identity")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("form-embed-code-button")).toHaveCount(0);
  });

  test("a curated calendar's page offers its embed code", async ({ page }) => {
    await page.goto("/calendars/CAL00000004");
    await page.getByTestId("calendar-embed-code-button").click();
    await expect(page.getByTestId("embed-code-dialog")).toContainText("Main Church Calendar");
    const code = await page.getByTestId("embed-code-text").inputValue();
    expect(code).toMatch(/^<iframe src="https?:\/\/grace\.[^"/]+\/embed\/calendar\/CAL00000004" title="Main Church Calendar" loading="lazy" allow="clipboard-write" height="720" /);
  });
});
