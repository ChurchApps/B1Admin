import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { copyArrangementName } from "./arrangementCopy.ts";

describe("copyArrangementName", () => {
  it("adds a copy suffix", () => {
    assert.equal(copyArrangementName("Acoustic", ["Acoustic"]), "Acoustic (copy)");
  });

  it("numbers further copies so names stay distinct", () => {
    assert.equal(copyArrangementName("Acoustic", ["Acoustic", "Acoustic (copy)", "acoustic (copy 2)"]), "Acoustic (copy 3)");
  });

  it("uses the translated suffix", () => {
    assert.equal(copyArrangementName("(Default)", ["(Default)"], "copia"), "(Default) (copia)");
  });
});
