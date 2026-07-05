import React from "react";
import { FundEdit } from "./components";
import { UserHelper, Loading, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Chip, Icon, Table, TableBody, TableCell, TableRow, Box, Typography, Stack } from "@mui/material";
import { VolunteerActivism as FundIcon, Add as AddIcon, Edit as EditIcon, AccountBalance as AccountBalanceIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CardWithHeader, EmptyState, ExportButton, PageHeaderStats, SortableTableHead, HeaderPrimaryButton, hoverRowSx } from "../components/ui";
import { useSortableData } from "../hooks";

export const FundsPage = () => {
  const [editFundId, setEditFundId] = React.useState("notset");

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
  });

  const { sorted: sortedFunds, sortBy, sortDirection, handleSort } = useSortableData<FundInterface>(funds.data || []);

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
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <FundIcon sx={{ color: "primary.main", fontSize: 20 }} />
              {fundLink}
              {f.visible === false && <Chip label={Locale.label("donations.funds.hidden")} size="small" />}
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
        icon={<AccountBalanceIcon />}
        title={Locale.label("donations.donations.funds")}
        subtitle={Locale.label("donations.fundsPage.subtitle")}
      >
        {stats.totalFunds > 0 && (
          <PageHeaderStats
            spread
            spacing={{ xs: 2, sm: 2, md: 4 }}
            items={[{ icon: <FundIcon sx={{ color: "#FFF", fontSize: 24 }} />, value: stats.totalFunds, label: Locale.label("donations.fundsPage.totalFunds"), minWidth: 80 }]}
          />
        )}
        {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
          <HeaderPrimaryButton
            startIcon={<AddIcon />}
            onClick={() => {
              setEditFundId("");
            }}
            data-testid="add-fund-button">
            {Locale.label("donations.fundsPage.addFund")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {editFundId !== "notset" && <Box sx={{ mb: 3 }}>{getSidebarModules()}</Box>}

        <CardWithHeader
          icon={<FundIcon sx={{ color: "primary.main", fontSize: 20 }} />}
          title={Locale.label("donations.funds.fund")}
          count={sortedFunds.length}
          actions={funds.data && <ExportButton data={funds.data} filename="funds.csv" text={Locale.label("donations.fundsPage.export")} />}
        >
          {getTable()}
        </CardWithHeader>
      </Box>
    </>
  );
};
