import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Digital signage feed: a plan type acts like a lessons.church classroom — the feed url
// resolves the current plan and emits the SignPresenter external-playlist format.
test.describe("Digital Signage feed", () => {
  test("plan type page exposes a copyable feed url", async ({ page }) => {
    await page.goto("/serving/planTypes/PLT00000001");
    await page.getByTestId("signage-feed-button").click();

    const urlInput = page.getByTestId("signage-feed-url");
    await expect(urlInput).toBeVisible({ timeout: 15000 });
    const feedUrl = await urlInput.inputValue();
    expect(feedUrl).toMatch(/\/doing\/planFeed\/signage\/PLT00000001$/);

    await page.getByTestId("close-signage-feed").click();
    await expect(urlInput).toHaveCount(0);
  });

  test("feed endpoint emits SignPresenter-compatible messages for the current plan", async ({ page }) => {
    // Demo seed: PLT00000001's current plan is PLA00000003 (tomorrow), whose lessonSection
    // references section Xc5mhXN_RED of venue keYYf8Z8ZD1 on api.lessons.church.
    const resp = await page.request.get("http://localhost:8084/doing/planFeed/signage/PLT00000001");
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();

    expect(Array.isArray(data.messages)).toBeTruthy();
    expect(data.messages.length).toBeGreaterThan(0);
    for (const message of data.messages) {
      expect(typeof message.name).toBe("string");
      expect(message.files.length).toBeGreaterThan(0);
      for (const file of message.files) {
        expect(file.url).toMatch(/^https?:\/\//);
        expect(typeof file.seconds).toBe("number");
        expect(typeof file.loopVideo).toBe("boolean");
      }
    }
  });

  test("feed endpoint returns empty messages for an unknown plan type", async ({ page }) => {
    const resp = await page.request.get("http://localhost:8084/doing/planFeed/signage/NOSUCHTYPE");
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.messages).toEqual([]);
  });
});
