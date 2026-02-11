import React, { memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionDetails, AccordionSummary, Button, Icon } from "@mui/material";
import { DateHelper, ApiHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

  const people = useQuery({
    queryKey: ["/people/ids?ids=" + personIds, "MembershipApi"],
    placeholderData: [],
    enabled: !!personIds
  });

  const unresolvedErrorCount = useMemo(() => {
    if (!errorLogs.data?.length) return 0;
    return errorLogs.data.filter((log: any) => !log.resolved).length;
  }, [errorLogs.data]);

  const headerIcon = useMemo(() => {
    return unresolvedErrorCount > 0 ? "error danger-text" : "error";
  }, [unresolvedErrorCount]);

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

  const getErrorLogs = useCallback(() => {
    return errorLogs.data?.map((log: any) => {
      const eventType = log.eventType?.replace(".", " ") || "";
      return (
        <Accordion key={log.id}>
          <AccordionSummary>
            <Icon sx={{ marginRight: "5px", color: !log.resolved ? "#dc3545" : "#000" }}>error</Icon>
            <span className="capitalize">{eventType}</span> - {DateHelper.prettyDate(log.created)}
          </AccordionSummary>
          <AccordionDetails>
            <ul>
              <li key={`person-${log.id}`}>
                {Locale.label("common.person")}
                <Link to={"/people/" + log.personId.toString()}>{getPersonName(log.personId)}</Link>
              </li>
              <li key={`event-${log.id}`} className="capitalize">
                {Locale.label("donations.donationEvents.event")}
                <a href={"https://dashboard.stripe.com/events/" + log.id}>{eventType}</a>
              </li>
              <li key={`message-${log.id}`}>
                {Locale.label("donations.donationEvents.msg")}
                {log.message}
              </li>
              <li key={`actions-${log.id}`} style={{ float: "right" }}>
                <Button aria-label="resolve-button" variant={log.resolved ? "outlined" : "contained"} onClick={() => handleClick(log.id, log.resolved)}>
                  {Locale.label("donations.donationEvents.mark")}
                  {log.resolved ? "Unresolved" : "Resolved"}
                </Button>
              </li>
            </ul>
          </AccordionDetails>
        </Accordion>
      );
    }) || [];
  }, [errorLogs.data, getPersonName, handleClick]);

  if (!errorLogs.data?.length) return null;

  return (
    <DisplayBox data-cy="eventLogs" headerIcon={headerIcon} headerText={Locale.label("donations.donationEvents.failed") + unresolvedErrorCount + Locale.label("donations.donationEvents.unres")}>
      {getErrorLogs()}
    </DisplayBox>
  );
});
