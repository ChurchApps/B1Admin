import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Only the local Vite fixture and its modules may load; no real account/API traffic.
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.goto("/tests/fixtures/assignment-confirmation/");
});

test("edits serving email/SMS actions without generic message shortcuts", async ({ page }) => {
  await expect(page.getByTestId("workflow-step-actions")).toBeVisible();
  await page.getByTestId("action-type-0").click();
  await expect(page.getByRole("option", { name: "Send serving request", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Send text", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Send email", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByTestId("action-serving-message-0").locator("textarea").first().fill("Please confirm {{positionName}} for {{serviceDate}}.");
  await page.getByTestId("action-save-0").click();
  await expect.poll(() => page.evaluate(() => (window as any).confirmationPreview.calls.length)).toBe(1);
  const call = await page.evaluate(() => (window as any).confirmationPreview.calls[0]);
  expect(call.path).toBe("/workflowStepActions"); expect(JSON.parse(call.body[0].config).message).toContain("{{positionName}}");
  await expect(page.getByText(/No texting provider is set up/i)).toBeVisible();
  await page.screenshot({ path: "test-results/assignment-confirmation-actions.png", fullPage: true });
});

test("selects a confirmation workflow in the real plan editor", async ({ page }) => {
  await page.getByTestId("preview-plan").click();
  await page.getByTestId("plan-confirmation-workflow").click();
  await expect(page.getByRole("option", { name: "Serving Assignment Confirmation", exact: true })).toBeVisible();
  await page.getByRole("option", { name: "Serving Assignment Confirmation", exact: true }).click();
  await expect(page.getByTestId("plan-confirmation-workflow")).toContainText("Serving Assignment Confirmation");
});

test("issues a workflow request through the plan command and shows its assignment context/history", async ({ page }) => {
  await page.getByTestId("preview-issue").click();
  await page.getByRole("button", { name: /notify/i }).click();
  await expect(page.getByTestId("preview-issued")).toBeVisible();
  const paths = await page.evaluate(() => (window as any).confirmationPreview.calls.map((c: any) => c.path));
  expect(paths).toEqual(["/plans/plan1/issueRequests"]);
  await page.getByTestId("preview-card").click();
  await expect(page.getByTestId("card-serving-request")).toContainText("Greeter");
  await expect(page.getByTestId("card-complete-button")).toHaveText("Record follow-up done");
  await expect(page.getByTestId("card-history")).toContainText("Text: blocked (no_provider)");
  await expect(page.getByRole("link", { name: "Sample Sunday Service", exact: true })).toHaveAttribute("href", "/serving/plans/plan1");
  await expect.poll(async () => Math.round((await page.locator(".MuiDrawer-paper").boundingBox())!.x)).toBe(860);
  await page.screenshot({ path: "test-results/assignment-confirmation-card.png", fullPage: true });
});
