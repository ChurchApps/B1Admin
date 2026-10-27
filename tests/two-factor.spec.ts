import crypto from "crypto";
import { test, expect, type Page } from "@playwright/test";

// Uses its own seeded account so specs signing in as demo/tester never meet a code prompt.
const EMAIL = "twofactor@b1.church";

const totp = (secret: string, offsetSteps = 0) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = secret.split("").map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
};

const signIn = async (page: Page) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 30000 });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');
};

const waitForApp = async (page: Page) => {
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {})
  ]);
  if (await churchDialog.isVisible().catch(() => false)) await churchDialog.locator("h3").first().click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
};

test.describe("Two-factor sign-in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("turn on with an authenticator code, sign in with a code, then turn off", async ({ page }) => {
    await signIn(page);
    await waitForApp(page);

    await page.goto("/profile");
    await page.getByTestId("mfa-enable").click();
    const secret = (await page.getByTestId("mfa-secret").textContent())!.trim();
    await page.getByTestId("mfa-code").locator("input").fill(totp(secret));
    await page.getByRole("button", { name: "Verify" }).click();
    const backupCodes = (await page.getByTestId("mfa-backup-codes").textContent())!.split("\n").filter(Boolean);
    expect(backupCodes).toHaveLength(10);
    await page.getByRole("button", { name: "I saved them" }).click();
    await expect(page.getByTestId("mfa-disable")).toBeVisible();

    await page.context().clearCookies();
    await signIn(page);
    await expect(page.locator("#mfa-code")).toBeVisible({ timeout: 15000 });
    await page.fill("#mfa-code", "000000");
    await page.getByRole("button", { name: "Verify Code" }).click();
    await expect(page.getByText("That code didn't work")).toBeVisible();
    // The setup code already spent this time step, so sign in with the next one (still inside the drift window).
    await page.fill("#mfa-code", totp(secret, 1));
    await page.getByRole("button", { name: "Verify Code" }).click();
    await waitForApp(page);

    await page.goto("/profile");
    await page.getByTestId("mfa-disable").click();
    await page.getByTestId("mfa-code").locator("input").fill(backupCodes[0]);
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByTestId("mfa-enable")).toBeVisible();
  });
});
