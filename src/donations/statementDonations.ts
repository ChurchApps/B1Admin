import type { DonationInterface, FundDonationInterface, FundInterface } from "@churchapps/helpers";

// Giving statements count tax-deductible giving only. Like the Api's per-donor statement query
// (GET /donations?personId=), a gift drops out when every fund it went to is marked non-deductible;
// a gift with no fund rows, or a fund that is no longer listed, stays in.
export const statementDonations = (donations: DonationInterface[], fundDonations: FundDonationInterface[], funds: FundInterface[]) => {
  const nonDeductible = new Set(funds.filter((f) => f.taxDeductible === false).map((f) => f.id));
  const fundsByDonation = new Map<string, string[]>();
  fundDonations.forEach((fd) => {
    const list = fundsByDonation.get(fd.donationId || "") || [];
    list.push(fd.fundId || "");
    fundsByDonation.set(fd.donationId || "", list);
  });
  return donations.filter((d) => {
    const fundIds = fundsByDonation.get(d.id || "") || [];
    return fundIds.length === 0 || fundIds.some((id) => !nonDeductible.has(id));
  });
};
