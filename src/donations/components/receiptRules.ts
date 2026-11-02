// A single-gift receipt only says "no goods or services" when every fund on the gift is tax-deductible,
// so a t-shirt or event fee reads as a payment rather than a charitable gift.
export const receiptShowsDisclaimer = (contributions: { taxDeductible?: boolean }[]) => contributions.length > 0 && contributions.every((c) => c.taxDeductible !== false);
