import React from "react";
import { ApiHelper, DateHelper, CurrencyHelper, Loading, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/apphelper";
import { Box, Typography, Stack, Button, Table, TableBody, TableCell, TableRow, TableHead, Alert } from "@mui/material";
import { CloudDownload as ImportIcon, Search as PreviewIcon } from "@mui/icons-material";
import { PageHeader, PageContainer, CardWithHeader, StatusBadge, Surface, hoverRowSx, numericCellSx, tableScrollSx } from "../components/ui";
import { AppDatePicker } from "../components";
import { useRequirePermission } from "../hooks";

interface StripeEventResult {
  eventId: string;
  type: string;
  amount: number;
  currency?: string;
  created: string;
  customer: string;
  status: "new" | "already_imported" | "imported" | "skipped" | "error";
  error?: string;
}

interface ImportResponse {
  dryRun: boolean;
  summary: {
    total: number;
    new: number;
    alreadyImported: number;
    imported: number;
    skipped: number;
    errors: number;
  };
  results: StripeEventResult[];
}

const getDefaultDates = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return { start: DateHelper.formatHtml5Date(startOfYear), end: DateHelper.formatHtml5Date(now) };
};

export const StripeImportPage = () => {
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = React.useState<string>(defaultDates.start);
  const [endDate, setEndDate] = React.useState<string>(defaultDates.end);
  const [loading, setLoading] = React.useState(false);
  const [importData, setImportData] = React.useState<ImportResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handlePreview = async () => {
    if (!startDate || !endDate) {
      setError(Locale.label("donations.stripeImportPage.dateRequired"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await ApiHelper.post("/donate/replay-stripe-events", { startDate, endDate, dryRun: true }, "GivingApi");
      if (result.error) {
        setError(result.error);
      } else {
        setImportData(result);
      }
    } catch (err: any) {
      setError(err.message || Locale.label("donations.stripeImportPage.failedFetch"));
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!startDate || !endDate) {
      setError(Locale.label("donations.stripeImportPage.dateRequired"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await ApiHelper.post("/donate/replay-stripe-events", { startDate, endDate, dryRun: false }, "GivingApi");
      if (result.error) {
        setError(result.error);
      } else {
        setImportData(result);
      }
    } catch (err: any) {
      setError(err.message || Locale.label("donations.stripeImportPage.failedImport"));
    }
    setLoading(false);
  };

  const getStatusChip = (status: StripeEventResult["status"]) => {
    switch (status) {
      case "new": return <StatusBadge tone="info">{Locale.label("donations.stripeImportPage.new")}</StatusBadge>;
      case "already_imported": return <StatusBadge>{Locale.label("donations.stripeImportPage.alreadyImported")}</StatusBadge>;
      case "imported": return <StatusBadge tone="success">{Locale.label("donations.stripeImportPage.imported")}</StatusBadge>;
      case "skipped": return <StatusBadge tone="warning">{Locale.label("donations.stripeImportPage.skipped")}</StatusBadge>;
      case "error": return <StatusBadge tone="danger">{Locale.label("donations.stripeImportPage.error")}</StatusBadge>;
      default: return null;
    }
  };

  const getRows = () => {
    if (!importData?.results?.length) {
      return (
        <TableRow>
          <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {Locale.label("donations.stripeImportPage.noEvents")}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return importData.results.map((event) => (
      <TableRow key={event.eventId} sx={hoverRowSx}>
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {event.eventId}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{event.type}</Typography>
        </TableCell>
        <TableCell align="right" sx={numericCellSx}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {CurrencyHelper.formatCurrencyWithLocale(event.amount, event.currency || "usd")}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{DateHelper.prettyDate(new Date(event.created))}</Typography>
        </TableCell>
        <TableCell>{getStatusChip(event.status)}</TableCell>
        <TableCell>
          {event.error && (
            <Typography variant="body2" color="error">
              {event.error}
            </Typography>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  const getSummary = () => {
    if (!importData?.summary) return null;
    const { summary, dryRun } = importData;

    return (
      <Alert severity={dryRun ? "info" : "success"} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={3} flexWrap="wrap">
          <Typography variant="body2">
            <strong>{Locale.label("donations.stripeImportPage.totalLabel")}</strong> {summary.total}
          </Typography>
          <Typography variant="body2" color="info.main">
            <strong>{Locale.label("donations.stripeImportPage.newLabel")}</strong> {summary.new}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>{Locale.label("donations.stripeImportPage.alreadyImportedLabel")}</strong> {summary.alreadyImported}
          </Typography>
          {!dryRun && (
            <Typography variant="body2" color="success.main">
              <strong>{Locale.label("donations.stripeImportPage.importedLabel")}</strong> {summary.imported}
            </Typography>
          )}
          <Typography variant="body2" color="warning.main">
            <strong>{Locale.label("donations.stripeImportPage.skippedLabel")}</strong> {summary.skipped}
          </Typography>
          {summary.errors > 0 && (
            <Typography variant="body2" color="error.main">
              <strong>{Locale.label("donations.stripeImportPage.errorsLabel")}</strong> {summary.errors}
            </Typography>
          )}
        </Stack>
        {dryRun && summary.new > 0 && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {Locale.label("donations.stripeImportPage.clickImportMissing").replace("{count}", summary.new.toString())}
          </Typography>
        )}
      </Alert>
    );
  };

  const denied = useRequirePermission(Permissions.givingApi.donations.edit);
  if (denied) return denied;

  return (
    <>
      <PageHeader
        title={Locale.label("donations.stripeImportPage.title")}
        subtitle={Locale.label("donations.stripeImportPage.subtitle")}
      />

      <PageContainer>
        <Surface sx={{ mb: 3 }}>
          <Typography variant="h3" component="h2" sx={{ mb: 1 }}>
            {Locale.label("donations.stripeImportPage.selectDateRange")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {Locale.label("donations.stripeImportPage.dateRangeDescription")}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
            <AppDatePicker
              label="Start Date"

              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
            <AppDatePicker
              label="End Date"

              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              disabled={loading || !startDate || !endDate}
            >
              {Locale.label("donations.stripeImportPage.preview")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ImportIcon />}
              onClick={handleImport}
              disabled={loading || !startDate || !endDate || !importData?.summary?.new}
            >
              {Locale.label("donations.stripeImportPage.importMissing")}
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Surface>

        {loading && <Loading />}

        {!loading && importData && (
          <CardWithHeader
            title={importData.dryRun ? Locale.label("donations.stripeImportPage.previewResults") : Locale.label("donations.stripeImportPage.importResults")}
            count={importData.results?.length}
          >
            {getSummary()}
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.stripeImportPage.previewResults")} tabIndex={0}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("donations.stripeImportPage.eventId")}</TableCell>
                    <TableCell>{Locale.label("donations.stripeImportPage.type")}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>{Locale.label("donations.stripeImportPage.status")}</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{getRows()}</TableBody>
              </Table>
            </Box>
          </CardWithHeader>
        )}
      </PageContainer>
    </>
  );
};
