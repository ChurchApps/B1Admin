import React from "react";
import { BatchEdit, DonationEvents } from "./components";
import { DateHelper, UserHelper, Loading, CurrencyHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Icon, Table, TableBody, TableCell, TableRow, Box, Typography, Stack } from "@mui/material";
import { VolunteerActivism as DonationIcon, Add as AddIcon, CalendarMonth as DateIcon, Edit as EditIcon, Receipt as ReceiptIcon } from "@mui/icons-material";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CardWithHeader, EmptyState, ExportButton, PageHeaderStats, SortableTableHead, HeaderPrimaryButton, hoverRowSx } from "../components/ui";
import { useSortableData } from "../hooks";

const batchComparators = { batchDate: (a: DonationBatchInterface, b: DonationBatchInterface) => new Date(a.batchDate || 0).getTime() - new Date(b.batchDate || 0).getTime() };

export const DonationBatchesPage = () => {
  const [editBatchId, setEditBatchId] = React.useState("notset");
  const [currency, setCurrency] = React.useState<string>("usd");

  const batches = useQuery<DonationBatchInterface[]>({
    queryKey: ["/donationbatches", "GivingApi"],
    placeholderData: []
  });

  const { sorted: sortedBatches, sortBy, sortDirection, handleSort } = useSortableData<DonationBatchInterface>(batches.data || [], "", "asc", batchComparators);

  const batchUpdated = () => {
    setEditBatchId("notset");
    batches.refetch();
  };

  const showEditBatch = (e: React.MouseEvent) => {
    e.preventDefault();
    const anchor = e.currentTarget as HTMLAnchorElement;
    const id = anchor.getAttribute("data-id");
    setEditBatchId(id || "");
  };

  const [stats, setStats] = React.useState({
    totalBatches: 0,
    totalDonations: 0,
    totalAmount: 0
  });

  React.useEffect(() => {
    if (batches.data) {
      const totalBatches = batches.data.length;
      const totalDonations = batches.data.reduce((sum, batch) => sum + (batch.donationCount || 0), 0);
      const totalAmount = batches.data.reduce((sum, batch) => sum + (batch.totalAmount || 0), 0);

      setStats({
        totalBatches,
        totalDonations,
        totalAmount
      });
    }
  }, [batches.data]);

  const getSidebarModules = () => {
    const result = [];
    if (editBatchId !== "notset") result.push(<BatchEdit key={result.length - 1} batchId={editBatchId} updatedFunction={batchUpdated} />);
    return result;
  };

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (sortedBatches.length === 0) {
      result.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={5} icon={<DonationIcon />} title={Locale.label("donations.donationsPage.noBatch")} />
        </TableRow>
      );
      return result;
    }

    const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
    const canViewBatch = UserHelper.checkAccess(Permissions.givingApi.donations.view);

    for (let i = 0; i < sortedBatches.length; i++) {
      const b = sortedBatches[i];
      const editLink = canEdit ? (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-cy={`edit-${i}`} data-id={b.id} onClick={showEditBatch} />
      ) : null;

      const batchLink = canViewBatch ? (
        <Typography component={Link} to={"/donations/batches/" + b.id} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>
          {b.name}
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {b.name}
        </Typography>
      );

      const dateObj = b.batchDate ? new Date(b.batchDate.toString().split("T")[0] + "T00:00:00") : new Date();

      result.push(
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <DonationIcon sx={{ color: "primary.main", fontSize: 20 }} />
              {batchLink}
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <DateIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              <Typography variant="body2">{DateHelper.prettyDate(dateObj)}</Typography>
            </Stack>
          </TableCell>
          <TableCell align="right">
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
              <Icon sx={{ color: "text.secondary", fontSize: 18 }}>receipt</Icon>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {b.donationCount}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
              {CurrencyHelper.formatCurrencyWithLocale(b.totalAmount || 0, currency)}
            </Typography>
          </TableCell>
          <TableCell align="right" className="rowActions">{editLink}</TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const getTable = () => {
    if (batches.isLoading) return <Loading />;
    else {
      return (
        <Table sx={{ minWidth: 650 }}>
          {sortedBatches.length > 0 && (
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
      );
    }
  };

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <>
      <PageHeader
        icon={<ReceiptIcon />}
        title={Locale.label("donations.donations.batches")}
        subtitle={Locale.label("donations.donationBatchesPage.subtitle")}
      >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent={{ sm: "space-between" }}
        width="100%"
        >
          {stats.totalBatches > 0 && (
            <PageHeaderStats
              items={[
                { icon: <DonationIcon sx={{ color: "#FFF", fontSize: 24 }} />, value: stats.totalBatches, label: Locale.label("donations.donationBatchesPage.batches"), minWidth: 80 },
                { icon: <Icon sx={{ color: "#FFF", fontSize: 24 }}>receipt</Icon>, value: stats.totalDonations, label: Locale.label("donations.donationBatchesPage.donations"), minWidth: 80 },
                { value: CurrencyHelper.formatCurrencyWithLocale(stats.totalAmount, currency, 0), label: Locale.label("donations.donationBatchesPage.totalAmount") }
              ]}
            />
          )}
          {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
            <HeaderPrimaryButton
              sx={{ position: { md: "relative" }, ml: { md: "auto" }, zIndex: 1 }}
              startIcon={<AddIcon />}
              onClick={() => {
                setEditBatchId("");
              }}
              data-testid="add-batch-button">
              {Locale.label("donations.donationBatchesPage.addBatch")}
            </HeaderPrimaryButton>
          )}
        </Stack>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {editBatchId !== "notset" && <Box sx={{ mb: 3 }}>{getSidebarModules()}</Box>}

        <CardWithHeader
          icon={<DonationIcon sx={{ color: "primary.main", fontSize: 20 }} />}
          title={Locale.label("donations.donations.batches")}
          count={sortedBatches.length}
          actions={batches.data && <ExportButton data={batches.data} filename="donationbatches.csv" text={Locale.label("donations.donationBatchesPage.export")} />}
        >
          {getTable()}
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <DonationEvents />
        </Box>

        {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Link to="/donations/stripe-import" style={{ color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none" }}>
              {Locale.label("donations.donationBatchesPage.stripeImportLink")}
            </Link>
          </Box>
        )}
      </Box>
    </>
  );
};
