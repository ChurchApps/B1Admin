import React from "react";
import { ApiHelper, CurrencyHelper, DateHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type PersonInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Alert, Box, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { ErrorOutline as FailedIcon, Refresh as RetryIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageContainer, Surface, EmptyState, LoadingButton, hoverRowSx, numericCellSx, tableScrollSx } from "../components/ui";
import { useRequirePermission } from "../hooks";

interface FailedDonationInterface {
  id?: string;
  personId?: string;
  amount?: number;
  currency?: string;
  donationDate?: Date;
  gatewayMessage?: string;
  canRetry?: boolean;
}

export const FailedDonationsPage = () => {
  const [currency, setCurrency] = React.useState<string>("usd");
  const [retryingId, setRetryingId] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const donations = useQuery<FailedDonationInterface[]>({ queryKey: ["/donations/failed", "GivingApi"], placeholderData: [] });
  const rateTable = useQuery<{ rates?: Record<string, number> }>({ queryKey: ["/donations/exchange-rates", "GivingApi"], placeholderData: {} });

  const personIds = React.useMemo(() => (donations.data || []).map((d) => d.personId).filter(Boolean).join(","), [donations.data]);
  const people = useQuery<PersonInterface[]>({ queryKey: ["/people/ids?ids=" + personIds, "MembershipApi"], placeholderData: [], enabled: !!personIds });

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const refetch = donations.refetch;
  const handleRetry = React.useCallback(async (id: string) => {
    setRetryingId(id);
    setError("");
    try {
      await ApiHelper.post("/donate/retry/" + id, {}, "GivingApi");
      await refetch();
    } catch (e: any) {
      setError(e?.message || Locale.label("donations.failedDonations.retryFailed"));
    }
    setRetryingId("");
  }, [refetch]);

  const totalAmount = (donations.data || []).reduce((sum, d) => sum + CurrencyHelper.convertAmount(d.amount || 0, d.currency || currency, currency, rateTable.data?.rates || {}), 0);
  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);

  const getRows = () => {
    if (!donations.data?.length) {
      return (
        <TableRow>
          <EmptyState variant="table" colSpan={5} icon={<FailedIcon />} title={Locale.label("donations.failedDonations.none")} />
        </TableRow>
      );
    }

    return donations.data.map((d) => {
      const person = people.data?.find((p) => p.id === d.personId);
      const message = d.gatewayMessage || "";
      return (
        <TableRow key={d.id} sx={hoverRowSx} data-testid={"failed-donation-" + d.id}>
          <TableCell>
            {d.personId
              ? <Typography component={Link} to={"/people/" + d.personId} variant="body2" sx={{ textDecoration: "none", color: "primary.main", fontWeight: 600 }}>{person?.name?.display || d.personId}</Typography>
              : <Typography variant="body2">{Locale.label("donations.donations.anon")}</Typography>}
          </TableCell>
          <TableCell align="right" sx={numericCellSx}><Typography variant="body2" sx={{ fontWeight: 600 }}>{CurrencyHelper.formatCurrencyWithLocale(d.amount || 0, d.currency || currency)}</Typography></TableCell>
          <TableCell><Typography variant="body2">{DateHelper.prettyDate(new Date(d.donationDate as any))}</Typography></TableCell>
          <TableCell>
            <Tooltip title={message}>
              <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>{message}</Typography>
            </Tooltip>
          </TableCell>
          <TableCell align="right">
            {canEdit && d.canRetry && (
              <LoadingButton
                size="small"
                variant="outlined"
                startIcon={<RetryIcon />}
                loading={retryingId === d.id}
                onClick={() => handleRetry(d.id as string)}
                data-testid={"retry-" + d.id}>
                {Locale.label("donations.failedDonations.retry")}
              </LoadingButton>
            )}
          </TableCell>
        </TableRow>
      );
    });
  };

  const denied = useRequirePermission(Permissions.givingApi.donations.view);
  if (denied) return denied;

  return (
    <>
      <PageHeader
        title={Locale.label("donations.failedDonations.title")}
        subtitle={donations.data?.length
          ? Locale.label("donations.failedDonations.lede", "{count} failed · {amount} at risk").replace("{count}", donations.data.length.toString()).replace("{amount}", CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency, 0))
          : Locale.label("donations.failedDonations.subtitle")} />

      <PageContainer>
        {error && <Alert severity="error" sx={{ mb: 2 }} data-testid="retry-error">{error}</Alert>}
        <Surface disablePadding>
          {donations.isLoading ? <Loading /> : (
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.failedDonations.title")} tabIndex={0}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("common.person")}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>{Locale.label("donations.donations.amt")}</TableCell>
                    <TableCell>{Locale.label("donations.donations.date")}</TableCell>
                    <TableCell>{Locale.label("donations.failedDonations.message")}</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{getRows()}</TableBody>
              </Table>
            </Box>
          )}
        </Surface>
      </PageContainer>
    </>
  );
};
