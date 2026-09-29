import { memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { RecordHeading, TextAction } from "../../components/ui";
import { DateHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { getPaymentProvider } from "@churchapps/apphelper/donations";
import { type PersonInterface } from "@churchapps/helpers";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const DonationEvents = memo(() => {
  const queryClient = useQueryClient();

  const errorLogs = useQuery<any[]>({
    queryKey: ["/eventLog/type/failed", "GivingApi"],
    placeholderData: []
  });

  const personIds = useMemo(() => {
    if (!errorLogs.data?.length) return "";
    return [...new Set(errorLogs.data.map((log: any) => log.personId).filter(Boolean))].join(",");
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
    (personId: string) => {
      const person = people.data?.find((person: any) => person.id === personId);
      return person?.name?.display;
    },
    [people.data]
  );

  if (!errorLogs.data?.length) return null;

  return (
    <Box data-cy="eventLogs">
      <RecordHeading label={Locale.label("donations.donationEvents.failed") + unresolvedErrorCount + Locale.label("donations.donationEvents.unres")} />
      {errorLogs.data.map((log: any) => {
        const eventType = log.eventType?.replace(".", " ") || "";
        const eventUrl = getPaymentProvider(log.provider).descriptor.eventUrl?.(log.id);
        return (
          <Box key={log.id} sx={{ py: 1.5, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: log.resolved ? "text.primary" : "error.main" }}>
              <span className="capitalize">{eventType}</span> · {DateHelper.prettyDate(log.created)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Locale.label("common.person")} {log.personId ? <Link to={"/people/" + log.personId}>{getPersonName(log.personId)}</Link> : null}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="capitalize">
              {Locale.label("donations.donationEvents.event")}
              {eventUrl ? <a href={eventUrl}>{eventType}</a> : eventType}
            </Typography>
            <Typography variant="body2" color="text.secondary">{Locale.label("donations.donationEvents.msg")}{log.message}</Typography>
            <Box sx={{ mt: 0.5 }}>
              <TextAction small aria-label="resolve-button" onClick={() => handleClick(log.id, log.resolved)}>
                {Locale.label("donations.donationEvents.mark")}
                {log.resolved ? Locale.label("donations.donationEvents.unresolved") : Locale.label("donations.donationEvents.resolved")}
              </TextAction>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
});
