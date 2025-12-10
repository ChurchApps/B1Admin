import React from "react";
import { BatchEdit, DonationEvents } from "./components";
import { DateHelper, UserHelper, ExportLink, Loading, CurrencyHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import {
  Icon, Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Card, Stack, Button
} from "@mui/material";
import { VolunteerActivism as DonationIcon, Add as AddIcon, FileDownload as ExportIcon, CalendarMonth as DateIcon } from "@mui/icons-material";

export const DonationBatchesPage = () => {
  const [editBatchId, setEditBatchId] = React.useState("notset");
  const [sortDirection, setSortDirection] = React.useState<boolean | null>(null);
  const [currentSortedCol, setCurrentSortedCol] = React.useState<string>("");

  const batches = useQuery<DonationBatchInterface[]>({
    queryKey: ["/donationbatches", "GivingApi"],
    placeholderData: [],
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
    totalAmount: 0,
  });

  React.useEffect(() => {
    if (batches.data) {
      const totalBatches = batches.data.length;
      const totalDonations = batches.data.reduce((sum, batch) => sum + (batch.donationCount || 0), 0);
      const totalAmount = batches.data.reduce((sum, batch) => sum + (batch.totalAmount || 0), 0);

      setStats({
        totalBatches,
        totalDonations,
        totalAmount,
      });
    }
  }, [batches.data]);

  const getSidebarModules = () => {
    const result = [];
    if (editBatchId !== "notset") result.push(<BatchEdit key={result.length - 1} batchId={editBatchId} updatedFunction={batchUpdated} />);
    return result;
  };

  const sortTable = (key: string, asc: boolean | null) => {
    if (asc === null) asc = false;
    setCurrentSortedCol(key);

    batches.data.sort(function (a: any, b: any) {
      if (a[key] === null) return Infinity;

      if (key === "batchDate") {
        if (typeof new Date(a[key]).getMonth === "function") {
          return asc ? new Date(a[key])?.getTime() - new Date(b[key])?.getTime() : new Date(b[key])?.getTime() - new Date(a[key])?.getTime();
        }
      }

      const parsedNum = parseInt(a[key]);
      if (!isNaN(parsedNum)) {
        return asc ? a[key] - b[key] : b[key] - a[key];
      }

      const valA = a[key].toUpperCase();
      const valB = b[key].toUpperCase();
      if (valA < valB) {
        return asc ? 1 : -1;
      }
      if (valA > valB) {
        return asc ? -1 : 1;
      }

      return 0;
    });
    batches.refetch();
    setSortDirection(!asc);
  };

  const getSortArrows = (key: string) => (
    <div style={{ display: "flex" }}>
      <div style={{ marginTop: "5px" }} className={`${sortDirection && currentSortedCol === key ? "sortAscActive" : "sortAsc"}`}></div>
      <div style={{ marginTop: "14px" }} className={`${!sortDirection && currentSortedCol === key ? "sortDescActive" : "sortDesc"}`}></div>
    </div>
  );

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (batches.data.length === 0) {
      result.push(
        <TableRow key="0">
          <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <DonationIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body1" color="text.secondary">
                {Locale.label("donations.donationsPage.noBatch")}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return result;
    }

    const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
    const canViewBatch = UserHelper.checkAccess(Permissions.givingApi.donations.view);

    for (let i = 0; i < batches.data.length; i++) {
      const b = batches.data[i];
      const editLink = canEdit ? (
        <Button size="small" variant="outlined" startIcon={<Icon>edit</Icon>} data-cy={`edit-${i}`} data-id={b.id} onClick={showEditBatch} sx={{ minWidth: "auto" }}>
          Edit
        </Button>
      ) : null;

      const batchLink = canViewBatch ? (
        <Link
          to={"/donations/batches/" + b.id}
          style={{
            textDecoration: "none",
            color: "var(--c1l2)",
            fontWeight: 500,
          }}>
          {b.name}
        </Link>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {b.name}
        </Typography>
      );

      const dateObj = new Date(b.batchDate.toString().split("T")[0] + "T00:00:00");

      result.push(
        <TableRow
          key={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease",
          }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <DonationIcon sx={{ color: "var(--c1l2)", fontSize: 20 }} />
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
              {CurrencyHelper.formatCurrency(b.totalAmount)}
            </Typography>
          </TableCell>
          <TableCell>{editLink}</TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];

    if (batches.data.length === 0) {
      return rows;
    }

    rows.push(
      <TableRow key="header">
        <TableCell
          sx={{
            fontWeight: 600,
            cursor: "pointer",
            "&:hover": { backgroundColor: "action.hover" },
          }}
          onClick={() => sortTable("name", sortDirection)}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {Locale.label("common.name")}
            </Typography>
            {getSortArrows("name")}
          </Stack>
        </TableCell>
        <TableCell
          sx={{
            fontWeight: 600,
            cursor: "pointer",
            "&:hover": { backgroundColor: "action.hover" },
          }}
          onClick={() => sortTable("batchDate", sortDirection)}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {Locale.label("donations.donationsPage.date")}
            </Typography>
            {getSortArrows("batchDate")}
          </Stack>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("donations.donationsPage.don")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("donations.donationsPage.total")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("common.edit")}
          </Typography>
        </TableCell>
      </TableRow>
    );
    return rows;
  };

  const getTable = () => {
    if (batches.isLoading) return <Loading />;
    else {
      return (
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: "grey.50",
              "& .MuiTableCell-root": {
                borderBottom: "2px solid",
                borderBottomColor: "divider",
              },
            }}>
            {getTableHeader()}
          </TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      );
    }
  };

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <>
      <PageHeader
        icon={<DonationIcon />}
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
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Batches</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Icon sx={{ color: "#FFF", fontSize: 24 }}>receipt</Icon>
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalDonations}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Donations</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 100 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Icon sx={{ color: "#FFF", fontSize: 24 }}>attach_money</Icon>
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalAmount.toLocaleString("en-US", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Amount</Typography>
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
                  backgroundColor: "rgba(255,255,255,0.1)",
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
              Add Batch
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
                    Export
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
            <Link to="/donations/stripe-import" style={{ color: "#999", fontSize: "0.85rem", textDecoration: "none" }}>
              Import missing Stripe transactions
            </Link>
          </Box>
        )}
      </Box>
    </>
  );
};
