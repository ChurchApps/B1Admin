import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserHelper, Loading, Locale } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface } from "@churchapps/helpers";
import { Link, useNavigate } from "react-router-dom";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { CalendarEdit } from "./components";
import { CalendarChrome } from "./components/CalendarChrome";
import { AddBlock, FindField, Verb, plainTableSx } from "./components/plate";
import { useRequirePermission } from "../hooks";
import { EmptyState } from "../components/ui/EmptyState";
import { hoverRowSx } from "../components/ui/tableStyles";
import { CalendarMonth as CalendarIcon } from "@mui/icons-material";

export const CalendarsPage = () => {
  const calendarsQuery = useQuery<CuratedCalendarInterface[]>({ queryKey: ["/curatedCalendars", "ContentApi"], placeholderData: [] });
  const [currentCalendar, setCurrentCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [find, setFind] = useState("");
  const navigate = useNavigate();
  const denied = useRequirePermission(Permissions.contentApi.content.edit);

  const calendars = (calendarsQuery.data || []).filter((c) => !find || (c.name || "").toLowerCase().includes(find.toLowerCase()));
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);

  const startAdd = () => setCurrentCalendar({} as CuratedCalendarInterface);

  if (denied) return denied;

  return (
    <CalendarChrome
      selected="calendars"
      extraVerbs={canEdit ? <Verb onClick={startAdd} testId="add-calendar">{Locale.label("calendars.calendarList.addCalendar")}</Verb> : undefined}
      find={<FindField value={find} onChange={setFind} placeholder={Locale.label("common.search")} />}>
      {currentCalendar?.id && (
        <Box sx={{ mb: 3 }}>
          <CalendarEdit
            calendar={currentCalendar}
            updatedCallback={() => {
              setCurrentCalendar(null);
              calendarsQuery.refetch();
            }}
          />
        </Box>
      )}

      {calendarsQuery.isLoading ? (
        <Loading data-testid="calendars-loading" />
      ) : (calendarsQuery.data?.length || 0) === 0 ? (
        <EmptyState
          icon={<CalendarIcon />}
          title={Locale.label("calendars.calendarList.noCalendars")}
          description={Locale.label("calendars.calendarList.createFirstCalendar")}
          action={canEdit && (
            <Verb onClick={startAdd} testId="empty-state-add-calendar">{Locale.label("calendars.calendarList.createCalendar")}</Verb>
          )}
        />
      ) : (
        <Table sx={plainTableSx}>
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("calendars.calendarList.calendar")}</TableCell>
              <TableCell>{Locale.label("calendars.calendarList.status")}</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {calendars.map((calendar) => (
              <TableRow key={calendar.id} sx={hoverRowSx}>
                <TableCell>
                  <Typography component={Link} to={"/calendars/" + calendar.id} variant="subtitle1" sx={{ fontWeight: 600, textDecoration: "none", color: "var(--link)" }}>
                    {calendar.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Locale.label("calendars.calendarList.curatedCalendar")}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
                    {Locale.label("calendars.calendarList.active")}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box className="rowActions" sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                    <Verb onClick={() => navigate("/calendars/" + calendar.id)} testId={`manage-calendar-${calendar.id}`}>{Locale.label("calendars.calendarList.manageEvents")}</Verb>
                    {canEdit && (
                      <Verb onClick={() => setCurrentCalendar(calendar)} testId={`edit-calendar-${calendar.id}`}>{Locale.label("common.edit")}</Verb>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canEdit && (!currentCalendar || currentCalendar.id) && (
        <AddBlock title={Locale.label("calendars.calendarList.addCalendar")}>
          <Verb onClick={startAdd}>{Locale.label("calendars.calendarList.createCalendar")}</Verb>
        </AddBlock>
      )}

      {currentCalendar && !currentCalendar.id && (
        <AddBlock title={Locale.label("calendars.calendarEdit.createCalendar")}>
          <CalendarEdit
            calendar={currentCalendar}
            updatedCallback={() => {
              setCurrentCalendar(null);
              calendarsQuery.refetch();
            }}
          />
        </AddBlock>
      )}

      {(calendarsQuery.data?.length || 0) > 0 && !currentCalendar && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            {Locale.label("calendars.calendarList.aboutParagraph1")}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {Locale.label("calendars.calendarList.aboutParagraph2")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("calendars.calendarList.aboutParagraph3")}
          </Typography>
        </Box>
      )}
    </CalendarChrome>
  );
};

export default CalendarsPage;
