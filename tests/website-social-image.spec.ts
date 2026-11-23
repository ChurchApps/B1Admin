import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateTo } from "./helpers/navigation";

// A full-bleed 1200x630 Social Media Image must be saved as uploaded, not shrunk onto a white frame.
const WIDTH = 1200;
const HEIGHT = 630;

const solidPng = async (page: Page) => {
  const dataUrl = await page.evaluate(({ w, h }) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgb(200, 0, 0)";
    ctx.fillRect(0, 0, w, h);
    return canvas.toDataURL("image/png");
  }, { w: WIDTH, h: HEIGHT });
  return Buffer.from(dataUrl.split(",")[1], "base64");
};

const inspect = (page: Page, dataUrl: string) => page.evaluate(async (src) => {
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = src; });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const at = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
  const w = img.naturalWidth, h = img.naturalHeight;
  return { width: w, height: h, pixels: [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1), at(5, Math.floor(h / 2)), at(Math.floor(w / 2), 5)] };
}, dataUrl);

test("social media image is saved edge to edge without a white border", async ({ page }) => {
  await login(page);
  await navigateTo(page, "appearance");
  await page.locator('[data-testid="style-option-logo"]').click();
  await expect(page.locator('[data-testid="save-appearance-button"]')).toBeVisible({ timeout: 10000 });

  const png = await solidPng(page);
  const cardImage = page.locator('[data-testid="ogImage-button"]').locator("xpath=../..").locator('img[src^="data:image"]');

  // The cropper hands back its image after a short debounce; an Update before that stages nothing.
  await expect(async () => {
    await page.locator('[data-testid="ogImage-button"]').click({ timeout: 2000 });
    const editor = page.locator("#cropperBox");
    await editor.locator("#fileUpload").setInputFiles({ name: "social.png", mimeType: "image/png", buffer: png });
    await expect(editor.locator(".cropper-crop-box")).toBeVisible({ timeout: 5000 });
    await editor.getByRole("button", { name: "Update" }).click({ timeout: 2000 });
    await expect(cardImage).toHaveCount(1, { timeout: 3000 });
  }).toPass({ timeout: 30000 });

  // Keep the demo church's settings untouched: capture the save and answer it locally.
  let posted: { keyName: string; value: string }[] = [];
  await page.route("**/membership/settings", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posted = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(posted) });
  });
  await page.locator('[data-testid="save-appearance-button"]').click();
  await expect.poll(() => posted.length, { timeout: 10000 }).toBeGreaterThan(0);

  const og = posted.find((s) => s.keyName === "ogImage");
  expect(og?.value, "ogImage was posted").toMatch(/^data:image/);
  const result = await inspect(page, og!.value);
  expect({ width: result.width, height: result.height }).toEqual({ width: WIDTH, height: HEIGHT });
  for (const [r, g, b] of result.pixels) {
    expect(r, "edge pixel should be the uploaded red, not white").toBeGreaterThan(150);
    expect(g).toBeLessThan(60);
    expect(b).toBeLessThan(60);
  }
});
