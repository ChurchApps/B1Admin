import { test, expect } from "@playwright/test";
import { ChordProHelper } from "../src/helpers/ChordProHelper";

test.describe("ChordProHelper.transposeChords", () => {
  test("transposes repeated and colliding chords independently", () => {
    expect(ChordProHelper.transposeChords("[G]Amazing [C]grace [G]how", 5)).toBe("[C]Amazing [F]grace [C]how");
  });

  test("transposes slash chords", () => {
    expect(ChordProHelper.transposeChords("[C/E]one [D]two", 2)).toBe("[D/F#]one [E]two");
  });
});
