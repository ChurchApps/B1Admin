import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { receiptShowsDisclaimer } from "./receiptRules.ts";

describe("receiptShowsDisclaimer", () => {
  it("is true when every fund line is tax-deductible", () => {
    assert.equal(receiptShowsDisclaimer([{ taxDeductible: true }]), true);
    assert.equal(receiptShowsDisclaimer([{ taxDeductible: true }, {}]), true);
  });

  it("is false when any fund line is not tax-deductible", () => {
    assert.equal(receiptShowsDisclaimer([{ taxDeductible: false }]), false);
    assert.equal(receiptShowsDisclaimer([{ taxDeductible: true }, { taxDeductible: false }]), false);
  });

  it("is false for an empty gift", () => {
    assert.equal(receiptShowsDisclaimer([]), false);
  });
});
