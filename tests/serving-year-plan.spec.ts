import type { Page } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { confirmDelete, editIconButton } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

const RUN = Date.now().toString().slice(-6);
const MINISTRY = `Barnabas YP ${RUN}`;
const PLAN_TYPE = `Barnabas YP Plans ${RUN}`;
const START_DATE = "2031-02-02";

const ANCHORED_YEAR_PLANS = [
  {
    id: "YPLANCH0001",
    name: "Ark Elementary Year 2",
    startMonth: 1,
    weeks: [
      { week: 1, programId: "PGM1", studyId: "STU1", lessonId: "LSN1", venueId: "VEN1", studyName: "Psalm 23", lessonName: "Shepherd", venueName: "Elementary" },
      { week: 2, programId: "PGM1", studyId: "STU1", lessonId: "LSN2", venueId: "VEN1", studyName: "Psalm 23", lessonName: "Protector", venueName: "Elementary" },
      { week: 3, programId: "PGM1", studyId: "STU2", lessonId: "LSN3", venueId: "VEN1", studyName: "Power Up (Easter Series)", lessonName: "Obey", venueName: "Elementary" },
      { week: 4, programId: "PGM1", studyId: "STU2", lessonId: "LSN4", venueId: "VEN1", studyName: "Power Up (Easter Series)", lessonName: "Serve", venueName: "Elementary" },
      { week: 5, programId: "PGM1", studyId: "STU2", lessonId: "LSN5", venueId: "VEN1", studyName: "Power Up (Easter Series)", lessonName: "Humble", venueName: "Elementary" },
      { week: 6, programId: "PGM1", studyId: "STU2", lessonId: "LSN6", venueId: "VEN1", studyName: "Power Up (Easter Series)", lessonName: "Wise Choices", venueName: "Elementary", anchor: "easter" },
      { week: 7, programId: "PGM1", studyId: "STU3", lessonId: "LSN7", venueId: "VEN1", studyName: "After Easter", lessonName: "Continue", venueName: "Elementary" },
      { week: 8, programId: "PGM1", studyId: "STU3", lessonId: "LSN8", venueId: "VEN1", studyName: "After Easter", lessonName: "Keep Going", venueName: "Elementary" },
      { week: 9, programId: "PGM1", studyId: "STU3", lessonId: "LSN9", venueId: "VEN1", studyName: "After Easter", lessonName: "Finish Strong", venueName: "Elementary" },
      { week: 10, programId: "PGM1", studyId: "STU4", lessonId: "LSN10", venueId: "VEN1", studyName: "Better to Give (Christmas)", lessonName: "Give", venueName: "Elementary" },
      { week: 11, programId: "PGM1", studyId: "STU4", lessonId: "LSN11", venueId: "VEN1", studyName: "Better to Give (Christmas)", lessonName: "Room", venueName: "Elementary" },
      { week: 12, programId: "PGM1", studyId: "STU4", lessonId: "LSN12", venueId: "VEN1", studyName: "Better to Give (Christmas)", lessonName: "Best", venueName: "Elementary", anchor: "christmas" }
    ]
  }
];

const MOCK_YEAR_PLANS = [
  {
    id: "YPLTEST0001",
    name: "Barnabas Year",
    weeks: [
      {
        week: 1,
        programId: "PGM1",
        studyId: "STU1",
        lessonId: "LSN1",
        venueId: "VEN1",
        studyName: "Genesis Stories",
        lessonName: "Creation",
        venueName: "Elementary"
      },
      {
        week: 2,
        programId: "PGM1",
        studyId: "STU1",
        lessonId: "LSN2",
        venueId: "VEN2",
        studyName: "Genesis Stories",
        lessonName: "Noah's Ark",
        venueName: "Elementary"
      },
      {
        week: 3,
        externalProviderId: "EXT1",
        studyName: "Outside Curriculum",
        lessonName: "External Week"
      },
      {
        week: 4,
        studyName: "Incomplete Study",
        lessonName: "Broken Week"
      }
    ]
  }
];

async function mockYearPlans(page: Page, body: unknown) {
  await page.unroute("**/yearPlans/public**").catch(() => undefined);
  await page.route("**/yearPlans/public**", (route) => route.fulfill({ status: 200, contentType: "application/json", json: body }));
}

test.describe.serial("Serving Management - Apply Year Plan", () => {
  test.describe.configure({ retries: 0 });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToServing(page);
  });

  test.afterAll(async () => {
    await page?.unroute("**/yearPlans/public**").catch(() => undefined);
    await page?.context().close();
  });

  async function gotoPlanType() {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    const minBtn = page.locator('[role="tab"]').getByText(MINISTRY);
    await expect(minBtn).toBeVisible({ timeout: 10000 });
    await minBtn.click();
    const typeLink = page.locator("a").getByText(PLAN_TYPE, { exact: true });
    await expect(typeLink).toBeVisible({ timeout: 10000 });
    await typeLink.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/, { timeout: 15000 });
  }

  async function openApplyYearPlan() {
    await page.getByTestId("schedule-lesson-button").click();
    await page.getByTestId("apply-year-plan-menu").click();
    await expect(page.getByTestId("apply-year-plan")).toBeVisible({ timeout: 15000 });
  }

  test("should create ministry and plan type", async () => {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    await expect(page.locator("button").getByText("Add Ministry")).toBeVisible({ timeout: 15000 });
    await page.locator("button").getByText("Add Ministry").click();
    await page.locator('[name="name"]').fill(MINISTRY);
    await page.locator("button").getByText("Add").first().click();
    const verifiedMin = page.locator('[role="tab"]').getByText(MINISTRY);
    await expect(verifiedMin).toHaveCount(1, { timeout: 10000 });

    await verifiedMin.click();
    const createPlanType = page.locator("button").getByText("Create Plan Type");
    await expect(createPlanType).toBeVisible({ timeout: 10000 });
    await createPlanType.click();
    await page.locator('[name="name"]').fill(PLAN_TYPE);
    await page.locator("button").getByText("Save").click();
    await expect(page.locator("a").getByText(PLAN_TYPE, { exact: true })).toHaveCount(1, { timeout: 10000 });
  });

  test("shows an empty state when no year plans are published", async () => {
    await mockYearPlans(page, []);
    await gotoPlanType();
    await openApplyYearPlan();
    await expect(page.getByText("No year plans have been published yet.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("apply-year-plan-save")).toBeDisabled();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByTestId("apply-year-plan")).toHaveCount(0);
  });

  test("previews hosted weeks and skips external and incomplete weeks", async () => {
    await mockYearPlans(page, MOCK_YEAR_PLANS);
    await gotoPlanType();
    await openApplyYearPlan();

    await expect(page.getByTestId("apply-year-plan-select")).toContainText("Barnabas Year", { timeout: 15000 });
    await page.getByTestId("apply-year-plan-start-date").locator("input").fill(START_DATE);

    const preview = page.getByTestId("apply-year-plan-preview");
    await expect(preview.getByText("Genesis Stories — Creation")).toBeVisible();
    await expect(preview.getByText("Genesis Stories — Noah's Ark")).toBeVisible();
    await expect(preview.getByText("Outside Curriculum — External Week")).toBeVisible();
    await expect(preview.getByText("This week is from an external provider and cannot be applied here.")).toBeVisible();
    await expect(preview.getByText("Incomplete Study — Broken Week")).toBeVisible();
    await expect(preview.getByText("Missing program, lesson, or venue.")).toBeVisible();
    await expect(page.getByText("2 lessons to schedule")).toBeVisible();

    await expect(page.getByTestId("apply-year-plan-include-0").locator("input")).toBeEnabled();
    await expect(page.getByTestId("apply-year-plan-include-2").locator("input")).toBeDisabled();
    await expect(page.getByTestId("apply-year-plan-include-3").locator("input")).toBeDisabled();

    await page.getByRole("button", { name: /cancel/i }).click();
  });

  test("applies hosted weeks as serving plans", async () => {
    await mockYearPlans(page, MOCK_YEAR_PLANS);
    await gotoPlanType();
    await openApplyYearPlan();
    await expect(page.getByTestId("apply-year-plan-select")).toContainText("Barnabas Year", { timeout: 15000 });
    await page.getByTestId("apply-year-plan-start-date").locator("input").fill(START_DATE);

    const save = page.getByTestId("apply-year-plan-save");
    await expect(save).toBeEnabled();
    const created = page.waitForResponse(
      (r) => r.url().includes("/doing/plans") && r.request().method() === "POST" && r.status() === 200,
      { timeout: 20000 }
    );
    await save.click();
    await created;
    await expect(page.getByTestId("apply-year-plan")).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText("Creation")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Noah's Ark")).toBeVisible();
    await expect(page.getByText("External Week")).toHaveCount(0);
    await expect(page.getByText("Broken Week")).toHaveCount(0);
  });

  test("skips dates that already have a plan", async () => {
    await mockYearPlans(page, MOCK_YEAR_PLANS);
    await gotoPlanType();
    await openApplyYearPlan();
    await expect(page.getByTestId("apply-year-plan-select")).toContainText("Barnabas Year", { timeout: 15000 });
    await page.getByTestId("apply-year-plan-start-date").locator("input").fill(START_DATE);

    await expect(page.getByTestId("apply-year-plan-row-0").getByText("A plan already exists on this date.")).toBeVisible();
    await expect(page.getByTestId("apply-year-plan-row-1").getByText("A plan already exists on this date.")).toBeVisible();
    await expect(page.getByText("0 lessons to schedule")).toBeVisible();
    await expect(page.getByTestId("apply-year-plan-save")).toBeDisabled();
    await page.getByRole("button", { name: /cancel/i }).click();
  });

  test("places Easter and Christmas studies on the target year calendar", async () => {
    await mockYearPlans(page, ANCHORED_YEAR_PLANS);
    await gotoPlanType();
    await openApplyYearPlan();
    await expect(page.getByTestId("apply-year-plan-select")).toContainText("Ark Elementary Year 2", { timeout: 15000 });
    await expect(page.getByTestId("apply-year-plan-target-year")).toBeVisible();
    await expect(page.getByTestId("apply-year-plan-week-count")).toHaveCount(0);
    await page.getByTestId("apply-year-plan-target-year").getByRole("combobox").click();
    await page.getByRole("option", { name: "2026" }).click();

    await expect(page.getByTestId("apply-year-plan-row-5")).toContainText("2026-04-05");
    await expect(page.getByTestId("apply-year-plan-row-5")).toContainText("Wise Choices");
    await expect(page.getByTestId("apply-year-plan-row-5")).toContainText("Anchored to Easter");
    await expect(page.getByTestId("apply-year-plan-row-2")).toContainText("2026-03-15");
    await expect(page.getByTestId("apply-year-plan-row-11")).toContainText("2026-12-20");
    await expect(page.getByTestId("apply-year-plan-row-11")).toContainText("Anchored to Christmas");
    await page.getByRole("button", { name: /cancel/i }).click();
  });

  test("shifts following weeks when an unanchored week is excluded", async () => {
    await mockYearPlans(page, ANCHORED_YEAR_PLANS);
    await gotoPlanType();
    await openApplyYearPlan();
    await expect(page.getByTestId("apply-year-plan-select")).toContainText("Ark Elementary Year 2", { timeout: 15000 });
    await page.getByTestId("apply-year-plan-target-year").getByRole("combobox").click();
    await page.getByRole("option", { name: "2026" }).click();

    await expect(page.getByTestId("apply-year-plan-row-7")).toContainText("2026-04-19");
    await expect(page.getByTestId("apply-year-plan-row-8")).toContainText("2026-04-26");
    await page.getByTestId("apply-year-plan-include-7").locator("input").uncheck();
    await expect(page.getByTestId("apply-year-plan-row-8")).toContainText("2026-04-19");
    await expect(page.getByTestId("apply-year-plan-row-5")).toContainText("2026-04-05");
    await page.getByRole("button", { name: /cancel/i }).click();
  });

  test("should delete the test ministry", async () => {
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    const minBtn = page.locator('[role="tab"]').getByText(MINISTRY);
    await minBtn.click();
    await page.locator("a").getByText("Edit Ministry").click();
    const editBtn = editIconButton(page).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    const deleteBtn = page.locator("button").getByText("Delete");
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await confirmDelete(page).catch(() => undefined);
    await expect(page.locator('[role="tab"]').getByText(MINISTRY)).toHaveCount(0, { timeout: 10000 });
  });
});
