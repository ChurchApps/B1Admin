import React from "react";
import { ArrayHelper, ApiHelper, UserHelper, DateHelper, CurrencyHelper, Permissions, UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { type DonationInterface, type DonationBatchInterface, type FundInterface, type FundDonationInterface } from "@churchapps/helpers";
import { Table, TableBody, TableCell, TableRow, TableHead, Typography, Chip } from "@mui/material";
import { Edit as EditIcon, VolunteerActivism as DonationIcon, HourglassEmpty as PendingIcon, Undo as RefundedIcon } from "@mui/icons-material";
import { EmptyState } from "../../components";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { ExportButton, hoverRowSx } from "../../components/ui";
import { VerbRow, plainTableSx } from "./plate";

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

// QBO Journal Entry import format: one debit line (Undeposited Funds) plus one credit line per fund.
const buildQboJournalRows = (batch: DonationBatchInterface, donationIds: string[], fundDonations: FundDonationInterface[], funds: FundInterface[]) => {
  const journalNo = batch.id || "";
  const journalDate = batch.batchDate ? batch.batchDate.split("T")[0] : "";
  const description = "Donation batch: " + (batch.name || journalNo);

  const fundTotals = new Map<string, number>();
  fundDonations
    .filter((fd) => donationIds.includes(fd.donationId || ""))
    .forEach((fd) => fundTotals.set(fd.fundId || "", (fundTotals.get(fd.fundId || "") || 0) + (fd.amount || 0)));

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
      ApiHelper.get("/fundDonations", "GivingApi")
    ]).then(([donationsData, fundDonationsData]: [DonationInterface[], FundDonationInterface[]]) => {
      setFundDonations(fundDonationsData || []);
      populatePeople(donationsData);
    });
  }, [batch, populatePeople]);

  const getHeaderActions = React.useCallback(() => {
    if (funds.length === 0 || !donations) return null;
    const donationIds = donations.map((d) => d.id || "");
    const qboRows = buildQboJournalRows(batch, donationIds, fundDonations, funds);
    return (
      <VerbRow>
        <ExportButton data={donations} filename="donations.csv" text={Locale.label("donations.donations.export")} />
        {qboRows.length > 1 && <ExportButton data={qboRows} filename="qbo-journal-entry.csv" customHeaders={QBO_HEADERS} text={Locale.label("donations.donations.exportQbo")} />}
      </VerbRow>
    );
  }, [funds, donations, fundDonations, batch]);

  const showEditDonation = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const button = e.currentTarget as HTMLButtonElement;
      const id = button.getAttribute("data-id");
      editFunction(id || "");
    },
    [editFunction]
  );

  // Memoize the total calculation to avoid recalculating on every render
  const donationsTotal = React.useMemo(() => {
    if (!donations || donations.length === 0) return 0;
    return donations.reduce((sum, donation) => sum + ((donation as any).status === "refunded" ? 0 : donation.amount || 0), 0);
  }, [donations]);

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
          <TableCell align="right">{Locale.label("donations.donations.amt")}</TableCell>
          {canEdit && <TableCell align="right" />}
        </TableRow>
      </TableHead>
    );
  }, [donations, props.funds.length, canEdit]);

  const getRows = React.useCallback(() => {
    const rows: React.ReactNode[] = [];

    if (props.funds.length === 0) {
      rows.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={6} icon={<DonationIcon />} title={Locale.label("donations.donations.errMsg")} />
        </TableRow>
      );
      return rows;
    }

    if (!donations || donations.length === 0) {
      rows.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={6} icon={<DonationIcon />} title={Locale.label("donations.donations.noDonMsg")} />
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < donations.length; i++) {
      const d = donations[i];
      const editButton = canEdit ? (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-cy={`edit-link-${i}`} data-id={d.id} onClick={showEditDonation} />
      ) : null;

      const isPending = (d as any).status === "pending";
      const isRefunded = (d as any).status === "refunded";
      rows.push(
        <TableRow key={i} sx={{ ...hoverRowSx, opacity: isPending || isRefunded ? 0.8 : 1 }} data-testid={"donation-row-" + d.id}>
          <TableCell>
            {[d.method, d.methodDetails].filter(Boolean).join(" - ") || "—"}
            {isPending && <Chip icon={<PendingIcon />} label={Locale.label("donations.donations.pending")} size="small" color="warning" variant="outlined" sx={{ ml: 1 }} />}
            {isRefunded && <Chip icon={<RefundedIcon />} label={Locale.label("donations.donations.refunded")} size="small" color="default" variant="outlined" sx={{ ml: 1 }} />}
          </TableCell>
          <TableCell>{d.person?.name.display || Locale.label("donations.donations.anon")}</TableCell>
          <TableCell>{d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}</TableCell>
          <TableCell>
            <Typography title={d.notes || ""} sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.92rem" }}>
              {d.notes || ""}
            </Typography>
          </TableCell>
          <TableCell className="amt" sx={{ fontWeight: 600, color: isPending ? "warning.main" : isRefunded ? "var(--text-muted)" : "success.main", textDecoration: isRefunded ? "line-through" : undefined }}>
            {CurrencyHelper.formatCurrencyWithLocale(d.amount || 0, currency)}
          </TableCell>
          {canEdit && <TableCell align="right" className="rowActions">{editButton}</TableCell>}
        </TableRow>
      );
    }

    rows.push(
      <TableRow key="total">
        <TableCell sx={{ fontWeight: 600 }}>{Locale.label("donations.donations.total")}</TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell className="amt" sx={{ fontWeight: 600 }}>{CurrencyHelper.formatCurrencyWithLocale(donationsTotal, currency)}</TableCell>
        {canEdit && <TableCell></TableCell>}
      </TableRow>
    );

    return rows;
  }, [donations, props.funds.length, canEdit, showEditDonation, donationsTotal]);

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.batch?.id)) loadData();
  }, [props.batch, loadData]);

  // Memoize the table content to avoid recreating when dependencies haven't changed
  const tableContent = React.useMemo(() => {
    if (!donations) return <Loading />;

    return (
      <>
        {getHeaderActions()}
        <Table sx={plainTableSx}>
          {getTableHeader()}
          <TableBody>{getRows()}</TableBody>
        </Table>
      </>
    );
  }, [donations, getRows, getTableHeader, getHeaderActions]);

  return tableContent;
};
