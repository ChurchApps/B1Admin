import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlanRepeatDates, type PlanRepeatOptions } from "./planRepeatDates.ts";

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const repeat = (first: Date, opts: Partial<PlanRepeatOptions>) =>
  getPlanRepeatDates(first, { interval: 1, frequency: "week", monthMode: "monthDay", count: 1, ...opts }).map(key);

describe("getPlanRepeatDates", () => {
  it("every 1 week matches the old 7-day steps", () => {
    const first = new Date(2026, 10, 1, 12, 0, 0);
    const old = [0, 1, 2, 3].map(i => key(new Date(2026, 10, 1 + 7 * i, 12, 0, 0)));
    assert.deepEqual(repeat(first, { count: 4 }), old);
  });

  it("every 2 weeks", () => {
    assert.deepEqual(repeat(new Date(2026, 11, 20, 12, 0, 0), { interval: 2, count: 3 }), ["2026-12-20", "2027-01-03", "2027-01-17"]);
  });

  it("every 3 days", () => {
    assert.deepEqual(repeat(new Date(2026, 1, 26, 12, 0, 0), { interval: 3, frequency: "day", count: 3 }), ["2026-02-26", "2026-03-01", "2026-03-04"]);
  });

  it("keeps day 31 through February", () => {
    assert.deepEqual(repeat(new Date(2027, 0, 31, 12, 0, 0), { frequency: "month", count: 4 }), ["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("uses Feb 29 in a leap year", () => {
    assert.deepEqual(repeat(new Date(2028, 0, 31, 12, 0, 0), { frequency: "month", count: 3 }), ["2028-01-31", "2028-02-29", "2028-03-31"]);
  });

  it("keeps the second Saturday", () => {
    assert.deepEqual(
      repeat(new Date(2026, 10, 14, 12, 0, 0), { frequency: "month", monthMode: "nthWeekday", count: 6 }),
      ["2026-11-14", "2026-12-12", "2027-01-09", "2027-02-13", "2027-03-13", "2027-04-10"]
    );
  });

  it("maps a fifth weekday to the last one", () => {
    // Oct 31 2026 is the fifth Saturday; Nov 2026 has four and Jan 2027 has five.
    assert.deepEqual(
      repeat(new Date(2026, 9, 31, 12, 0, 0), { frequency: "month", monthMode: "nthWeekday", count: 4 }),
      ["2026-10-31", "2026-11-28", "2026-12-26", "2027-01-30"]
    );
  });

  it("every 2 months across a year end", () => {
    assert.deepEqual(repeat(new Date(2026, 10, 15, 12, 0, 0), { interval: 2, frequency: "month", count: 3 }), ["2026-11-15", "2027-01-15", "2027-03-15"]);
  });

  it("count 1 returns only the first date", () => {
    assert.deepEqual(repeat(new Date(2026, 10, 14, 12, 0, 0), { frequency: "month", interval: 5 }), ["2026-11-14"]);
  });

  it("sets every date to 12:00 local", () => {
    const dates = getPlanRepeatDates(new Date(2026, 2, 1, 8, 30, 0), { interval: 1, frequency: "week", monthMode: "monthDay", count: 4 });
    assert.deepEqual(dates.map(d => d.getHours()), [12, 12, 12, 12]);
  });
});
