import React from "react";
import { BatchEdit, DonationEvents } from "./components";
import { DateHelper, UserHelper, ExportLink, Loading, CurrencyHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Icon, Table, TableBody, TableCell, TableRow, Box, Typography, Card, Stack, Button } from "@mui/material";
import { VolunteerActivism as DonationIcon, Add as AddIcon, FileDownload as ExportIcon, CalendarMonth as DateIcon, Edit as EditIcon } from "@mui/icons-material";
import { AppIconButton } from "../components/ui/AppIconButton";
import { EmptyState, SortableTableHead, type SortDirection } from "../components/ui";

export const DonationBatchesPage = () => {
  const [editBatchId, setEditBatchId] = React.useState("notset");
  const [sortBy, setSortBy] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [currency, setCurrency] = React.useState<string>("usd");

  const batches = useQuery<DonationBatchInterface[]>({
    queryKey: ["/donationbatches", "GivingApi"],
    placeholderData: []
  });

  const batchUpdated = () => {
    setEditBatchId("notset");
    batches.refetch();
  };

  const showEditBatch = (e: React.MouseEvent) => {
    e.preventDefault();
    const anchor = e.currentTarget as HTMLAnchorElement;
    const id = anchor.getAttribute("data-id");
    setEditBatchId(id);
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

  const handleSort = (key: string) => {
    setSortDirection(sortBy === key && sortDirection === "asc" ? "desc" : "asc");
    setSortBy(key);
  };

  const sortedBatches = React.useMemo(() => {
    const result = [...(batches.data || [])];
    if (sortBy) {
      const dir = sortDirection === "asc" ? 1 : -1;
      result.sort((a: any, b: any) => {
        if (sortBy === "batchDate") return (new Date(a.batchDate).getTime() - new Date(b.batchDate).getTime()) * dir;
        return (a[sortBy] || "").toString().toUpperCase().localeCompare((b[sortBy] || "").toString().toUpperCase()) * dir;
      });
    }
    return result;
  }, [batches.data, sortBy, sortDirection]);

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
        <TableRow
          key={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease"
          }}>
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
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon sx={{ color: "text.secondary", fontSize: 18 }}>receipt</Icon>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {b.donationCount}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
              {CurrencyHelper.formatCurrencyWithLocale(b.totalAmount, currency)}
            </Typography>
          </TableCell>
          <TableCell>{editLink}</TableCell>
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
                { key: "donationCount", label: Locale.label("donations.donationsPage.don") },
                { key: "totalAmount", label: Locale.label("donations.donationsPage.total") },
                { key: "edit", label: Locale.label("common.edit") }
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
        title={Locale.label("donations.donations.batches")}
        subtitle={Locale.label("donations.donationBatchesPage.subtitle")}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ width: "100%" }}
        >
          {stats.totalBatches > 0 && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 4, md: 5 }}
              sx={{
                position: { xs: "static", md: "absolute" },
                left: { md: "50%" },
                top: { md: "50%" },
                transform: { md: "translateY(-50%)" },
                flexWrap: "wrap"
              }}
            >
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <DonationIcon sx={{ color: "#FFF", fontSize: 24 }} />
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalBatches}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("donations.donationBatchesPage.batches")}</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Icon sx={{ color: "#FFF", fontSize: 24 }}>receipt</Icon>
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalDonations}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("donations.donationBatchesPage.donations")}</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 100 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {/* <Icon sx={{ color: "#FFF", fontSize: 24 }}>attach_money</Icon> */}
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{CurrencyHelper.formatCurrencyWithLocale(stats.totalAmount, currency, 0)}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("donations.donationBatchesPage.totalAmount")}</Typography>
              </Stack>
            </Stack>
          )}
          {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
            <Button
              variant="outlined"
              sx={{
                color: "#FFF",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": {
                  borderColor: "#FFF",
                  backgroundColor: "rgba(255,255,255,0.1)"
                },
                position: { md: "relative" },
                ml: { md: "auto" },
                zIndex: 1
              }}
              startIcon={<AddIcon />}
              onClick={() => {
                setEditBatchId("");
              }}
              data-testid="add-batch-button">
              {Locale.label("donations.donationBatchesPage.addBatch")}
            </Button>
          )}
        </Stack>
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Edit content appears above when editing */}
        {editBatchId !== "notset" && <Box sx={{ mb: 3 }}>{getSidebarModules()}</Box>}

        {/* Main table */}
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <DonationIcon />
                <Typography variant="h6">{Locale.label("donations.donationsPage.batch")}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {batches.data && (
                  <Button size="small" variant="outlined" startIcon={<ExportIcon />} component={ExportLink} data={batches.data} filename="donationbatches.csv" sx={{ mr: 1 }}>
                    {Locale.label("donations.donationBatchesPage.export")}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>

        {/* Events section */}
        <Box sx={{ mt: 3 }}>
          <DonationEvents />
        </Box>

        {/* Stripe Import link */}
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
