import React from "react";
import { BatchEdit, DonationEvents } from "./components";
import { DateHelper, UserHelper, Loading, CurrencyHelper, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableRow, Box, Link as MuiLink, Stack } from "@mui/material";
import { VolunteerActivism as DonationIcon } from "@mui/icons-material";
import { PageHeader, PageContainer, Surface, EmptyState, SortableTableHead, AddBar, TextAction, VerbRow, YearPills, hoverRowSx, numericCellSx, tableScrollSx, yearOf, yearsFromDates, withCurrentYear } from "../components/ui";
import { useSortableData } from "../hooks";
import { useRequirePermission } from "../hooks";
import { CsvVerb, Lede } from "./components/GivingParts";

type BatchRow = DonationBatchInterface & { isConverted?: boolean };

const batchComparators = { batchDate: (a: DonationBatchInterface, b: DonationBatchInterface) => new Date(a.batchDate || 0).getTime() - new Date(b.batchDate || 0).getTime() };

export const DonationBatchesPage = () => {
  const [editBatchId, setEditBatchId] = React.useState("notset");
  const [currency, setCurrency] = React.useState<string>("usd");
  const [year, setYear] = React.useState<number | null>(null);
  const [eventsOpen, setEventsOpen] = React.useState(false);

  // Each batch's totalAmount arrives already converted into the church currency by the Api, so they can be added up.
  const batches = useQuery<BatchRow[]>({
    queryKey: ["/donationbatches", "GivingApi"],
    placeholderData: []
  });
  const eventLogs = useQuery<{ resolved?: boolean }[]>({ queryKey: ["/eventLog/type/failed", "GivingApi"], placeholderData: [] });

  const { sorted: sortedBatches, sortBy, sortDirection, handleSort } = useSortableData<BatchRow>(batches.data || [], "", "asc", batchComparators);

  const refetchBatches = batches.refetch;
  const batchUpdated = React.useCallback(() => {
    setEditBatchId("notset");
    refetchBatches();
  }, [refetchBatches]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const denied = useRequirePermission(Permissions.givingApi.donations.viewSummary);
  if (denied) return denied;

  const years = withCurrentYear(yearsFromDates((batches.data || []).map((b) => b.batchDate)));
  const yearBatches = year === null ? sortedBatches : sortedBatches.filter((b) => yearOf(b.batchDate) === year);
  const totalDonations = yearBatches.reduce((sum, b) => sum + (b.donationCount || 0), 0);
  const totalAmount = yearBatches.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const isConverted = yearBatches.some((b) => b.isConverted);
  const unresolvedEvents = (eventLogs.data || []).filter((log) => !log.resolved).length;

  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
  const canViewBatch = UserHelper.checkAccess(Permissions.givingApi.donations.view);

  const editBatch = editBatchId === "notset" ? undefined : editBatchId === "" ? {} : (sortedBatches.find((b) => b.id === editBatchId) || { id: editBatchId });

  const getRows = () => {
    if (yearBatches.length === 0) {
      return (
        <TableRow key="0">
          <EmptyState variant="table" colSpan={5} icon={<DonationIcon />} title={Locale.label("donations.donationsPage.noBatch")} />
        </TableRow>
      );
    }

    return yearBatches.map((b, i) => {
      const dateObj = b.batchDate ? new Date(b.batchDate.toString().split("T")[0] + "T00:00:00") : new Date();
      return (
        <TableRow key={b.id || i} sx={hoverRowSx}>
          <TableCell>
            {canViewBatch
              ? <MuiLink component={Link} to={"/donations/batches/" + b.id} underline="hover" sx={{ fontWeight: 600 }}>{b.name}</MuiLink>
              : <Box component="span" sx={{ fontWeight: 600 }}>{b.name}</Box>}
          </TableCell>
          <TableCell><Box component="p" sx={{ m: 0 }}>{DateHelper.prettyDate(dateObj)}</Box></TableCell>
          <TableCell align="right" sx={numericCellSx}>{b.donationCount}</TableCell>
          <TableCell align="right" sx={numericCellSx}>
            <Box component="span" data-testid="batch-row-total" sx={{ fontWeight: 600 }}>{CurrencyHelper.formatCurrencyWithLocale(b.totalAmount || 0, currency)}</Box>
          </TableCell>
          <TableCell align="right">
            {canEdit && <TextAction small data-cy={`edit-${i}`} onClick={() => setEditBatchId(b.id || "")}>{Locale.label("common.edit")}</TextAction>}
          </TableCell>
        </TableRow>
      );
    });
  };

  const lede = [
    Locale.label("donations.donationBatchesPage.batchCount", "{count} batches").replace("{count}", yearBatches.length.toString()),
    Locale.label("donations.donationBatchesPage.giftCount", "{count} gifts").replace("{count}", totalDonations.toString()),
    CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency, 0) + (isConverted ? " (" + Locale.label("donations.donations.convertedNote") + ")" : "")
  ].join(" · ");

  return (
    <>
      <PageHeader title={Locale.label("donations.donations.batches")} subtitle={Locale.label("donations.donationBatchesPage.subtitle")} />

      <PageContainer>
        {editBatch && <Box sx={{ mb: 3 }}><BatchEdit key={editBatchId || "new"} batch={editBatch} updatedFunction={batchUpdated} /></Box>}

        <Surface>
          <Stack spacing={2} sx={{ mb: 2 }}>
            {!batches.isLoading && <Lede data-testid="batches-lede">{lede}</Lede>}
            <YearPills years={years} value={year} onChange={setYear} allLabel={Locale.label("donations.donationBatchesPage.allYears", "All")} />
          </Stack>

          {batches.isLoading ? <Loading /> : (
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.donations.batches")} tabIndex={0}>
              <Table sx={{ minWidth: 650 }}>
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
            </Box>
          )}

          <AddBar>
            <VerbRow>
              {canEdit && <TextAction onClick={() => setEditBatchId("")} data-testid="add-batch-button">{Locale.label("donations.donationBatchesPage.addBatch")}</TextAction>}
              {yearBatches.length > 0 && <CsvVerb data={yearBatches} filename="donationbatches.csv" text={Locale.label("donations.donationBatchesPage.export")} />}
              {(eventLogs.data?.length || 0) > 0 && (
                <TextAction onClick={() => setEventsOpen(!eventsOpen)} data-testid="failed-events-verb">
                  {Locale.label("donations.donationBatchesPage.failedEvents", "Failed events ({count})").replace("{count}", unresolvedEvents.toString())}
                </TextAction>
              )}
              {canEdit && <TextAction to="/donations/stripe-import" component={Link}>{Locale.label("donations.donationBatchesPage.stripeImportLink")}</TextAction>}
            </VerbRow>
          </AddBar>

          {eventsOpen && <Box sx={{ mt: 3 }}><DonationEvents /></Box>}
        </Surface>
      </PageContainer>
    </>
  );
};
