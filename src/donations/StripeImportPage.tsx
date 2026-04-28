import React from "react";
import { ApiHelper, DateHelper, UserHelper, CurrencyHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/apphelper";
import { Box, Typography, Card, Stack, Button, TextField, Table, TableBody, TableCell, TableRow, TableHead, Chip, Alert } from "@mui/material";
import { CloudDownload as ImportIcon, Search as PreviewIcon, CheckCircle, Error as ErrorIcon, Info, SkipNext } from "@mui/icons-material";

interface StripeEventResult {
  eventId: string;
  type: string;
  amount: number;
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
  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  return { start: formatDate(startOfYear), end: formatDate(now) };
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
      case "new": return <Chip icon={<Info />} label={Locale.label("donations.stripeImportPage.new")} color="info" size="small" />;
      case "already_imported": return <Chip icon={<CheckCircle />} label={Locale.label("donations.stripeImportPage.alreadyImported")} color="default" size="small" />;
      case "imported": return <Chip icon={<CheckCircle />} label={Locale.label("donations.stripeImportPage.imported")} color="success" size="small" />;
      case "skipped": return <Chip icon={<SkipNext />} label={Locale.label("donations.stripeImportPage.skipped")} color="warning" size="small" />;
      case "error": return <Chip icon={<ErrorIcon />} label={Locale.label("donations.stripeImportPage.error")} color="error" size="small" />;
      default: return null;
    }
  };

  const getRows = () => {
    if (!importData?.results?.length) {
      return (
        <TableRow>
          <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <ImportIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body1" color="text.secondary">
                {Locale.label("donations.stripeImportPage.noEvents")}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
    }

    return importData.results.map((event, index) => (
      <TableRow key={event.eventId} sx={{ "&:hover": { backgroundColor: "action.hover" } }}>
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
            {event.eventId}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{event.type}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
            {CurrencyHelper.formatCurrency(event.amount)}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{DateHelper.prettyDate(new Date(event.created))}</Typography>
        </TableCell>
        <TableCell>{getStatusChip(event.status)}</TableCell>
        <TableCell>
          {event.error && (
            <Typography variant="body2" color="error" sx={{ fontSize: "0.75rem" }}>
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

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.edit)) return <></>;

  return (
    <>
      <PageHeader
        title={Locale.label("donations.stripeImportPage.title")}
        subtitle={Locale.label("donations.stripeImportPage.subtitle")}
      />

      <Box sx={{ p: 3 }}>
        <Card sx={{ mb: 3 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {Locale.label("donations.stripeImportPage.selectDateRange")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {Locale.label("donations.stripeImportPage.dateRangeDescription")}
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="End Date"
                type="date"
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
          </Box>
        </Card>

        {loading && <Loading />}

        {!loading && importData && (
          <Card>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ImportIcon />
                  <Typography variant="h6">
                    {importData.dryRun ? Locale.label("donations.stripeImportPage.previewResults") : Locale.label("donations.stripeImportPage.importResults")}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
            <Box sx={{ p: 2 }}>
              {getSummary()}
              <Table sx={{ minWidth: 650 }}>
                <TableHead
                  sx={{
                    backgroundColor: "grey.50",
                    "& .MuiTableCell-root": {
                      borderBottom: "2px solid",
                      borderBottomColor: "divider"
                    }
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{Locale.label("donations.stripeImportPage.eventId")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{Locale.label("donations.stripeImportPage.type")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{Locale.label("donations.stripeImportPage.status")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{getRows()}</TableBody>
              </Table>
            </Box>
          </Card>
        )}
      </Box>
    </>
  );
};
