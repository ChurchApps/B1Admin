import React from "react";
import { ArrayHelper, DateHelper, CurrencyHelper, Locale } from "@churchapps/apphelper";
import { type DonationInterface, type DonationBatchInterface, type FundInterface, type FundDonationInterface } from "@churchapps/helpers";
import { Box, Table, TableBody, TableCell, TableRow, TableHead, Typography } from "@mui/material";

interface Props {
  churchName?: string;
  batch: DonationBatchInterface;
  donations: DonationInterface[]; // person already populated
  fundDonations: FundDonationInterface[];
  funds: FundInterface[];
  currency: string;
  rates: Record<string, number>;
  className?: string;
}

// Per-fund totals for the batch, converted to the church currency. Callers pass only non-refunded donation ids.
export const getFundTotals = (donationIds: string[], fundDonations: FundDonationInterface[], currency: string, rates: Record<string, number>) => {
  const fundTotals = new Map<string, number>();
  fundDonations
    .filter((fd) => donationIds.includes(fd.donationId || ""))
    .forEach((fd) => fundTotals.set(fd.fundId || "", (fundTotals.get(fd.fundId || "") || 0) + CurrencyHelper.convertAmount(fd.amount || 0, (fd as any).currency || currency, currency, rates)));
  return fundTotals;
};

// Paper copy for the counting team: every gift, a subtotal per fund, and the batch total.
export const BatchPrintDocument: React.FC<Props> = ({ churchName, batch, donations, fundDonations, funds, currency, rates, className }) => {
  const donationIds = donations.filter((d) => (d as any).status !== "refunded").map((d) => d.id || "");
  const fundTotals = Array.from(getFundTotals(donationIds, fundDonations, currency, rates).entries())
    .map(([fundId, amount]) => ({ name: ArrayHelper.getOne(funds, "id", fundId)?.name || "Unknown Fund", amount }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const donationsTotal = donations.reduce((sum, d) => {
    if ((d as any).status === "refunded") return sum;
    return sum + CurrencyHelper.convertAmount(d.amount || 0, d.currency || currency, currency, rates);
  }, 0);
  const isConverted = donations.some((d) => d.currency && d.currency.toLowerCase() !== currency.toLowerCase() && !!rates[d.currency.toUpperCase()]);

  return (
    <Box className={className} data-testid="batch-print-document">
      {churchName && <Typography variant="h6" data-testid="batch-print-church">{churchName}</Typography>}
      <Typography variant="h5">{batch?.name}</Typography>
      {batch?.batchDate && <Typography variant="subtitle1" gutterBottom>{DateHelper.prettyDate(new Date(batch.batchDate.split("T")[0] + "T00:00:00"))}</Typography>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("common.name")}</TableCell>
            <TableCell>{Locale.label("donations.donations.method")}</TableCell>
            <TableCell>{Locale.label("donations.donations.notes")}</TableCell>
            <TableCell>{Locale.label("donations.donations.date")}</TableCell>
            <TableCell align="right">{Locale.label("donations.donations.amt")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {donations.map((d, i) => {
            const isRefunded = (d as any).status === "refunded";
            return (
              <TableRow key={i}>
                <TableCell>{d.person?.name.display || Locale.label("donations.donations.anon")}</TableCell>
                <TableCell>{[d.method, d.methodDetails].filter(Boolean).join(" - ")}</TableCell>
                <TableCell>{d.notes || ""}</TableCell>
                <TableCell>{d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}</TableCell>
                <TableCell align="right" sx={{ textDecoration: isRefunded ? "line-through" : undefined }}>
                  {CurrencyHelper.formatCurrencyWithLocale(d.amount || 0, d.currency || currency)}
                  {isRefunded && " (" + Locale.label("donations.donations.refunded") + ")"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Typography variant="h6" sx={{ mt: 3 }}>{Locale.label("donations.donations.fundSubtotals")}</Typography>
      <Table size="small">
        <TableBody>
          {fundTotals.map((f) => (
            <TableRow key={f.name}>
              <TableCell>{f.name}</TableCell>
              <TableCell align="right">{CurrencyHelper.formatCurrencyWithLocale(f.amount, currency)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>{Locale.label("donations.donations.batchTotal")}</TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>{CurrencyHelper.formatCurrencyWithLocale(donationsTotal, currency)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {isConverted && <Typography variant="caption">{Locale.label("donations.donations.convertedNote")}</Typography>}
    </Box>
  );
};
