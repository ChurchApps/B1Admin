import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateTo } from "./helpers/navigation";

// Issue #1432: the chat open chip ignored Start Video Early, while the Stream page counts Minutes Before back from when the video starts.

test("chat open chip counts back from the video start", async ({ page }) => {
  await navigateTo(page, "liveStreamTimes");
  await page.locator('[data-testid="add-service-button"]').click();

  const chatBefore = page.locator('[name="chatBefore"]');
  await expect(chatBefore).toBeVisible({ timeout: 10000 });
  const chatChip = page.locator(".MuiTextField-root", { has: chatBefore });

  // A new service is at 9:00 AM with both values at 10.
  await expect(chatBefore).toHaveValue("10");
  await expect(page.locator('[name="earlyStart"]')).toHaveValue("10");
  await expect(chatChip).toContainText("8:40 AM");

  await page.locator('[name="earlyStart"]').fill("");
  await expect(chatChip).toContainText("8:50 AM");
});
