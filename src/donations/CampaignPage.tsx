import React from "react";
import { CurrencyHelper, Loading, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useParams, Link } from "react-router-dom";
import { Box, Chip, LinearProgress, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { Flag as CampaignIcon, Edit as EditIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type CampaignInterface, type CampaignProgressInterface, type PledgeInterface, type PledgeProgressRowInterface, type PledgeStatus } from "../helpers";
import { CampaignEdit, PledgeEdit } from "./components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { EmptyState, ExportButton, SortableTableHead, hoverRowSx, type SortDirection } from "../components/ui";
import { Verb, VerbRow, SectionTitle, LedgerHead, plateSx, plainTableSx } from "./components/plate";

const statusColors: Record<PledgeStatus, "default" | "info" | "success" | "warning"> = {
  notStarted: "default",
  inProgress: "info",
  fulfilled: "success",
  beyondPledged: "success",
  nonPledged: "warning"
};

export const CampaignPage = () => {
  const params = useParams();
  const [editMode, setEditMode] = React.useState<"none" | "campaign" | "pledge">("none");
  const [editPledge, setEditPledge] = React.useState<PledgeInterface | null>(null);
  const [sortBy, setSortBy] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [currency, setCurrency] = React.useState<string>("usd");

  const progress = useQuery<CampaignProgressInterface>({ queryKey: ["/campaigns/" + params.id + "/progress", "GivingApi"], placeholderData: undefined });
  const funds = useQuery<FundInterface[]>({ queryKey: ["/funds", "GivingApi"], placeholderData: [] });

  const personIds = React.useMemo(() => {
    const ids = (progress.data?.rows || []).map((r) => r.personId).filter((id) => id);
    return Array.from(new Set(ids)).sort();
  }, [progress.data]);

  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people/ids?ids=" + personIds.join(","), "MembershipApi"],
    placeholderData: [],
    enabled: personIds.length > 0
  });

  const peopleNames = React.useMemo(() => {
    const result: { [key: string]: string } = {};
    (people.data || []).forEach((p) => { result[p.id || ""] = p.name?.display || ""; });
    return result;
  }, [people.data]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const updated = () => {
    setEditMode("none");
    setEditPledge(null);
    progress.refetch();
  };

  const campaign = progress.data?.campaign;
  const percent = campaign?.goalAmount ? Math.min(100, Math.round(((progress.data?.totalGiven || 0) / campaign.goalAmount) * 100)) : null;
  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);

  const handleEditPledge = (row: PledgeProgressRowInterface) => {
    setEditPledge({ id: row.pledgeId, campaignId: params.id, personId: row.personId, amount: row.pledgedAmount });
    setEditMode("pledge");
  };

  const sortedRows = React.useMemo(() => {
    const result = [...(progress.data?.rows || [])];
    if (sortBy === "person") {
      const dir = sortDirection === "asc" ? 1 : -1;
      result.sort((a, b) => (peopleNames[a.personId || ""] || "").toUpperCase().localeCompare((peopleNames[b.personId || ""] || "").toUpperCase()) * dir);
    } else if (sortBy) {
      const dir = sortDirection === "asc" ? 1 : -1;
      result.sort((a: any, b: any) => ((a[sortBy] || 0) - (b[sortBy] || 0)) * dir);
    }
    return result;
  }, [progress.data, sortBy, sortDirection, peopleNames]);

  const handleSort = (key: string) => {
    setSortDirection(sortBy === key && sortDirection === "asc" ? "desc" : "asc");
    setSortBy(key);
  };

  const getEditContent = () => {
    if (editMode === "campaign") return <CampaignEdit campaign={campaign as CampaignInterface} funds={funds.data || []} updatedFunction={updated} />;
    if (editMode === "pledge") return <PledgeEdit campaignId={params.id || ""} pledge={editPledge as PledgeInterface} personName={editPledge?.personId ? peopleNames[editPledge.personId] : undefined} updatedFunction={updated} />;
    return null;
  };

  const getRows = () => {
    if (sortedRows.length === 0) {
      return (
        <TableRow key="0">
          <EmptyState variant="table" colSpan={5} icon={<CampaignIcon />} title={Locale.label("donations.campaignPage.noPledges")} />
        </TableRow>
      );
    }

    return sortedRows.map((row, i) => {
      const personCell = row.personId ? (
        <Box component={Link} to={"/people/" + row.personId} sx={{ textDecoration: "none", color: "var(--c1)", fontWeight: 500 }}>
          {peopleNames[row.personId] || Locale.label("donations.campaignPage.unknownPerson")}
        </Box>
      ) : Locale.label("donations.campaignPage.anon");

      return (
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>{personCell}</TableCell>
          <TableCell align="right">{row.pledgedAmount ? CurrencyHelper.formatCurrencyWithLocale(row.pledgedAmount, currency) : "-"}</TableCell>
          <TableCell align="right" className="amt">{CurrencyHelper.formatCurrencyWithLocale(row.givenAmount || 0, currency)}</TableCell>
          <TableCell>
            <Chip size="small" label={Locale.label("donations.pledgeStatus." + row.status)} color={(row.status && statusColors[row.status]) || "default"} data-testid={`pledge-status-${i}`} />
          </TableCell>
          <TableCell align="right" className="rowActions">
            {canEdit && row.pledgeId && <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => handleEditPledge(row)} data-testid={`edit-pledge-${i}`} />}
          </TableCell>
        </TableRow>
      );
    });
  };

  const getExportData = () => (progress.data?.rows || []).map((r) => ({
    donor: r.personId ? peopleNames[r.personId] || r.personId : Locale.label("donations.campaignPage.anon"),
    pledged: r.pledgedAmount || 0,
    given: r.givenAmount || 0,
    status: r.status
  }));

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <Box sx={plateSx}>
      <LedgerHead
        title={campaign?.name || Locale.label("donations.campaignsPage.campaigns")}
        big={percent !== null ? percent + "%" : CurrencyHelper.formatCurrencyWithLocale(progress.data?.totalGiven || 0, currency, 0)}
        meta={progress.data
          ? `${CurrencyHelper.formatCurrencyWithLocale(progress.data.totalPledged || 0, currency, 0)} ${Locale.label("donations.campaignsPage.pledged")?.toLowerCase()} · ${CurrencyHelper.formatCurrencyWithLocale(progress.data.totalGiven || 0, currency, 0)} ${Locale.label("donations.campaignsPage.given")?.toLowerCase()}${campaign?.goalAmount ? " · " + CurrencyHelper.formatCurrencyWithLocale(campaign.goalAmount, currency, 0) + " " + (Locale.label("donations.campaignsPage.goal") || "goal").toLowerCase() : ""}`
          : undefined}
        action={canEdit ? <Verb onClick={() => setEditMode("campaign")} data-testid="edit-campaign-button">{Locale.label("donations.campaignPage.editCampaign")}</Verb> : undefined}
      />
      {percent !== null && (
        <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 4, mb: 2 }} data-testid="campaign-progress-bar" />
      )}
      {editMode !== "none" && <Box sx={{ mb: 2 }}>{getEditContent()}</Box>}
      <SectionTitle>{Locale.label("donations.campaignPage.pledges")}</SectionTitle>
      {progress.isLoading ? <Loading /> : (
        <Table sx={plainTableSx}>
          {sortedRows.length > 0 && (
            <SortableTableHead
              columns={[
                { key: "person", label: Locale.label("donations.campaignPage.donor"), sortable: true },
                { key: "pledgedAmount", label: Locale.label("donations.campaignsPage.pledged"), align: "right", sortable: true },
                { key: "givenAmount", label: Locale.label("donations.campaignsPage.given"), align: "right", sortable: true },
                { key: "status", label: Locale.label("donations.campaignPage.status") },
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
        {canEdit && <Verb onClick={() => { setEditPledge(null); setEditMode("pledge"); }} data-testid="add-pledge-button">{Locale.label("donations.campaignPage.addPledge")}</Verb>}
        {progress.data?.rows && <ExportButton data={getExportData()} filename="pledges.csv" text={Locale.label("donations.campaignsPage.export")} />}
      </VerbRow>
    </Box>
  );
};
