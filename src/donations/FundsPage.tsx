import React from "react";
import { FundEdit } from "./components";
import { UserHelper, Loading, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Icon, Table, TableBody, TableCell, TableRow, Box, Typography, Card, Stack, Button } from "@mui/material";
import { VolunteerActivism as FundIcon, Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CountChip, EmptyState, ExportButton, SortableTableHead, type SortDirection } from "../components/ui";

export const FundsPage = () => {
  const [editFundId, setEditFundId] = React.useState("notset");
  const [sortBy, setSortBy] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
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

  const handleSort = (key: string) => {
    setSortDirection(sortBy === key && sortDirection === "asc" ? "desc" : "asc");
    setSortBy(key);
  };

  const sortedFunds = React.useMemo(() => {
    const result = [...(funds.data || [])];
    if (sortBy) {
      const dir = sortDirection === "asc" ? 1 : -1;
      result.sort((a: any, b: any) => (a[sortBy] || "").toString().toUpperCase().localeCompare((b[sortBy] || "").toString().toUpperCase()) * dir);
    }
    return result;
  }, [funds.data, sortBy, sortDirection]);

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (sortedFunds.length === 0) {
      result.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={3} icon={<FundIcon />} title={Locale.label("donations.funds.noFund")} />
        </TableRow>
      );
      return result;
    }

    const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
    const canViewFund = UserHelper.checkAccess(Permissions.givingApi.donations.view);

    for (let i = 0; i < sortedFunds.length; i++) {
      const f = sortedFunds[i];
      const editLink = canEdit ? (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-cy={`edit-${i}`} data-id={f.id} onClick={showEditFund} />
      ) : null;

      const fundLink = canViewFund ? (
        <Typography component={Link} to={"/donations/funds/" + f.id} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>
          {f.name}
        </Typography>
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
            transition: "background-color 0.2s ease"
          }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <FundIcon sx={{ color: "primary.main", fontSize: 20 }} />
              {fundLink}
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              {f.taxDeductible ? (
                <>
                  <Icon sx={{ color: "success.main", fontSize: 18 }}>check_circle</Icon>
                  <Typography variant="body2" sx={{ color: "success.main", fontWeight: 500 }}>
                    {Locale.label("donations.fundsPage.taxDeductible")}
                  </Typography>
                </>
              ) : (
                <>
                  <Icon sx={{ color: "warning.main", fontSize: 18 }}>info</Icon>
                  <Typography variant="body2" sx={{ color: "warning.main", fontWeight: 500 }}>
                    {Locale.label("donations.fundsPage.nonDeductible")}
                  </Typography>
                </>
              )}
            </Stack>
          </TableCell>
          <TableCell align="right" className="rowActions">{editLink}</TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const getTable = () => {
    if (funds.isLoading) return <Loading />;
    else {
      return (
        <Table sx={{ minWidth: 650 }}>
          {sortedFunds.length > 0 && (
            <SortableTableHead
              columns={[
                { key: "name", label: Locale.label("common.name"), sortable: true },
                { key: "taxDeductible", label: Locale.label("donations.fundsPage.taxStatus") },
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

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <>
      <PageHeader
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
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("donations.fundsPage.totalFunds")}</Typography>
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
              }
            }}
            startIcon={<AddIcon />}
            onClick={() => {
              setEditFundId("");
            }}
            data-testid="add-fund-button">
            {Locale.label("donations.fundsPage.addFund")}
          </Button>
        )}
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Edit content appears above when editing */}
        {editFundId !== "notset" && <Box sx={{ mb: 3 }}>{getSidebarModules()}</Box>}

        {/* Main table */}
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <FundIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="h6">{Locale.label("donations.funds.fund")}</Typography>
                {sortedFunds.length > 0 && <CountChip count={sortedFunds.length} />}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                {funds.data && <ExportButton data={funds.data} filename="funds.csv" text={Locale.label("donations.fundsPage.export")} />}
              </Stack>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>
      </Box>
    </>
  );
};
