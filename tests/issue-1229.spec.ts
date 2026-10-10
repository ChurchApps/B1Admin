import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { recoverFromViteError } from "./helpers/fixtures";

test.beforeEach(async ({ page }) => {
  await login(page);
});

// Issue #1229: workflow card notes never save (drawer linked the conversation via POST /tasks, which rejects cards).

test("a note posted on a workflow card is still there after reopening it", async ({ page }) => {
  const openCard = async () => {
    await page.goto("/serving/tasks/workflows/WFL00000001");
    await recoverFromViteError(page, page.locator('[data-testid="workflow-board"]'));
    await page.locator('[data-testid="workflow-card-TSK00000104"]').click();
    const drawer = page.locator('[data-testid="workflow-card-drawer"]');
    await drawer.waitFor({ state: "visible", timeout: 15000 });
    return drawer;
  };

  let drawer = await openCard();
  await drawer.getByPlaceholder("Type a message...").fill("Called James, has two kids");
  await drawer.locator("button").filter({ has: page.getByText("send", { exact: true }) }).click();
  await expect(drawer.getByPlaceholder("Type a message...")).toHaveValue("", { timeout: 10000 });

  drawer = await openCard();
  await expect(drawer.getByText("Called James, has two kids")).toBeVisible({ timeout: 10000 });
});
