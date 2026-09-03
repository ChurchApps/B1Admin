import React from "react";
import { ApiHelper, CurrencyHelper, DateHelper, Loading, Locale, PageHeader, Permissions, UserHelper } from "@churchapps/apphelper";
import { type PersonInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Alert, Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { ErrorOutline as FailedIcon, Refresh as RetryIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { CardWithHeader, EmptyState, LoadingButton, PageHeaderStats, hoverRowSx } from "../components/ui";

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

  const totalAmount = (donations.data || []).reduce((sum, d) => sum + (d.amount || 0), 0);
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
              ? <Typography component={Link} to={"/people/" + d.personId} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>{person?.name?.display || d.personId}</Typography>
              : <Typography variant="body2">{Locale.label("donations.donations.anon")}</Typography>}
          </TableCell>
          <TableCell align="right"><Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>{CurrencyHelper.formatCurrencyWithLocale(d.amount || 0, d.currency || currency)}</Typography></TableCell>
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

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.view)) return <></>;

  return (
    <>
      <PageHeader icon={<FailedIcon />} title={Locale.label("donations.failedDonations.title")} subtitle={Locale.label("donations.failedDonations.subtitle")}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} width="100%">
          {!!donations.data?.length && (
            <PageHeaderStats
              items={[
                { icon: <FailedIcon sx={{ color: "#FFF", fontSize: 24 }} />, value: donations.data.length, label: Locale.label("donations.failedDonations.gifts"), minWidth: 80 },
                { value: CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency, 0), label: Locale.label("donations.failedDonations.atRisk") }
              ]}
            />
          )}
        </Stack>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} data-testid="retry-error">{error}</Alert>}
        <CardWithHeader icon={<FailedIcon sx={{ color: "primary.main", fontSize: 20 }} />} title={Locale.label("donations.failedDonations.title")} count={donations.data?.length || 0}>
          {donations.isLoading ? <Loading /> : (
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("common.person")}</TableCell>
                  <TableCell align="right">{Locale.label("donations.donations.amt")}</TableCell>
                  <TableCell>{Locale.label("donations.donations.date")}</TableCell>
                  <TableCell>{Locale.label("donations.failedDonations.message")}</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{getRows()}</TableBody>
            </Table>
          )}
        </CardWithHeader>
      </Box>
    </>
  );
};
