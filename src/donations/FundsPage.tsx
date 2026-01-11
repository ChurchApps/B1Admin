import React from "react";
import { FundEdit } from "./components";
import { UserHelper, ExportLink, Loading, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import {
  Icon, Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Card, Stack, Button
} from "@mui/material";
import { VolunteerActivism as FundIcon, Add as AddIcon, FileDownload as ExportIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

export const FundsPage = () => {
  const [editFundId, setEditFundId] = React.useState("notset");
  const [sortDirection, setSortDirection] = React.useState<boolean | null>(null);
  const [currentSortedCol, setCurrentSortedCol] = React.useState<string>("");

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: [],
  });

  const fundUpdated = () => {
    setEditFundId("notset");
    funds.refetch();
  };

  const showEditFund = (e: React.MouseEvent) => {
    e.preventDefault();
    const anchor = e.currentTarget as HTMLAnchorElement;
    const id = anchor.getAttribute("data-id");
    setEditFundId(id);
  };

  const [stats, setStats] = React.useState({ totalFunds: 0 });

  React.useEffect(() => {
    if (funds.data) {
      const totalFunds = funds.data.length;

      setStats({ totalFunds });
    }
  }, [funds.data]);

  const getSidebarModules = () => {
    const result = [];
    if (editFundId !== "notset") {
      const fund = editFundId === "" ? { id: "", name: "", taxDeductible: true } : funds.data.find((f) => f.id === editFundId);
      result.push(<FundEdit key={result.length - 1} fund={fund} updatedFunction={fundUpdated} />);
    }
    return result;
  };

  const sortTable = (key: string, asc: boolean | null) => {
    if (asc === null) asc = false;
    setCurrentSortedCol(key);

    // Note: With React Query, we can't directly mutate the cached data
    // This sort functionality would need to be implemented differently
    // or moved to server-side sorting
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

    if (funds.data.length === 0) {
      result.push(
        <TableRow key="0">
          <TableCell colSpan={3} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <FundIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body1" color="text.secondary">
                {Locale.label("donations.funds.noFund")}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return result;
    }

    const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
    const canViewFund = UserHelper.checkAccess(Permissions.givingApi.donations.view);

    for (let i = 0; i < funds.data.length; i++) {
      const f = funds.data[i];
      const editLink = canEdit ? (
        <Button size="small" variant="outlined" startIcon={<Icon>edit</Icon>} data-cy={`edit-${i}`} data-id={f.id} onClick={showEditFund} sx={{ minWidth: "auto" }}>
          Edit
        </Button>
      ) : null;

      const fundLink = canViewFund ? (
        <Link
          to={"/donations/funds/" + f.id}
          style={{
            textDecoration: "none",
            color: "var(--c1l2)",
            fontWeight: 500,
          }}>
          {f.name}
        </Link>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {f.name}
        </Typography>
      );

      result.push(
        <TableRow
          key={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease",
          }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <FundIcon sx={{ color: "var(--c1l2)", fontSize: 20 }} />
              {fundLink}
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              {f.taxDeductible ? (
                <>
                  <Icon sx={{ color: "success.main", fontSize: 18 }}>check_circle</Icon>
                  <Typography variant="body2" sx={{ color: "success.main", fontWeight: 500 }}>
                    Tax Deductible
                  </Typography>
                </>
              ) : (
                <>
                  <Icon sx={{ color: "warning.main", fontSize: 18 }}>info</Icon>
                  <Typography variant="body2" sx={{ color: "warning.main", fontWeight: 500 }}>
                    Non-Deductible
                  </Typography>
                </>
              )}
            </Stack>
          </TableCell>
          <TableCell>{editLink}</TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];

    if (funds.data.length === 0) {
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
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Tax Status
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
    if (funds.isLoading) return <Loading />;
    else {
      return (
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: "var(--bg-card)",
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
        icon={<FundIcon />}
        title={Locale.label("donations.donations.funds")}
        subtitle={Locale.label("donations.fundsPage.subtitle")}
      >
        {stats.totalFunds > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 2, md: 4 }}
            sx={{
              position: { xs: "static", md: "absolute" },
              left: { md: "50%" },
              top: { md: "50%" },
              transform: { md: "translateY(-50%)" },
              right: { md: "24px" },
              justifyContent: { md: "space-between" },
              flexWrap: "wrap"
            }}
          >
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FundIcon sx={{ color: "#FFF", fontSize: 24 }} />
                <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalFunds}</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Funds</Typography>
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
            }}
            startIcon={<AddIcon />}
            onClick={() => {
              setEditFundId("");
            }}
            data-testid="add-fund-button">
            Add Fund
          </Button>
        )}
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Edit content appears above when editing */}
        {editFundId !== "notset" && <Box sx={{ mb: 3 }}>{getSidebarModules()}</Box>}

        {/* Main table */}
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <FundIcon />
                <Typography variant="h6">{Locale.label("donations.funds.fund")}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {funds.data && (
                  <Button size="small" variant="outlined" startIcon={<ExportIcon />} component={ExportLink} data={funds.data} filename="funds.csv" sx={{ mr: 1 }}>
                    Export
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>
      </Box>
    </>
  );
};
