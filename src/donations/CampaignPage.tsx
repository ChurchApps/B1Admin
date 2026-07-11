import React from "react";
import { CurrencyHelper, Loading, Locale, PageHeader, UserHelper, Permissions } from "@churchapps/apphelper";
import { type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useParams, Link } from "react-router-dom";
import { Box, Card, Chip, Icon, LinearProgress, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";
import { Flag as CampaignIcon, Add as AddIcon, Edit as EditIcon, Person as PersonIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type CampaignInterface, type CampaignProgressInterface, type PledgeInterface, type PledgeProgressRowInterface, type PledgeStatus } from "../helpers";
import { CampaignEdit, PledgeEdit } from "./components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { Breadcrumbs, type BreadcrumbItem, CardWithHeader, EmptyState, ExportButton, SortableTableHead, HeaderPrimaryButton, HeaderSecondaryButton, hoverRowSx, type SortDirection } from "../components/ui";

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
        <Typography component={Link} to={"/people/" + row.personId} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>
          {peopleNames[row.personId] || Locale.label("donations.campaignPage.unknownPerson")}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">{Locale.label("donations.campaignPage.anon")}</Typography>
      );

      result.push(
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <PersonIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              {personCell}
            </Stack>
          </TableCell>
          <TableCell align="right"><Typography variant="body2">{row.pledgedAmount ? CurrencyHelper.formatCurrencyWithLocale(row.pledgedAmount, currency) : "-"}</Typography></TableCell>
          <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>{CurrencyHelper.formatCurrencyWithLocale(row.givenAmount || 0, currency)}</Typography></TableCell>
          <TableCell>
            <Chip size="small" label={Locale.label("donations.pledgeStatus." + row.status)} color={(row.status && statusColors[row.status]) || "default"} data-testid={`pledge-status-${i}`} />
          </TableCell>
          <TableCell align="right" className="rowActions">
            {canEdit && row.pledgeId && <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => handleEditPledge(row)} data-testid={`edit-pledge-${i}`} />}
          </TableCell>
        </TableRow>
      );
    });
    return result;
  };

  const getTable = () => {
    if (progress.isLoading) return <Loading />;
    return (
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

  return (
    <>
      <PageHeader icon={<CampaignIcon />} title={campaign?.name || ""} subtitle={Locale.label("donations.campaignPage.subtitle")}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent={{ sm: "space-between" }} width="100%">
        {progress.data && (
          <PageHeaderStats
            spread
            items={[
              ...(campaign?.goalAmount > 0 ? [{ value: CurrencyHelper.formatCurrencyWithLocale(campaign.goalAmount, currency, 0), label: Locale.label("donations.campaignsPage.goal") }] : []),
              { value: CurrencyHelper.formatCurrencyWithLocale(progress.data.totalPledged || 0, currency, 0), label: Locale.label("donations.campaignsPage.pledged") },
              { value: CurrencyHelper.formatCurrencyWithLocale(progress.data.totalGiven || 0, currency, 0), label: Locale.label("donations.campaignsPage.given") }
            ]}
          />
        )}
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <HeaderSecondaryButton
              startIcon={<EditIcon />}
              onClick={() => setEditMode("campaign")}
              data-testid="edit-campaign-button">
              {Locale.label("donations.campaignPage.editCampaign")}
            </HeaderSecondaryButton>
            <HeaderPrimaryButton
              startIcon={<AddIcon />}
              onClick={() => { setEditPledge(null); setEditMode("pledge"); }}
              data-testid="add-pledge-button">
              {Locale.label("donations.campaignPage.addPledge")}
            </HeaderPrimaryButton>
          </Stack>
        )}
      </Stack>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {editMode !== "none" && <Box sx={{ mb: 3 }}>{getEditContent()}</Box>}

        {percent !== null && (
          <Card sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <LinearProgress variant="determinate" value={percent} sx={{ flex: 1, height: 12, borderRadius: 6 }} data-testid="campaign-progress-bar" />
                <Typography variant="h6">{percent}% {Locale.label("donations.campaignPage.ofGoal")}</Typography>
              </Stack>
            </Box>
          </Card>
        )}

        <CardWithHeader
          icon={<CampaignIcon sx={{ color: "primary.main", fontSize: 20 }} />}
          title={Locale.label("donations.campaignPage.pledges")}
          count={sortedRows.length}
          actions={progress.data?.rows && <ExportButton data={getExportData()} filename="pledges.csv" text={Locale.label("donations.campaignsPage.export")} />}
        >
          {getTable()}
        </CardWithHeader>
      </Box>
    </>
  );
};
