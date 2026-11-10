import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { statementDonations } from "./statementDonations.ts";

const funds = [{ id: "general", name: "General", taxDeductible: true }, { id: "camp", name: "Camp", taxDeductible: false }, { id: "legacy", name: "Legacy" }];

describe("statementDonations", () => {
  it("drops a gift made only to non-deductible funds", () => {
    const donations = [{ id: "d1" }, { id: "d2" }];
    const fundDonations = [{ donationId: "d1", fundId: "general" }, { donationId: "d2", fundId: "camp" }];
    assert.deepEqual(statementDonations(donations, fundDonations, funds).map((d) => d.id), ["d1"]);
  });

  it("keeps a split gift that is partly deductible, a gift with no fund rows, and funds without the flag", () => {
    const donations = [{ id: "split" }, { id: "none" }, { id: "legacy" }, { id: "removed" }];
    const fundDonations = [
      { donationId: "split", fundId: "camp" },
      { donationId: "split", fundId: "general" },
      { donationId: "legacy", fundId: "legacy" },
      { donationId: "removed", fundId: "deleted-fund" }
    ];
    assert.deepEqual(statementDonations(donations, fundDonations, funds).map((d) => d.id), ["split", "none", "legacy", "removed"]);
  });
});
