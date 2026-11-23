import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentStatementYear, parseStartMonth, statementPeriodLabel, statementRange, statementYearLabel, statementYearOf } from "./statementPeriod.ts";

describe("statementPeriod", () => {
  it("reads the setting, defaulting to January for blank or bad values", () => {
    assert.equal(parseStartMonth(""), 1);
    assert.equal(parseStartMonth(undefined), 1);
    assert.equal(parseStartMonth("13"), 1);
    assert.equal(parseStartMonth("7"), 7);
  });

  it("keeps the calendar year when the year starts in January", () => {
    assert.deepEqual(statementRange(2025, 1), { startDate: "2025-01-01", endDate: "2025-12-31" });
    assert.equal(statementYearOf("2025-01-01T00:00:00.000Z", 1), 2025);
    assert.equal(statementYearOf("2025-12-31", 1), 2025);
    assert.equal(statementYearLabel(2025, 1), "2025");
    assert.equal(statementPeriodLabel(2025, 1, "en-US"), "2025");
  });

  it("names a July year by the year it starts in and ends it on June 30", () => {
    assert.deepEqual(statementRange(2025, 7), { startDate: "2025-07-01", endDate: "2026-06-30" });
    assert.equal(statementYearOf("2025-06-30", 7), 2024);
    assert.equal(statementYearOf("2025-07-01T00:00:00.000Z", 7), 2025);
    assert.equal(statementYearOf("2026-06-30", 7), 2025);
    assert.equal(statementYearLabel(2025, 7), "2025–2026");
    assert.equal(statementPeriodLabel(2025, 7, "en-US"), "July 2025 – June 2026");
  });

  it("ends an April year on March 31 and a March year on the last day of February", () => {
    assert.deepEqual(statementRange(2025, 4), { startDate: "2025-04-01", endDate: "2026-03-31" });
    assert.deepEqual(statementRange(2027, 3), { startDate: "2027-03-01", endDate: "2028-02-29" });
  });

  it("reads a gift's recorded day, not the UTC instant", () => {
    // Midnight UTC on July 1 is still June 30 west of UTC; the statement goes by the recorded day.
    assert.equal(statementYearOf("2025-07-01T00:00:00.000Z", 7), 2025);
    assert.equal(statementYearOf(null, 7), null);
  });

  it("picks the statement year that contains today", () => {
    assert.equal(currentStatementYear(7, new Date(2026, 2, 15)), 2025);
    assert.equal(currentStatementYear(7, new Date(2026, 6, 1)), 2026);
    assert.equal(currentStatementYear(1, new Date(2026, 2, 15)), 2026);
  });
});
