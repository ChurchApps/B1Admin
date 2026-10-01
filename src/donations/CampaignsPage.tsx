import React from "react";
import { CurrencyHelper, DateHelper, Loading, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Box, LinearProgress, Link as MuiLink, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";
import { Add as AddIcon, Flag as CampaignIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type CampaignInterface, type CampaignProgressInterface } from "../helpers";
import { CampaignEdit } from "./components";
import { PageHeader, PageContainer, Surface, EmptyState, HeaderPrimaryButton, ResultsBar, SortableTableHead, TextAction, hoverRowSx, numericCellSx, tableScrollSx, type SortDirection } from "../components/ui";

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

  const openCampaign = (id: string) => {
    setEditCampaignId(id);
    setTimeout(() => document.getElementById("edit-campaign-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

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

  const newCampaign = React.useMemo<CampaignInterface>(() => ({ name: "", startDate: DateHelper.formatHtml5Date(new Date()) }), [editCampaignId]);

  const getEditContent = () => {
    if (editCampaignId === "notset") return null;
    const campaign: CampaignInterface = editCampaignId === ""
      ? newCampaign
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
    const result: JSX.Element[] = [];
    if (sortedCampaigns.length === 0) {
      result.push(
        <TableRow key="0">
          <EmptyState variant="table" colSpan={7} icon={<CampaignIcon />} title={Locale.label("donations.campaignsPage.noCampaigns")} />
        </TableRow>
      );
      return result;
    }

    const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);

    sortedCampaigns.forEach((cp, i) => {
      const c = cp.campaign || {};
      const fund = funds.data?.find((f) => f.id === c.fundId);
      const percent = c.goalAmount ? Math.min(100, Math.round(((cp.totalGiven || 0) / c.goalAmount) * 100)) : null;
      const dates = formatDate(c.startDate) + " - " + (c.endDate ? formatDate(c.endDate) : Locale.label("donations.campaignsPage.ongoing"));

      result.push(
        <TableRow key={c.id || i} sx={hoverRowSx}>
          <TableCell>
            <MuiLink component={Link} to={"/donations/campaigns/" + c.id} underline="hover" variant="body2" sx={{ fontWeight: 600 }}>
              {c.name}
            </MuiLink>
          </TableCell>
          <TableCell><Typography variant="body2">{fund?.name}</Typography></TableCell>
          <TableCell><Typography variant="body2">{dates}</Typography></TableCell>
          <TableCell align="right" sx={numericCellSx}><Typography variant="body2">{c.goalAmount ? CurrencyHelper.formatCurrencyWithLocale(c.goalAmount, currency) : "-"}</Typography></TableCell>
          <TableCell align="right" sx={numericCellSx}><Typography variant="body2">{CurrencyHelper.formatCurrencyWithLocale(cp.totalPledged || 0, currency)}</Typography></TableCell>
          <TableCell align="right" sx={numericCellSx}><Typography variant="body2" sx={{ fontWeight: 600 }}>{CurrencyHelper.formatCurrencyWithLocale(cp.totalGiven || 0, currency)}</Typography></TableCell>
          <TableCell>
            {percent !== null && (
              <Stack direction="row" spacing={1} alignItems="center">
                <LinearProgress variant="determinate" value={percent} sx={{ width: 80, height: 8 }} />
                <Typography variant="body2">{percent}%</Typography>
              </Stack>
            )}
          </TableCell>
          <TableCell align="right">
            {canEdit && <TextAction small onClick={() => openCampaign(c.id || "")}>{Locale.label("common.edit")}</TextAction>}
          </TableCell>
        </TableRow>
      );
    });
    return result;
  };

  const getTable = () => {
    if (progress.isLoading) return <Loading />;
    return (
      <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.campaignsPage.campaigns")} tabIndex={0}>
        <Table sx={{ minWidth: 650 }}>
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
      </Box>
    );
  };

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  const lede = [
    Locale.label("donations.campaignsPage.campaignCount", "{count} campaigns").replace("{count}", stats.totalCampaigns.toString()),
    Locale.label("donations.campaignsPage.pledgedAmount", "{amount} pledged").replace("{amount}", CurrencyHelper.formatCurrencyWithLocale(stats.totalPledged, currency, 0)),
    Locale.label("donations.campaignsPage.givenAmount", "{amount} given").replace("{amount}", CurrencyHelper.formatCurrencyWithLocale(stats.totalGiven, currency, 0))
  ].join(" · ");

  const canAdd = UserHelper.checkAccess(Permissions.givingApi.donations.edit);

  return (
    <>
      <PageHeader title={Locale.label("donations.campaignsPage.campaigns")} subtitle={Locale.label("donations.campaignsPage.subtitle")}>
        {canAdd && <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => openCampaign("")} data-testid="add-campaign-button">{Locale.label("donations.campaignsPage.addCampaign")}</HeaderPrimaryButton>}
      </PageHeader>

      <PageContainer>
        <Surface>
          <Stack spacing={3}>
            {!progress.isLoading && stats.totalCampaigns > 0 && (
              <ResultsBar>
                <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{lede}</Typography>
              </ResultsBar>
            )}
            {getTable()}
          </Stack>
          {editCampaignId !== "notset" && (
            <Box id="edit-campaign-bar" sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3 }}>{getEditContent()}</Box>
          )}
        </Surface>
      </PageContainer>
    </>
  );
};
