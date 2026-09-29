import React from "react";
import { CurrencyHelper, Loading, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useParams, Link } from "react-router-dom";
import { Box, LinearProgress, Link as MuiLink, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";
import { Flag as CampaignIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type CampaignInterface, type CampaignProgressInterface, type PledgeInterface, type PledgeProgressRowInterface, type PledgeStatus } from "../helpers";
import { CampaignEdit, PledgeEdit } from "./components";
import { PageHeader, PageContainer, Breadcrumbs, type BreadcrumbItem, AddBar, EmptyState, RecordHeading, StatusBadge, type StatusTone, Surface, SortableTableHead, TextAction, VerbRow, hoverRowSx, numericCellSx, tableScrollSx, type SortDirection } from "../components/ui";
import { CsvVerb } from "./components/GivingParts";

const statusColors: Record<PledgeStatus, StatusTone> = {
  notStarted: "neutral",
  inProgress: "info",
  fulfilled: "success",
  beyondPledged: "success",
  nonPledged: "warning"
};

const pledgeStatusLabel = (status: PledgeStatus | undefined) => {
  switch (status) {
    case "notStarted": return Locale.label("donations.pledgeStatus.notStarted");
    case "inProgress": return Locale.label("donations.pledgeStatus.inProgress");
    case "fulfilled": return Locale.label("donations.pledgeStatus.fulfilled");
    case "beyondPledged": return Locale.label("donations.pledgeStatus.beyondPledged");
    case "nonPledged": return Locale.label("donations.pledgeStatus.nonPledged");
    default: return status || "";
  }
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
    const result: JSX.Element[] = [];
    if (sortedRows.length === 0) {
      result.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={5} icon={<CampaignIcon />} title={Locale.label("donations.campaignPage.noPledges")} />
        </TableRow>
      );
      return result;
    }

    sortedRows.forEach((row, i) => {
      const personCell = row.personId ? (
        <MuiLink component={Link} to={"/people/" + row.personId} underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
          {peopleNames[row.personId] || Locale.label("donations.campaignPage.unknownPerson")}
        </MuiLink>
      ) : (
        <Typography variant="body2" color="text.secondary">{Locale.label("donations.campaignPage.anon")}</Typography>
      );

      result.push(
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            {personCell}
          </TableCell>
          <TableCell align="right" sx={numericCellSx}><Typography variant="body2">{row.pledgedAmount ? CurrencyHelper.formatCurrencyWithLocale(row.pledgedAmount, currency) : "-"}</Typography></TableCell>
          <TableCell align="right" sx={numericCellSx}><Typography variant="body2" sx={{ fontWeight: 600 }}>{CurrencyHelper.formatCurrencyWithLocale(row.givenAmount || 0, currency)}</Typography></TableCell>
          <TableCell>
            <StatusBadge tone={(row.status && statusColors[row.status]) || "neutral"} data-testid={`pledge-status-${i}`}>{pledgeStatusLabel(row.status)}</StatusBadge>
          </TableCell>
          <TableCell align="right">
            {canEdit && row.pledgeId && <TextAction small onClick={() => handleEditPledge(row)} data-testid={`edit-pledge-${i}`}>{Locale.label("common.edit")}</TextAction>}
          </TableCell>
        </TableRow>
      );
    });
    return result;
  };

  const getTable = () => {
    if (progress.isLoading) return <Loading />;
    return (
      <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.campaignPage.pledges")} tabIndex={0}>
        <Table sx={{ minWidth: 650 }}>
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
      </Box>
    );
  };

  const getExportData = () => (progress.data?.rows || []).map((r) => ({
    donor: r.personId ? peopleNames[r.personId] || r.personId : Locale.label("donations.campaignPage.anon"),
    pledged: r.pledgedAmount || 0,
    given: r.givenAmount || 0,
    status: r.status
  }));

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: Locale.label("components.wrapper.don"), path: "/donations" },
    { label: campaign?.name || "" }
  ];

  const lede = progress.data ? [
    ...(campaign?.goalAmount ? [Locale.label("donations.campaignPage.goalAmount", "{amount} goal").replace("{amount}", CurrencyHelper.formatCurrencyWithLocale(campaign.goalAmount, currency, 0))] : []),
    Locale.label("donations.campaignsPage.pledgedAmount", "{amount} pledged").replace("{amount}", CurrencyHelper.formatCurrencyWithLocale(progress.data.totalPledged || 0, currency, 0)),
    Locale.label("donations.campaignsPage.givenAmount", "{amount} given").replace("{amount}", CurrencyHelper.formatCurrencyWithLocale(progress.data.totalGiven || 0, currency, 0))
  ].join(" · ") : Locale.label("donations.campaignPage.subtitle");

  const exportRows = getExportData();

  return (
    <>
      <PageHeader title={campaign?.name || ""} subtitle={lede} breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}>
        {canEdit && <TextAction onClick={() => setEditMode("campaign")} data-testid="edit-campaign-button">{Locale.label("donations.campaignPage.editCampaign")}</TextAction>}
      </PageHeader>

      <PageContainer>
        {editMode !== "none" && <Box sx={{ mb: 3 }}>{getEditContent()}</Box>}

        <Surface>
          {percent !== null && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h1" component="p" sx={{ fontVariantNumeric: "tabular-nums" }}>{percent}% <Typography component="span" variant="body1" color="text.secondary">{Locale.label("donations.campaignPage.ofGoal")}</Typography></Typography>
              <LinearProgress variant="determinate" value={percent} sx={{ mt: 1.5, height: 8, borderRadius: "var(--b1-radius-pill)" }} data-testid="campaign-progress-bar" />
            </Box>
          )}

          <RecordHeading label={Locale.label("donations.campaignPage.pledges") + " (" + sortedRows.length + ")"}>
            <VerbRow>
              {exportRows.length > 0 && <CsvVerb data={exportRows} filename="pledges.csv" text={Locale.label("donations.campaignsPage.export")} />}
            </VerbRow>
          </RecordHeading>
          {getTable()}

          {canEdit && (
            <AddBar>
              <TextAction onClick={() => { setEditPledge(null); setEditMode("pledge"); }} data-testid="add-pledge-button">{Locale.label("donations.campaignPage.addPledge")}</TextAction>
            </AddBar>
          )}
        </Surface>
      </PageContainer>
    </>
  );
};
