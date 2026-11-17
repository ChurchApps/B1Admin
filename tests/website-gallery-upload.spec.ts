import { request } from "@playwright/test";
import { groupsTest as test, expect } from "./helpers/test-fixtures";
import { openSeedGroup } from "./helpers/fixtures";

// Self-hosted installs keep files on disk (FILE_STORE=disk, as the local demo Api does), where there
// is no presigned S3 slot. Uploading through the gallery dialog must still land the image.
// Group photos are 16:9, which the gallery files under "1.78".
const FOLDER = "1.78";

async function galleryApi() {
  const apiBase = process.env.API_BASE || "http://localhost:8084";
  const ctx = await request.newContext();
  const login = await (await ctx.post(`${apiBase}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const jwt = login.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
  const headers = { Authorization: "Bearer " + jwt };
  return {
    list: async (): Promise<string[]> => (await (await ctx.get(`${apiBase}/content/gallery/${FOLDER}`, { headers })).json()).images || [],
    remove: async (img: string) => { await ctx.delete(`${apiBase}/content/gallery/${FOLDER}/${img.split("/").pop()}`, { headers }); },
    dispose: () => ctx.dispose()
  };
}

test("uploads a group photo through the gallery on disk storage", async ({ page }) => {
  const api = await galleryApi();
  const before = await api.list();
  try {
    await openSeedGroup(page);
    await page.getByTestId("edit-group-button").click();
    await page.getByTestId("change-photo-button").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Upload" }).click();
    await dialog.locator("#fileUpload").setInputFiles("public/images/logo.png");
    await expect(dialog.locator(".cropper-container")).toBeVisible({ timeout: 10000 });
    // The cropper hands back its image after a short debounce; Update before that is a no-op.
    await expect(async () => {
      const requested = page.waitForRequest((r) => r.url().includes("/content/gallery/requestUpload"), { timeout: 1000 });
      await dialog.locator("#cropperBox").getByRole("button", { name: "Update" }).click({ timeout: 1000 });
      await requested;
    }).toPass({ timeout: 15000 });

    await expect(dialog.getByRole("tab", { name: "Gallery" })).toHaveAttribute("aria-selected", "true", { timeout: 15000 });
    await expect(page.getByText(/upload failed/i)).toHaveCount(0);
    await expect.poll(async () => (await api.list()).length, { timeout: 15000 }).toBe(before.length + 1);
    const added = (await api.list()).find((img) => !before.includes(img))!;
    const tile = dialog.locator(`img[src$="${added}"]`);
    await expect(tile).toBeVisible({ timeout: 15000 });
    await expect.poll(() => tile.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  } finally {
    for (const img of (await api.list()).filter((i) => !before.includes(i))) await api.remove(img);
    await api.dispose();
  }
});
