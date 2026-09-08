import React from "react";
import { FundEdit, GivingLinkDialog } from "./components";
import { UserHelper, Loading, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Chip, Table, TableBody, TableCell, TableRow, Box } from "@mui/material";
import { VolunteerActivism as FundIcon, Edit as EditIcon, Link as LinkIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { AppIconButton } from "../components/ui/AppIconButton";
import { EmptyState, ExportButton, SortableTableHead, hoverRowSx } from "../components/ui";
import { useSortableData } from "../hooks";
import { useRequirePermission } from "../hooks";
import { Verb, VerbRow, SectionTitle, plateSx, plainTableSx, mutedSx } from "./components/plate";

export const FundsPage = () => {
  const [editFundId, setEditFundId] = React.useState("notset");
  const [linkFund, setLinkFund] = React.useState<FundInterface | null>(null);

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
    setEditFundId(id || "");
  };

  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
  const canViewFund = UserHelper.checkAccess(Permissions.givingApi.donations.view);

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

    for (let i = 0; i < sortedFunds.length; i++) {
      const f = sortedFunds[i];
      const editLink = canEdit ? (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-cy={`edit-${i}`} data-id={f.id} onClick={showEditFund} />
      ) : null;

      const givingLinkButton = canViewFund ? (
        <AppIconButton
          label={Locale.label("donations.givingLink.button")}
          icon={<LinkIcon />}
          data-testid={`giving-link-${i}`}
          onClick={() => setLinkFund(f)}
        />
      ) : null;

      const fundLink = canViewFund ? (
        <Box component={Link} to={"/donations/funds/" + f.id} sx={{ textDecoration: "none", color: "var(--c1)", fontWeight: 500 }}>
          {f.name}
        </Box>
      ) : (
        <Box sx={{ fontWeight: 500 }}>{f.name}</Box>
      );

      result.push(
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            {fundLink}
            {f.visible === false && <Chip label={Locale.label("donations.funds.hidden")} size="small" sx={{ ml: 1 }} />}
          </TableCell>
          <TableCell>
            {f.taxDeductible
              ? Locale.label("donations.fundsPage.taxDeductible")
              : <Box component="p" sx={{ m: 0 }}>{Locale.label("donations.fundsPage.nonDeductible")}</Box>}
          </TableCell>
          <TableCell align="right" className="rowActions">{givingLinkButton} {editLink}</TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const denied = useRequirePermission(Permissions.givingApi.donations.viewSummary);
  if (denied) return denied;

  return (
    <Box sx={plateSx}>
      <SectionTitle sx={{ mt: 0 }}>{Locale.label("donations.donations.funds")}</SectionTitle>
      <Box sx={mutedSx}>{sortedFunds.length} {Locale.label("donations.fundsPage.totalFunds")?.toLowerCase() || "funds"}</Box>
      {editFundId !== "notset" && (
        <Box sx={{ mt: 2 }}>
          <FundEdit
            fund={editFundId === "" ? { id: "", name: "", taxDeductible: true } : (funds.data || []).find((f) => f.id === editFundId) || { id: "", name: "" }}
            updatedFunction={fundUpdated}
          />
        </Box>
      )}
      {funds.isLoading ? <Loading /> : (
        <Table sx={plainTableSx}>
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
      )}
      <VerbRow>
        {canEdit && <Verb onClick={() => setEditFundId("")} data-testid="add-fund-button">{Locale.label("donations.fundsPage.addFund")}</Verb>}
        {funds.data && <ExportButton data={funds.data} filename="funds.csv" text={Locale.label("donations.fundsPage.export")} />}
      </VerbRow>
      {linkFund && <GivingLinkDialog fund={linkFund} onClose={() => setLinkFund(null)} />}
    </Box>
  );
};
