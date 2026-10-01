import React from "react";
import { useReactToPrint } from "react-to-print";
import { ArrayHelper, ApiHelper, UserHelper, DateHelper, CurrencyHelper, Permissions, UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { type DonationInterface, type DonationBatchInterface, type FundInterface, type FundDonationInterface } from "@churchapps/helpers";
import { Box, Table, TableBody, TableCell, TableRow, TableHead, Typography, Stack } from "@mui/material";
import { EmptyState } from "../../components";
import { RecordHeading, StatusBadge, TextAction, VerbRow, hoverRowSx, numericCellSx, tableScrollSx } from "../../components/ui";
import { CsvVerb } from "./GivingParts";

interface Props {
  batch: DonationBatchInterface;
  funds: FundInterface[];
  editFunction: (id: string) => void;
  currency?: string
}

const QBO_HEADERS = [
  { label: "JournalNo", key: "JournalNo" },
  { label: "JournalDate", key: "JournalDate" },
  { label: "AccountName", key: "AccountName" },
  { label: "Debits", key: "Debits" },
  { label: "Credits", key: "Credits" },
  { label: "Description", key: "Description" },
  { label: "Name", key: "Name" }
];

// Per-fund totals for the batch, converted to the church currency. Callers pass only non-refunded donation ids.
const getFundTotals = (donationIds: string[], fundDonations: FundDonationInterface[], currency: string, rates: Record<string, number>) => {
  const fundTotals = new Map<string, number>();
  fundDonations
    .filter((fd) => donationIds.includes(fd.donationId || ""))
    .forEach((fd) => fundTotals.set(fd.fundId || "", (fundTotals.get(fd.fundId || "") || 0) + CurrencyHelper.convertAmount(fd.amount || 0, (fd as any).currency || currency, currency, rates)));
  return fundTotals;
};

// QBO Journal Entry import format: one debit line (Undeposited Funds) plus one credit line per fund.
const buildQboJournalRows = (batch: DonationBatchInterface, donationIds: string[], fundDonations: FundDonationInterface[], funds: FundInterface[], currency: string, rates: Record<string, number>) => {
  const journalNo = batch.id || "";
  const journalDate = batch.batchDate ? batch.batchDate.split("T")[0] : "";
  const description = "Donation batch: " + (batch.name || journalNo);

  const fundTotals = getFundTotals(donationIds, fundDonations, currency, rates);
  const total = Array.from(fundTotals.values()).reduce((sum, amount) => sum + amount, 0);
  const rows = [{ JournalNo: journalNo, JournalDate: journalDate, AccountName: "Undeposited Funds", Debits: total.toFixed(2), Credits: "", Description: description, Name: "" }];
  fundTotals.forEach((amount, fundId) => {
    const fund = ArrayHelper.getOne(funds, "id", fundId);
    rows.push({ JournalNo: journalNo, JournalDate: journalDate, AccountName: fund?.name || "Unknown Fund", Debits: "", Credits: amount.toFixed(2), Description: description, Name: "" });
  });
  return rows;
};

export const Donations: React.FC<Props> = ({ currency = "usd", ...props }) => {
  const { batch, funds, editFunction } = props;
  const [donations, setDonations] = React.useState<DonationInterface[] | null>(null);
  const [fundDonations, setFundDonations] = React.useState<FundDonationInterface[]>([]);
  const [rates, setRates] = React.useState<Record<string, number>>({});
  const printRef = React.useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = React.useState(false);
  const onAfterPrint = React.useCallback(() => setPrinting(false), []);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: batch?.name, onAfterPrint });

  // The printout is only mounted while printing so the page doesn't carry a hidden second copy of every row.
  React.useEffect(() => {
    if (printing) handlePrint();
  }, [printing, handlePrint]);

  // Memoize permission check to avoid repeated calls
  const canEdit = React.useMemo(() => UserHelper.checkAccess(Permissions.givingApi.donations.edit), []);

  const populatePeople = React.useCallback(async (data: DonationInterface[]) => {
    const peopleIds = ArrayHelper.getIds(data, "personId");
    if (peopleIds.length > 0) {
      const people = await ApiHelper.get("/people/ids?ids=" + escape(peopleIds.join(",")), "MembershipApi");
      data.forEach((d) => {
        if (!UniqueIdHelper.isMissing(d.personId)) d.person = ArrayHelper.getOne(people, "id", d.personId);
      });
    }
    setDonations(data);
  }, []);

  const loadData = React.useCallback(() => {
    Promise.all([
      ApiHelper.get("/donations?batchId=" + batch?.id, "GivingApi"),
      // ponytail: fetches every fundDonation for the church and filters client-side (matches BatchGivingStatementsPage's existing pattern); add a batchId-filtered endpoint if this gets slow
      ApiHelper.get("/fundDonations", "GivingApi"),
      // Server-owned exchange rates for the church currency; the total row converts gifts made in other currencies.
      ApiHelper.get("/donations/exchange-rates", "GivingApi").catch(() => null)
    ]).then(([donationsData, fundDonationsData, rateTable]: [DonationInterface[], FundDonationInterface[], { rates?: Record<string, number> } | null]) => {
      setRates(rateTable?.rates || {});
      setFundDonations(fundDonationsData || []);
      populatePeople(donationsData);
    });
  }, [batch, populatePeople]);

  const getHeaderActions = React.useCallback(() => {
    if (funds.length === 0 || !donations) return null;
    const donationIds = donations.filter((d) => (d as any).status !== "refunded").map((d) => d.id || "");
    const qboRows = buildQboJournalRows(batch, donationIds, fundDonations, funds, currency, rates);
    return (
      <VerbRow>
        {donations.length > 0 && <TextAction small onClick={() => setPrinting(true)}>{Locale.label("common.print")}</TextAction>}
        {donations.length > 0 && <CsvVerb data={donations} filename="donations.csv" text={Locale.label("donations.donations.export")} />}
        {qboRows.length > 1 && <CsvVerb data={qboRows} filename="qbo-journal-entry.csv" customHeaders={QBO_HEADERS} text={Locale.label("donations.donations.exportQbo")} />}
      </VerbRow>
    );
  }, [funds, donations, fundDonations, batch, currency, rates]);

  // Memoize the total calculation to avoid recalculating on every render
  const donationsTotal = React.useMemo(() => {
    if (!donations || donations.length === 0) return 0;
    return donations.reduce((sum, donation) => {
      if ((donation as any).status === "refunded") return sum;
      return sum + CurrencyHelper.convertAmount(donation.amount || 0, donation.currency || currency, currency, rates);
    }, 0);
  }, [donations, currency, rates]);

  const isConverted = React.useMemo(
    () => (donations || []).some((d) => d.currency && d.currency.toLowerCase() !== currency.toLowerCase() && !!rates[d.currency.toUpperCase()]),
    [donations, currency, rates]
  );

  const getTableHeader = React.useCallback(() => {
    if (props.funds.length === 0 || !donations || donations.length === 0) {
      return null;
    }

    return (
      <TableHead>
        <TableRow>
          <TableCell>{Locale.label("donations.donations.method")}</TableCell>
          <TableCell>{Locale.label("common.name")}</TableCell>
          <TableCell>{Locale.label("donations.donations.date")}</TableCell>
          <TableCell>{Locale.label("donations.donations.notes")}</TableCell>
          <TableCell align="right" sx={numericCellSx}>{Locale.label("donations.donations.amt")}</TableCell>
          {canEdit && <TableCell align="right" />}
        </TableRow>
      </TableHead>
    );
  }, [donations, props.funds.length, canEdit]);

  const getRows = React.useCallback(() => {
    const rows: React.ReactNode[] = [];

    if (props.funds.length === 0 || !donations || donations.length === 0) return rows;

    for (let i = 0; i < donations.length; i++) {
      const d = donations[i];
      const editButton = canEdit ? (
        <TextAction small data-cy={`edit-link-${i}`} onClick={() => editFunction(d.id || "")}>{Locale.label("common.edit")}</TextAction>
      ) : null;

      const isPending = (d as any).status === "pending";
      const isRefunded = (d as any).status === "refunded";
      rows.push(
        <TableRow key={i} sx={{ ...hoverRowSx, opacity: isPending || isRefunded ? 0.8 : 1 }} data-testid={"donation-row-" + d.id}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{[d.method, d.methodDetails].filter(Boolean).join(" - ") || "—"}</Typography>
              {isPending && <StatusBadge tone="warning">{Locale.label("donations.donations.pending")}</StatusBadge>}
              {isRefunded && <StatusBadge>{Locale.label("donations.donations.refunded")}</StatusBadge>}
            </Stack>
          </TableCell>
          <TableCell>
            <Typography variant="body2">{d.person?.name.display || Locale.label("donations.donations.anon")}</Typography>
          </TableCell>
          <TableCell>
            <Typography variant="body2">{d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}</Typography>
          </TableCell>
          <TableCell>
            <Typography
              variant="body2"
              title={d.notes || ""}
              sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.secondary" }}>
              {d.notes || ""}
            </Typography>
          </TableCell>
          <TableCell align="right" sx={numericCellSx}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: isPending ? "warning.main" : isRefunded ? "text.disabled" : "text.primary", textDecoration: isRefunded ? "line-through" : undefined }}>
              {CurrencyHelper.formatCurrencyWithLocale(d.amount || 0, d.currency || currency)}
            </Typography>
          </TableCell>
          {canEdit && <TableCell align="right" className="rowActions">{editButton}</TableCell>}
        </TableRow>
      );
    }

    rows.push(
      <TableRow key="total" sx={{ borderTop: 2, borderColor: "divider" }}>
        <TableCell>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {Locale.label("donations.donations.total")}
          </Typography>
        </TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell align="right" sx={numericCellSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {CurrencyHelper.formatCurrencyWithLocale(donationsTotal, currency)}
          </Typography>
          {isConverted && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{Locale.label("donations.donations.convertedNote")}</Typography>}
        </TableCell>
        {canEdit && <TableCell></TableCell>}
      </TableRow>
    );

    return rows;
  }, [donations, props.funds.length, canEdit, editFunction, donationsTotal, isConverted, currency]);

  // Paper copy for the counting team: every gift, a subtotal per fund, and the batch total.
  const getPrintContent = React.useCallback(() => {
    if (!printing || !donations || donations.length === 0) return null;
    const donationIds = donations.filter((d) => (d as any).status !== "refunded").map((d) => d.id || "");
    const fundTotals = Array.from(getFundTotals(donationIds, fundDonations, currency, rates).entries())
      .map(([fundId, amount]) => ({ name: ArrayHelper.getOne(funds, "id", fundId)?.name || "Unknown Fund", amount }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return (
      <Box sx={{ display: "none" }}>
        <Box ref={printRef} sx={{ p: 2 }} data-testid="batch-print">
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
      </Box>
    );
  }, [
    printing, donations, fundDonations, funds, batch, currency, rates, donationsTotal, isConverted
  ]);

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.batch?.id)) loadData();
  }, [props.batch, loadData]);

  // Memoize the table content to avoid recreating when dependencies haven't changed
  const tableContent = React.useMemo(() => {
    if (!donations) return <Loading />;

    return (
      <Box>
        <RecordHeading label={Locale.label("donations.donations.don") + " (" + donations.length + ")"}>{getHeaderActions()}</RecordHeading>
        {props.funds.length === 0 || donations.length === 0
          ? <EmptyState variant="plain" title={Locale.label(props.funds.length === 0 ? "donations.donations.errMsg" : "donations.donations.noDonMsg")} />
          : (
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.donations.don")} tabIndex={0}>
              <Table sx={{ minWidth: 650 }}>
                {getTableHeader()}
                <TableBody>{getRows()}</TableBody>
              </Table>
            </Box>
          )}
        {getPrintContent()}
      </Box>
    );
  }, [donations, props.funds.length, getRows, getTableHeader, getHeaderActions, getPrintContent]);

  return tableContent;
};
