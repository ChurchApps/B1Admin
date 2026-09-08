import { memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, Button } from "@mui/material";
import { DateHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { getPaymentProvider } from "@churchapps/apphelper/donations";
import { type PersonInterface } from "@churchapps/helpers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mutedSx, SectionTitle } from "./plate";

export const DonationEvents = memo(() => {
  const queryClient = useQueryClient();

  const errorLogs = useQuery<any[]>({
    queryKey: ["/eventLog/type/failed", "GivingApi"],
    placeholderData: []
  });

  const personIds = useMemo(() => {
    if (!errorLogs.data?.length) return "";
    return errorLogs.data.map((log: any) => log.personId).join(",");
  }, [errorLogs.data]);

  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people/ids?ids=" + personIds, "MembershipApi"],
    placeholderData: [],
    enabled: !!personIds
  });

  const unresolvedErrorCount = useMemo(() => {
    if (!errorLogs.data?.length) return 0;
    return errorLogs.data.filter((log: any) => !log.resolved).length;
  }, [errorLogs.data]);

  const handleClick = useCallback(
    (id: string, resolved: boolean) => {
      resolved = !resolved;
      ApiHelper.post("/eventLog", [{ id, resolved }], "GivingApi").then(() => {
        queryClient.invalidateQueries({ queryKey: ["/eventLog/type/failed", "GivingApi"] });
      });
    },
    [queryClient]
  );

  const getPersonName = useCallback(
    (personId: string) => people.data?.find((person: any) => person.id === personId)?.name?.display,
    [people.data]
  );

  if (!errorLogs.data?.length) return null;

  return (
    <Box data-cy="eventLogs">
      <SectionTitle>
        {Locale.label("donations.donationEvents.failed")}{unresolvedErrorCount}{Locale.label("donations.donationEvents.unres")}
      </SectionTitle>
      {errorLogs.data.map((log: any) => {
        const eventType = log.eventType?.replace(".", " ") || "";
        const eventUrl = getPaymentProvider(log.provider).descriptor.eventUrl?.(log.id);
        return (
          <Box key={log.id} sx={{ py: 1.5, borderTop: "1px solid var(--border-main)" }}>
            <Box sx={{ fontWeight: 500, color: log.resolved ? "var(--text-main)" : "warning.main" }}>
              <span className="capitalize">{eventType}</span> — {DateHelper.prettyDate(log.created)}
            </Box>
            <Box sx={mutedSx}>
              {Locale.label("common.person")} <Link to={"/people/" + log.personId.toString()}>{getPersonName(log.personId)}</Link>
            </Box>
            <Box sx={mutedSx}>
              {Locale.label("donations.donationEvents.event")}
              {eventUrl ? <a href={eventUrl}>{eventType}</a> : eventType}
            </Box>
            <Box sx={mutedSx}>{Locale.label("donations.donationEvents.msg")}{log.message}</Box>
            <Button aria-label="resolve-button" variant={log.resolved ? "outlined" : "contained"} size="small" sx={{ mt: 1 }} onClick={() => handleClick(log.id, log.resolved)}>
              {Locale.label("donations.donationEvents.mark")}
              {log.resolved ? Locale.label("donations.donationEvents.unresolved") : Locale.label("donations.donationEvents.resolved")}
            </Button>
          </Box>
        );
      })}
    </Box>
  );
});
