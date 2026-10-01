import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserHelper, Loading, Locale } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Box, Button, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, Link as MuiLink } from "@mui/material";
import { Add as AddIcon, CalendarMonth as CalendarIcon } from "@mui/icons-material";
import { CalendarEdit } from "./components";
import { CalendarChrome } from "./components/CalendarChrome";
import { useRequirePermission, usePendingApprovalsCount } from "../hooks";
import { EmptyState, HeaderPrimaryButton, HeaderTextButton, ResultsBar, SearchField, StatusBadge, Surface, TextAction, VerbRow, hoverRowSx, tableScrollSx } from "../components/ui";

export const CalendarsPage = () => {
  const calendarsQuery = useQuery<CuratedCalendarInterface[]>({ queryKey: ["/curatedCalendars", "ContentApi"], placeholderData: [] });
  const [currentCalendar, setCurrentCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [find, setFind] = useState("");
  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  const pendingApprovals = usePendingApprovalsCount();
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);

  const all = calendarsQuery.data || [];
  const term = find.trim().toLowerCase();
  const calendars = term ? all.filter((c) => (c.name || "").toLowerCase().includes(term)) : all;
  const adding = !!currentCalendar && !currentCalendar.id;
  const startAdd = () => {
    setCurrentCalendar({} as CuratedCalendarInterface);
    setTimeout(() => document.getElementById("add-calendar-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const done = () => {
    setCurrentCalendar(null);
    calendarsQuery.refetch();
  };

  if (denied) return denied;

  const subtitle = all.length > 0
    ? `${all.length} ${all.length === 1 ? Locale.label("calendars.calendarList.calendar") : Locale.label("calendars.calendarList.calendars")}`
    : Locale.label("calendars.calendarList.subtitleEmpty");

  return (
    <CalendarChrome
      selected="calendars"
      subtitle={subtitle}
      actions={(
        <>
          {pendingApprovals > 0 && (
            <HeaderTextButton component={Link} to="/calendars/approvals" data-testid="pending-approvals-link">
              {Locale.label("calendars.calendarPage.pendingApprovals").replace("{count}", String(pendingApprovals))}
            </HeaderTextButton>
          )}
          {canEdit && (
            <HeaderPrimaryButton startIcon={<AddIcon />} onClick={startAdd} data-testid={all.length === 0 ? "empty-state-add-calendar" : "add-calendar"}>
              {Locale.label("calendars.calendarList.addCalendar")}
            </HeaderPrimaryButton>
          )}
        </>
      )}>
      {currentCalendar?.id && (
        <Box sx={{ mb: 3 }}>
          <CalendarEdit calendar={currentCalendar} updatedCallback={done} />
        </Box>
      )}

      <Surface>
        {calendarsQuery.isLoading ? (
          <Loading data-testid="calendars-loading" />
        ) : all.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<CalendarIcon />}
            title={Locale.label("calendars.calendarList.noCalendars")}
            description={Locale.label("calendars.calendarList.createFirstCalendar")}
          />
        ) : (
          <Stack spacing={3}>
            <SearchField value={find} onChange={setFind} label={Locale.label("calendars.calendarList.find", "Find a calendar")} data-testid="calendars-find" />
            <ResultsBar>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("calendars.calendarList.resultCount", "{shown} of {total} calendars").replace("{shown}", calendars.length.toString()).replace("{total}", all.length.toString())}
              </Typography>
              {term && <Button size="small" onClick={() => setFind("")}>{Locale.label("common.clear", "Clear")}</Button>}
            </ResultsBar>
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("calendars.calendarList.title")} tabIndex={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("calendars.calendarList.calendar")}</TableCell>
                    <TableCell>{Locale.label("calendars.calendarList.status")}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calendars.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">{Locale.label("calendars.calendarList.noMatches", "No calendars match your search.")}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {calendars.map((calendar) => (
                    <TableRow key={calendar.id} sx={hoverRowSx}>
                      <TableCell>
                        <MuiLink component={Link} to={"/calendars/" + calendar.id} underline="hover" sx={{ fontWeight: 600 }}>
                          {calendar.name}
                        </MuiLink>
                        <Typography variant="body2" color="text.secondary">
                          {Locale.label("calendars.calendarList.curatedCalendar")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone="success" variant="dot">{Locale.label("calendars.calendarList.active")}</StatusBadge>
                      </TableCell>
                      <TableCell align="right" className="rowActions">
                        <VerbRow sx={{ justifyContent: "flex-end" }}>
                          <TextAction small to={"/calendars/" + calendar.id} component={Link} data-testid={`manage-calendar-${calendar.id}`}>
                            {Locale.label("calendars.calendarList.manageEvents")}
                          </TextAction>
                          {canEdit && (
                            <TextAction small onClick={() => setCurrentCalendar(calendar)} data-testid={`edit-calendar-${calendar.id}`}>
                              {Locale.label("common.edit")}
                            </TextAction>
                          )}
                        </VerbRow>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        )}
        {canEdit && adding && (
          <Box id="add-calendar-bar" data-testid="add-calendar-bar" sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3 }}>
            <CalendarEdit calendar={currentCalendar} updatedCallback={done} />
          </Box>
        )}
      </Surface>

      {all.length > 0 && !currentCalendar && (
        <Box sx={{ mt: 4, maxWidth: 720 }}>
          <Typography variant="h3" component="h2" sx={{ mb: 1 }}>{Locale.label("calendars.calendarList.aboutTitle")}</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>{Locale.label("calendars.calendarList.aboutParagraph1")}</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>{Locale.label("calendars.calendarList.aboutParagraph2")}</Typography>
          <Typography variant="body2" color="text.secondary">{Locale.label("calendars.calendarList.aboutParagraph3")}</Typography>
        </Box>
      )}
    </CalendarChrome>
  );
};

export default CalendarsPage;
