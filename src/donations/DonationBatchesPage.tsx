import React from "react";
import { BatchEdit, DonationEvents } from "./components";
import { DateHelper, UserHelper, Loading, CurrencyHelper, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableRow, Box } from "@mui/material";
import { VolunteerActivism as DonationIcon, Edit as EditIcon } from "@mui/icons-material";
import { AppIconButton } from "../components/ui/AppIconButton";
import { EmptyState, ExportButton, SortableTableHead, hoverRowSx } from "../components/ui";
import { useSortableData } from "../hooks";
import { useRequirePermission } from "../hooks";
import { Verb, VerbRow, SectionTitle, YearPills, plateSx, plainTableSx, mutedSx, yearsFromDates, withCurrentYear, pickPlateYear } from "./components/plate";

const batchComparators = { batchDate: (a: DonationBatchInterface, b: DonationBatchInterface) => new Date(a.batchDate || 0).getTime() - new Date(b.batchDate || 0).getTime() };

export const DonationBatchesPage = () => {
  const [editBatchId, setEditBatchId] = React.useState("notset");
  const [currency, setCurrency] = React.useState<string>("usd");
  const [year, setYear] = React.useState<number | null>(null);
  const [eventsOpen, setEventsOpen] = React.useState(false);

  const batches = useQuery<DonationBatchInterface[]>({
    queryKey: ["/donationbatches", "GivingApi"],
    placeholderData: []
  });

  const { sorted: sortedBatches, sortBy, sortDirection, handleSort } = useSortableData<DonationBatchInterface>(batches.data || [], "", "asc", batchComparators);

  const refetchBatches = batches.refetch;
  const batchUpdated = React.useCallback(() => {
    setEditBatchId("notset");
    refetchBatches();
  }, [refetchBatches]);

  const showEditBatch = (e: React.MouseEvent) => {
    e.preventDefault();
    const anchor = e.currentTarget as HTMLAnchorElement;
    const id = anchor.getAttribute("data-id");
    setEditBatchId(id || "");
  };

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const dataYears = yearsFromDates((batches.data || []).map((b) => b.batchDate));
  const years = withCurrentYear(dataYears);
  const plateYear = year ?? pickPlateYear(dataYears);
  const yearBatches = sortedBatches.filter((b) => {
    if (!b.batchDate) return true;
    return new Date(b.batchDate.toString().split("T")[0] + "T00:00:00").getFullYear() === plateYear;
  });

  const totalDonations = yearBatches.reduce((sum, batch) => sum + (batch.donationCount || 0), 0);
  const totalAmount = yearBatches.reduce((sum, batch) => sum + (batch.totalAmount || 0), 0);

  const editBatch = editBatchId === "notset" ? undefined : editBatchId === "" ? {} : (sortedBatches.find((b) => b.id === editBatchId) || { id: editBatchId });
  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
  const canViewBatch = UserHelper.checkAccess(Permissions.givingApi.donations.view);

  const denied = useRequirePermission(Permissions.givingApi.donations.viewSummary);
  if (denied) return denied;

  const getRows = () => {
    if (yearBatches.length === 0) {
      return (
        <TableRow key="0">
          <EmptyState variant="table" colSpan={5} icon={<DonationIcon />} title={Locale.label("donations.donationsPage.noBatch")} />
        </TableRow>
      );
    }

    return yearBatches.map((b, i) => {
      const editLink = canEdit ? (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-cy={`edit-${i}`} data-id={b.id} onClick={showEditBatch} />
      ) : null;
      const batchLink = canViewBatch ? (
        <Box component={Link} to={"/donations/batches/" + b.id} sx={{ textDecoration: "none", color: "var(--c1)", fontWeight: 500 }}>{b.name}</Box>
      ) : (
        <Box sx={{ fontWeight: 500 }}>{b.name}</Box>
      );
      const dateObj = b.batchDate ? new Date(b.batchDate.toString().split("T")[0] + "T00:00:00") : new Date();
      return (
        <TableRow key={b.id || i} sx={hoverRowSx}>
          <TableCell>{batchLink}</TableCell>
          <TableCell><Box component="p" sx={{ m: 0 }}>{DateHelper.prettyDate(dateObj)}</Box></TableCell>
          <TableCell align="right">{b.donationCount}</TableCell>
          <TableCell align="right" className="amt">{CurrencyHelper.formatCurrencyWithLocale(b.totalAmount || 0, currency)}</TableCell>
          <TableCell align="right" className="rowActions">{editLink}</TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Box sx={plateSx}>
      <SectionTitle sx={{ mt: 0 }}>{Locale.label("donations.donations.batches")}</SectionTitle>
      <Box sx={mutedSx}>
        {yearBatches.length} {Locale.label("donations.donationBatchesPage.batches")?.toLowerCase() || "batches"} · {totalDonations} {Locale.label("donations.donationBatchesPage.donations")?.toLowerCase() || "gifts"} · {CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency, 0)}
      </Box>
      <YearPills years={years} value={plateYear} onChange={setYear} />
      {editBatch && <Box sx={{ mt: 2 }}><BatchEdit key={editBatchId || "new"} batch={editBatch} updatedFunction={batchUpdated} /></Box>}
      {batches.isLoading ? <Loading /> : (
        <Table sx={plainTableSx}>
          {yearBatches.length > 0 && (
            <SortableTableHead
              columns={[
                { key: "name", label: Locale.label("common.name"), sortable: true },
                { key: "batchDate", label: Locale.label("donations.donationsPage.date"), sortable: true },
                { key: "donationCount", label: Locale.label("donations.donationsPage.don"), align: "right" },
                { key: "totalAmount", label: Locale.label("donations.donationsPage.total"), align: "right" },
                { key: "edit", label: "", align: "right" }
              ]}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}
          <TableBody>{getRows()}</TableBody>
        </Table>
      )}
      <VerbRow>
        {canEdit && <Verb onClick={() => setEditBatchId("")} data-testid="add-batch-button">{Locale.label("donations.donationBatchesPage.addBatch")}</Verb>}
        {batches.data && <ExportButton data={yearBatches} filename="donationbatches.csv" text={Locale.label("donations.donationBatchesPage.export")} />}
        <Verb onClick={() => setEventsOpen(!eventsOpen)}>Failed events</Verb>
        {canEdit && <Verb href="/donations/stripe-import">{Locale.label("donations.donationBatchesPage.stripeImportLink")}</Verb>}
      </VerbRow>
      {eventsOpen && <Box sx={{ mt: 3 }}><DonationEvents /></Box>}
    </Box>
  );
};
