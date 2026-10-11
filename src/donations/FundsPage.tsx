import React from "react";
import { FundEdit, GivingLinkDialog } from "./components";
import { UserHelper, Loading, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Table, TableBody, TableCell, TableRow, Box, Link as MuiLink, Typography, Stack } from "@mui/material";
import { Add as AddIcon, VolunteerActivism as FundIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageContainer, Surface, EmptyState, ExportButton, HeaderPrimaryButton, ResultsBar, StatusBadge, SortableTableHead, TextAction, VerbRow, hoverRowSx, tableScrollSx } from "../components/ui";
import { useSortableData } from "../hooks";
import { useRequirePermission } from "../hooks";

export const FundsPage = () => {
  const [editFundId, setEditFundId] = React.useState("notset");
  const [linkFund, setLinkFund] = React.useState<FundInterface | null>(null);

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
  });

  const { sorted: sortedFunds, sortBy, sortDirection, handleSort } = useSortableData<FundInterface>(funds.data || []);

  const openFund = (id: string) => {
    setEditFundId(id);
    setTimeout(() => document.getElementById("edit-fund-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const fundUpdated = () => {
    setEditFundId("notset");
    funds.refetch();
  };

  const getSidebarModules = () => {
    const result = [];
    if (editFundId !== "notset") {
      const fund = editFundId === "" ? { id: "", name: "", taxDeductible: true } : (funds.data || []).find((f) => f.id === editFundId) || { id: "", name: "" };
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
      const fundLink = canViewFund ? (
        <MuiLink component={Link} to={"/donations/funds/" + f.id} underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
          {f.name}
        </MuiLink>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {f.name}
        </Typography>
      );

      result.push(
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              {fundLink}
              {f.visible === false && <StatusBadge>{Locale.label("donations.funds.hidden")}</StatusBadge>}
            </Stack>
          </TableCell>
          <TableCell>
            <Box component="p" sx={{ m: 0 }}>
              {f.taxDeductible ? (
                <StatusBadge tone="success" variant="dot">{Locale.label("donations.fundsPage.taxDeductible")}</StatusBadge>
              ) : (
                <StatusBadge tone="neutral" variant="dot">{Locale.label("donations.fundsPage.nonDeductible")}</StatusBadge>
              )}
            </Box>
          </TableCell>
          <TableCell align="right">
            <VerbRow sx={{ justifyContent: "flex-end" }}>
              {canViewFund && <TextAction small data-testid={`giving-link-${i}`} onClick={() => setLinkFund(f)}>{Locale.label("donations.givingLink.button")}</TextAction>}
              {canEdit && <TextAction small data-cy={`edit-${i}`} onClick={() => openFund(f.id || "")}>{Locale.label("common.edit")}</TextAction>}
            </VerbRow>
          </TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const getTable = () => {
    if (funds.isLoading) return <Loading />;
    else {
      return (
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.funds.fund")} tabIndex={0}>
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
        </Box>
      );
    }
  };

  const denied = useRequirePermission(Permissions.givingApi.donations.viewSummary);
  if (denied) return denied;

  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);

  return (
    <>
      <PageHeader title={Locale.label("donations.donations.funds")} subtitle={Locale.label("donations.fundsPage.subtitle")}>
        {(funds.data?.length || 0) > 0 && <ExportButton data={funds.data || []} filename="funds.csv" text={Locale.label("donations.fundsPage.export")} />}
        {canEdit && <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => openFund("")} data-testid="add-fund-button">{Locale.label("donations.fundsPage.addFund")}</HeaderPrimaryButton>}
      </PageHeader>

      <PageContainer>
        <Surface>
          <Stack spacing={3}>
            {!funds.isLoading && (
              <ResultsBar>
                <Typography variant="body2" color="text.secondary">{Locale.label("donations.fundsPage.fundCount", "{count} funds").replace("{count}", sortedFunds.length.toString())}</Typography>
              </ResultsBar>
            )}
            {getTable()}
          </Stack>
          {editFundId !== "notset" && (
            <Box id="edit-fund-bar" sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3 }}>{getSidebarModules()}</Box>
          )}
        </Surface>
      </PageContainer>

      {linkFund && <GivingLinkDialog fund={linkFund} onClose={() => setLinkFund(null)} />}
    </>
  );
};
