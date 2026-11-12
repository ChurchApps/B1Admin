import type { DonationBatchInterface } from "@churchapps/helpers";

const dayOf = (b: DonationBatchInterface) => (b.batchDate || "").toString().split("T")[0];

// Batches a gift can be moved into: every open batch, plus the gift's own batch even when closed so the field is never blank. Newest first.
export function batchOptions(batches: DonationBatchInterface[], currentBatchId?: string): DonationBatchInterface[] {
  return batches
    .filter((b) => b.status !== "closed" || b.id === currentBatchId)
    .sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
}

// "Nov 1, 2025 – Sunday Offering", or just the date when the batch has no name.
export function batchOptionLabel(b: DonationBatchInterface, formatDate: (d: Date) => string): string {
  const day = dayOf(b);
  const date = day ? formatDate(new Date(day + "T00:00:00")) : "";
  return [date, b.name].filter(Boolean).join(" – ");
}
