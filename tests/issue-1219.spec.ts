import { peopleTest as test, expect } from "./helpers/test-fixtures";

// Issue #1219: when AskApi fails upstream (e.g. OpenAI out of credits), Express answers with its
// default HTML error page. AISearch put that body straight into ErrorMessages, so the stack trace
// and server paths were shown to the user. AskApi is not run locally, so it is mocked here.
const HTML_ERROR = "<!DOCTYPE html><html lang=\"en\"><head><title>Error</title></head><body><pre>Error: 429 You exceeded your current quota<br> &nbsp; &nbsp;at QueryController.people (/var/task/dist/src/controllers/QueryController.js:37:23)</pre></body></html>";

test.describe("issue-1219 AI Search upstream failure", () => {
  test("shows a friendly message instead of the raw HTML error page", async ({ page }) => {
    await page.route("**/query/people", (route) => {
      const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      return route.fulfill({ status: 500, headers: cors, contentType: "text/html; charset=utf-8", body: HTML_ERROR });
    });

    await page.getByPlaceholder("Show me men over 30 with birthdays in July").fill("Show me men over 30");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("alert").filter({ hasText: "/var/task" })).toHaveCount(0);
    await expect(page.getByRole("alert").filter({ hasText: "AI Search is temporarily unavailable" })).toBeVisible();
  });
});
