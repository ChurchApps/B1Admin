import React from "react";
import { CurrencyHelper, DateHelper, Loading, Locale, PageHeader, UserHelper, Permissions } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Box, Card, LinearProgress, Stack, Table, TableBody, TableCell, TableRow, Typography, Button } from "@mui/material";
import { Flag as CampaignIcon, Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type CampaignInterface, type CampaignProgressInterface } from "../helpers";
import { CampaignEdit } from "./components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CountChip, EmptyState, SortableTableHead, type SortDirection } from "../components/ui";

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
      : progress.data.find((c) => c.campaign?.id === editCampaignId)?.campaign || {};
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
        <TableRow key={c.id || i} sx={{ "&:hover": { backgroundColor: "action.hover" }, transition: "background-color 0.2s ease" }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <CampaignIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography component={Link} to={"/donations/campaigns/" + c.id} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>
                {c.name}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell><Typography variant="body2">{fund?.name}</Typography></TableCell>
          <TableCell><Typography variant="body2">{dates}</Typography></TableCell>
          <TableCell align="right"><Typography variant="body2">{c.goalAmount ? CurrencyHelper.formatCurrencyWithLocale(c.goalAmount, currency) : "-"}</Typography></TableCell>
          <TableCell align="right"><Typography variant="body2">{CurrencyHelper.formatCurrencyWithLocale(cp.totalPledged || 0, currency)}</Typography></TableCell>
          <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>{CurrencyHelper.formatCurrencyWithLocale(cp.totalGiven || 0, currency)}</Typography></TableCell>
          <TableCell>
            {percent !== null && (
              <Stack direction="row" spacing={1} alignItems="center">
                <LinearProgress variant="determinate" value={percent} sx={{ width: 80, height: 8, borderRadius: 4 }} />
                <Typography variant="body2">{percent}%</Typography>
              </Stack>
            )}
          </TableCell>
          <TableCell align="right" className="rowActions">
            {canEdit && <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} data-id={c.id} onClick={() => setEditCampaignId(c.id)} />}
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
    );
  };

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <>
      <PageHeader title={Locale.label("donations.campaignsPage.campaigns")} subtitle={Locale.label("donations.campaignsPage.subtitle")}>
        {stats.totalCampaigns > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 2, sm: 2, md: 4 }}
            sx={{ position: { xs: "static", md: "absolute" }, left: { md: "50%" }, top: { md: "50%" }, transform: { md: "translateY(-50%)" }, right: { md: "24px" }, justifyContent: { md: "space-between" }, flexWrap: "wrap" }}
          >
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CampaignIcon sx={{ color: "#FFF", fontSize: 24 }} />
                <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalCampaigns}</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("donations.campaignsPage.totalCampaigns")}</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 100 }}>
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{CurrencyHelper.formatCurrencyWithLocale(stats.totalPledged, currency, 0)}</Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("donations.campaignsPage.pledged")}</Typography>
            </Stack>
            <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 100 }}>
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{CurrencyHelper.formatCurrencyWithLocale(stats.totalGiven, currency, 0)}</Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("donations.campaignsPage.given")}</Typography>
            </Stack>
          </Stack>
        )}
        {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
          <Button
            variant="outlined"
            sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}
            startIcon={<AddIcon />}
            onClick={() => setEditCampaignId("")}
            data-testid="add-campaign-button">
            {Locale.label("donations.campaignsPage.addCampaign")}
          </Button>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {editCampaignId !== "notset" && <Box sx={{ mb: 3 }}>{getEditContent()}</Box>}

        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <CampaignIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="h6">{Locale.label("donations.campaignsPage.campaigns")}</Typography>
                {sortedCampaigns.length > 0 && <CountChip count={sortedCampaigns.length} />}
              </Stack>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>
      </Box>
    </>
  );
};
