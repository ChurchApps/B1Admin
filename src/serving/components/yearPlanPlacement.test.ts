import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addWeeks,
  christmasSunday,
  dateKey,
  defaultRange,
  easterSunday,
  firstSundayOfMonth,
  placeYearPlanWeeks,
  type PlacementReasons,
  type PlacementWeek
} from "./yearPlanPlacement.ts";

const reasons: PlacementReasons = {
  externalSkipped: "external",
  missingVenue: "missing",
  dateTaken: "taken",
  anchoredEaster: "Anchored to Easter",
  anchoredChristmas: "Anchored to Christmas",
  shiftedWeek: "shifted",
  segmentOverflow: "overflow"
};

const hosted = (week: number, studyId: string, lessonName: string, extra?: Partial<PlacementWeek>): PlacementWeek => ({
  week,
  programId: "P",
  studyId,
  lessonId: `L${week}`,
  venueId: "V",
  studyName: studyId,
  lessonName,
  venueName: "Elementary",
  ...extra
});

describe("easterSunday", () => {
  it("matches known Gregorian dates", () => {
    assert.equal(dateKey(easterSunday(2024)), "2024-03-31");
    assert.equal(dateKey(easterSunday(2025)), "2025-04-20");
    assert.equal(dateKey(easterSunday(2026)), "2026-04-05");
    assert.equal(dateKey(easterSunday(2027)), "2027-03-28");
  });
});

describe("christmasSunday", () => {
  it("is the Sunday on or before December 25", () => {
    assert.equal(dateKey(christmasSunday(2022)), "2022-12-25");
    assert.equal(dateKey(christmasSunday(2025)), "2025-12-21");
    assert.equal(dateKey(christmasSunday(2026)), "2026-12-20");
  });
});

describe("defaultRange", () => {
  it("starts on the first Sunday of the start month", () => {
    const range = defaultRange(1, 2026);
    assert.equal(dateKey(range.start), dateKey(firstSundayOfMonth(2026, 1)));
    assert.equal(range.start.getDay(), 0);
    assert.equal(range.end.getFullYear(), 2026);
    assert.equal(range.end.getMonth(), 11);
  });
});

describe("placeYearPlanWeeks sequential fallback", () => {
  it("maps week i onto startDate + i weeks", () => {
    const start = new Date(2031, 1, 2, 12, 0, 0);
    const rows = placeYearPlanWeeks({
      weeks: [hosted(1, "S", "A"), hosted(2, "S", "B")],
      startDate: start,
      weekCount: 52,
      occupiedDates: new Set(),
      excluded: new Set(),
      reasons
    });
    assert.equal(dateKey(rows[0].date), "2031-02-02");
    assert.equal(dateKey(rows[1].date), "2031-02-09");
  });

  it("leaves a hole when a date is taken", () => {
    const start = new Date(2031, 1, 2, 12, 0, 0);
    const rows = placeYearPlanWeeks({
      weeks: [hosted(1, "S", "A"), hosted(2, "S", "B")],
      startDate: start,
      weekCount: 52,
      occupiedDates: new Set(["2031-02-02"]),
      excluded: new Set(),
      reasons
    });
    assert.equal(rows[0].included, false);
    assert.equal(dateKey(rows[1].date), "2031-02-09");
  });
});

describe("placeYearPlanWeeks calendar", () => {
  const range = defaultRange(1, 2026);

  it("pins an Easter study on the Sundays leading up to Easter", () => {
    const weeks = [
      hosted(1, "psalm", "Shepherd"),
      hosted(2, "psalm", "Protector"),
      hosted(3, "power", "Obey"),
      hosted(4, "power", "Serve"),
      hosted(5, "power", "Humble"),
      hosted(6, "power", "Wise Choices", { anchor: "easter" })
    ];
    const rows = placeYearPlanWeeks({
      weeks,
      startMonth: 1,
      startDate: range.start,
      endDate: range.end,
      occupiedDates: new Set(),
      excluded: new Set(),
      reasons
    });
    assert.equal(dateKey(rows[5].date), "2026-04-05");
    assert.equal(rows[5].note, "Anchored to Easter");
    assert.equal(dateKey(rows[2].date), "2026-03-15");
    assert.equal(dateKey(rows[0].date), dateKey(range.start));
  });

  it("pins a Christmas study on the Sundays leading up to Christmas", () => {
    const weeks = [
      hosted(1, "psalm", "Shepherd"),
      hosted(2, "xmas", "Give"),
      hosted(3, "xmas", "Room"),
      hosted(4, "xmas", "Best", { anchor: "christmas" })
    ];
    const rows = placeYearPlanWeeks({
      weeks,
      startMonth: 1,
      startDate: range.start,
      endDate: range.end,
      occupiedDates: new Set(),
      excluded: new Set(),
      reasons
    });
    assert.equal(dateKey(rows[3].date), dateKey(christmasSunday(2026)));
    assert.equal(dateKey(rows[1].date), dateKey(addWeeks(christmasSunday(2026), -2)));
  });

  it("shifts following unanchored weeks onto the vacated Sunday when a week is excluded", () => {
    const weeks = [
      hosted(1, "a", "One"),
      hosted(2, "a", "Two"),
      hosted(3, "a", "Three"),
      hosted(4, "xmas", "Best", { anchor: "christmas" })
    ];
    const full = placeYearPlanWeeks({ weeks, startMonth: 1, startDate: range.start, endDate: range.end, occupiedDates: new Set(), excluded: new Set(), reasons });
    const compacted = placeYearPlanWeeks({ weeks, startMonth: 1, startDate: range.start, endDate: range.end, occupiedDates: new Set(), excluded: new Set([1]), reasons });
    assert.equal(dateKey(compacted[2].date), dateKey(full[1].date));
  });

  it("shifts an unanchored week later when its Sunday is already taken", () => {
    const weeks = [hosted(1, "a", "One"), hosted(2, "a", "Two"), hosted(3, "xmas", "Best", { anchor: "christmas" })];
    const open = placeYearPlanWeeks({ weeks, startMonth: 1, startDate: range.start, endDate: range.end, occupiedDates: new Set(), excluded: new Set(), reasons });
    const shifted = placeYearPlanWeeks({ weeks, startMonth: 1, startDate: range.start, endDate: range.end, occupiedDates: new Set([dateKey(open[0].date)]), excluded: new Set(), reasons });
    assert.equal(dateKey(shifted[0].date), dateKey(open[1].date));
    assert.equal(shifted[0].included, true);
  });

  it("reports overflow when a segment does not fit before the next anchor", () => {
    const weeks: PlacementWeek[] = [];
    for (let n = 1; n <= 20; n++) weeks.push(hosted(n, "pre", `Pre ${n}`));
    weeks.push(hosted(21, "power", "Wise Choices", { anchor: "easter" }));
    const rows = placeYearPlanWeeks({ weeks, startMonth: 1, startDate: range.start, endDate: range.end, occupiedDates: new Set(), excluded: new Set(), reasons });
    assert.equal(dateKey(rows[20].date), "2026-04-05");
    assert.ok(rows.some(r => r.skipReason === "overflow"));
  });
});
