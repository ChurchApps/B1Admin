import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { SEED_PEOPLE, confirmDelete, openPersonRow } from "./helpers/fixtures";

// Documents on the person record (ChurchAppsSupport#1657): staff with People access keep a person's
// records (baptism certificates, event records) on their profile, private to staff.

const API = process.env.API_BASE || "http://localhost:8084";

test.describe("People - Documents", () => {
  test("uploads a document to a person, downloads it through a private link, and deletes it", async ({ page }) => {
    const fileName = `baptism-certificate-${Date.now()}.pdf`;
    await openPersonRow(page, SEED_PEOPLE.DONALD);

    const section = page.getByTestId("person-documents-section");
    await expect(section.getByRole("heading", { name: "Documents" })).toBeVisible();

    await section.getByTestId("person-documents-upload-btn").click();
    await section.getByTestId("file-upload-input").setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% demo certificate\n") });
    const saved = page.waitForResponse((r) => /\/content\/files$/.test(new URL(r.url()).pathname) && r.request().method() === "POST" && r.ok());
    await section.getByTestId("person-documents-upload-save").click();
    const [file] = await (await saved).json();
    expect(file.contentType).toBe("person");

    const row = section.getByTestId("person-document-row").filter({ hasText: fileName });
    await expect(row).toBeVisible();
    await expect(section.getByTestId("person-documents-storage")).toContainText("of 100 MB used");
    await page.screenshot({ path: test.info().outputPath("after.png") });

    // The stored path is not public: the raw route refuses a request without the signed link.
    const anon = await page.request.get(API + "/content/files/download/" + file.id, { maxRedirects: 0 });
    expect(anon.status()).toBe(401);

    const downloading = page.waitForEvent("download");
    await row.getByTestId("person-document-download").click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(fileName);

    await row.getByTestId("person-document-delete").click();
    const deleted = page.waitForResponse((r) => r.url().includes("/content/files/" + file.id) && r.request().method() === "DELETE" && r.ok());
    await confirmDelete(page);
    await deleted;
    await expect(row).toHaveCount(0);
  });

  test("adds a link to a person and removes it", async ({ page }) => {
    const text = `Event record ${Date.now()}`;
    await openPersonRow(page, SEED_PEOPLE.DONALD);
    const section = page.getByTestId("person-documents-section");

    await section.getByTestId("person-documents-link-btn").click();
    await section.getByTestId("person-documents-link-text").locator("input").fill(text);
    await section.getByTestId("person-documents-link-url").locator("input").fill("not a url");
    await section.getByTestId("person-documents-link-save").click();
    await expect(section.getByText("Enter a full web address starting with http:// or https://")).toBeVisible();

    await section.getByTestId("person-documents-link-url").locator("input").fill("https://example.org/records/event.pdf");
    await section.getByTestId("person-documents-link-save").click();

    const row = section.getByTestId("person-document-row").filter({ hasText: text });
    await expect(row).toBeVisible();
    await expect(row.getByTestId("person-document-open")).toHaveAttribute("href", "https://example.org/records/event.pdf");

    await row.getByTestId("person-document-delete").click();
    await confirmDelete(page);
    await expect(row).toHaveCount(0);
  });
});
