import React from "react";
import { ApiHelper, CurrencyHelper, DateHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type PersonInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Alert, Box, Table, TableBody, TableCell, TableHead, TableRow, Tooltip } from "@mui/material";
import { ErrorOutline as FailedIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, LoadingButton, hoverRowSx } from "../components/ui";
import { useRequirePermission } from "../hooks";
import { SectionTitle, plateSx, plainTableSx, mutedSx } from "./components/plate";

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
              ? <Box component={Link} to={"/people/" + d.personId} sx={{ textDecoration: "none", color: "var(--c1)", fontWeight: 500 }}>{person?.name?.display || d.personId}</Box>
              : Locale.label("donations.donations.anon")}
          </TableCell>
          <TableCell align="right" className="amt" sx={{ fontWeight: 600, color: "warning.main" }}>{CurrencyHelper.formatCurrencyWithLocale(d.amount || 0, d.currency || currency)}</TableCell>
          <TableCell>{DateHelper.prettyDate(new Date(d.donationDate as any))}</TableCell>
          <TableCell>
            <Tooltip title={message}>
              <Box sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message}</Box>
            </Tooltip>
          </TableCell>
          <TableCell align="right">
            {canEdit && d.canRetry && (
              <LoadingButton
                size="small"
                variant="outlined"
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
    <Box sx={plateSx}>
      <SectionTitle sx={{ mt: 0 }}>{Locale.label("donations.failedDonations.title")}</SectionTitle>
      {!!donations.data?.length && (
        <Box sx={mutedSx}>
          {donations.data.length} {Locale.label("donations.failedDonations.gifts")?.toLowerCase() || "failed"} · {CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency, 0)} {Locale.label("donations.failedDonations.atRisk")?.toLowerCase()}
        </Box>
      )}
      {error && <Alert severity="error" sx={{ my: 2 }} data-testid="retry-error">{error}</Alert>}
      {donations.isLoading ? <Loading /> : (
        <Table sx={plainTableSx}>
          <TableHead>
            <TableRow>
              <TableCell component="th">{Locale.label("common.person")}</TableCell>
              <TableCell component="th">{Locale.label("donations.donations.amt")}</TableCell>
              <TableCell component="th">{Locale.label("donations.donations.date")}</TableCell>
              <TableCell component="th">{Locale.label("donations.failedDonations.message")}</TableCell>
              <TableCell component="th"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      )}
    </Box>
  );
};
