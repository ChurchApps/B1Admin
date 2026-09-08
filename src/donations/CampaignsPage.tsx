import React from "react";
import { CurrencyHelper, DateHelper, Loading, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Box, LinearProgress, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { Flag as CampaignIcon, Edit as EditIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type CampaignInterface, type CampaignProgressInterface } from "../helpers";
import { CampaignEdit } from "./components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { EmptyState, SortableTableHead, hoverRowSx, type SortDirection } from "../components/ui";
import { Verb, VerbRow, SectionTitle, plateSx, plainTableSx, mutedSx } from "./components/plate";

export const CampaignsPage = () => {
  const [editCampaignId, setEditCampaignId] = React.useState("notset");
  const [sortBy, setSortBy] = React.useState<string>("");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [currency, setCurrency] = React.useState<string>("usd");

  const progress = useQuery<CampaignProgressInterface[]>({ queryKey: ["/campaigns/progress", "GivingApi"], placeholderData: [] });
  const funds = useQuery<FundInterface[]>({ queryKey: ["/funds", "GivingApi"], placeholderData: [] });

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const campaignUpdated = () => {
    setEditCampaignId("notset");
    progress.refetch();
  };

  const stats = React.useMemo(() => {
    const data = progress.data || [];
    return {
      totalCampaigns: data.length,
      totalPledged: data.reduce((sum, c) => sum + (c.totalPledged || 0), 0),
      totalGiven: data.reduce((sum, c) => sum + (c.totalGiven || 0), 0)
    };
  }, [progress.data]);

  const getEditContent = () => {
    if (editCampaignId === "notset") return null;
    const campaign: CampaignInterface = editCampaignId === ""
      ? { name: "", startDate: DateHelper.formatHtml5Date(new Date()) }
      : (progress.data || []).find((c) => c.campaign?.id === editCampaignId)?.campaign || {};
    return <CampaignEdit campaign={campaign} funds={funds.data || []} updatedFunction={campaignUpdated} />;
  };

  const sortedCampaigns = React.useMemo(() => {
    const result = [...(progress.data || [])];
    if (sortBy) {
      const dir = sortDirection === "asc" ? 1 : -1;
      result.sort((a: any, b: any) => ((a.campaign?.[sortBy] || "").toString().toUpperCase().localeCompare((b.campaign?.[sortBy] || "").toString().toUpperCase())) * dir);
    }
    return result;
  }, [progress.data, sortBy, sortDirection]);

  const handleSort = (key: string) => {
    setSortDirection(sortBy === key && sortDirection === "asc" ? "desc" : "asc");
    setSortBy(key);
  };

  const formatDate = (date?: string) => (date ? DateHelper.formatHtml5Date(new Date(date.toString().split("T")[0] + "T00:00:00")) : "");

  const getRows = () => {
    if (sortedCampaigns.length === 0) {
      return (
        <TableRow key="0">
          <EmptyState variant="table" colSpan={8} icon={<CampaignIcon />} title={Locale.label("donations.campaignsPage.noCampaigns")} />
        </TableRow>
      );
    }

    const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);

    return sortedCampaigns.map((cp, i) => {
      const c = cp.campaign || {};
      const fund = funds.data?.find((f) => f.id === c.fundId);
      const percent = c.goalAmount ? Math.min(100, Math.round(((cp.totalGiven || 0) / c.goalAmount) * 100)) : null;
      const dates = formatDate(c.startDate) + " - " + (c.endDate ? formatDate(c.endDate) : Locale.label("donations.campaignsPage.ongoing"));

      return (
        <TableRow key={c.id || i} sx={hoverRowSx}>
          <TableCell>
            <Box component={Link} to={"/donations/campaigns/" + c.id} sx={{ textDecoration: "none", color: "var(--c1)", fontWeight: 500 }}>{c.name}</Box>
          </TableCell>
          <TableCell>{fund?.name}</TableCell>
          <TableCell>{dates}</TableCell>
          <TableCell align="right">{c.goalAmount ? CurrencyHelper.formatCurrencyWithLocale(c.goalAmount, currency) : "-"}</TableCell>
          <TableCell align="right">{CurrencyHelper.formatCurrencyWithLocale(cp.totalPledged || 0, currency)}</TableCell>
          <TableCell align="right" className="amt">{CurrencyHelper.formatCurrencyWithLocale(cp.totalGiven || 0, currency)}</TableCell>
          <TableCell>
            {percent !== null && (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <LinearProgress variant="determinate" value={percent} sx={{ width: 80, height: 8, borderRadius: 4 }} />
                <span>{percent}%</span>
              </Box>
            )}
          </TableCell>
          <TableCell align="right" className="rowActions">
            {canEdit && <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-id={c.id} onClick={() => setEditCampaignId(c.id || "")} />}
          </TableCell>
        </TableRow>
      );
    });
  };

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <Box sx={plateSx}>
      <SectionTitle sx={{ mt: 0 }}>{Locale.label("donations.campaignsPage.campaigns")}</SectionTitle>
      <Box sx={mutedSx}>
        {stats.totalCampaigns} · {CurrencyHelper.formatCurrencyWithLocale(stats.totalPledged, currency, 0)} {Locale.label("donations.campaignsPage.pledged")?.toLowerCase()} · {CurrencyHelper.formatCurrencyWithLocale(stats.totalGiven, currency, 0)} {Locale.label("donations.campaignsPage.given")?.toLowerCase()}
      </Box>
      {editCampaignId !== "notset" && <Box sx={{ mt: 2 }}>{getEditContent()}</Box>}
      {progress.isLoading ? <Loading /> : (
        <Table sx={plainTableSx}>
          {sortedCampaigns.length > 0 && (
            <SortableTableHead
              columns={[
                { key: "name", label: Locale.label("common.name"), sortable: true },
                { key: "fund", label: Locale.label("donations.campaignsPage.fund") },
                { key: "startDate", label: Locale.label("donations.campaignsPage.dates"), sortable: true },
                { key: "goal", label: Locale.label("donations.campaignsPage.goal"), align: "right" },
                { key: "pledged", label: Locale.label("donations.campaignsPage.pledged"), align: "right" },
                { key: "given", label: Locale.label("donations.campaignsPage.given"), align: "right" },
                { key: "progress", label: Locale.label("donations.campaignsPage.progress") },
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
        {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
          <Verb onClick={() => setEditCampaignId("")} data-testid="add-campaign-button">{Locale.label("donations.campaignsPage.addCampaign")}</Verb>
        )}
      </VerbRow>
    </Box>
  );
};
