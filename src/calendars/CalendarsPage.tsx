import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface } from "@churchapps/helpers";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  TableContainer,
  Paper
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { CalendarEdit } from "./components";
import { useRequirePermission } from "../hooks";
import { EmptyState } from "../components/ui/EmptyState";
import { hoverRowSx } from "../components/ui/tableStyles";
import { AppIconButton } from "../components/ui/AppIconButton";
import { HeaderPrimaryButton } from "../components/ui/headerButtons";

export const CalendarsPage = () => {
  const calendarsQuery = useQuery<CuratedCalendarInterface[]>({ queryKey: ["/curatedCalendars", "ContentApi"], placeholderData: [] });
  const [currentCalendar, setCurrentCalendar] = useState<CuratedCalendarInterface | null>(null);
  const navigate = useNavigate();
  const denied = useRequirePermission(Permissions.contentApi.content.edit);

  const getRows = () => calendarsQuery.data.map((calendar) => (
    <TableRow
      key={calendar.id}
      sx={hoverRowSx}
    >
      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              borderRadius: 1,
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 40,
              height: 40
            }}
          >
            <CalendarIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography component={Link} to={"/calendars/" + calendar.id} variant="subtitle1" sx={{ fontWeight: 600, textDecoration: "none", color: "var(--link)" }}>
              {calendar.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Locale.label("calendars.calendarList.curatedCalendar")}
            </Typography>
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        <Chip
          icon={<EventIcon />}
          label={Locale.label("calendars.calendarList.active")}
          size="small"
          sx={{
            backgroundColor: "rgba(46, 125, 50, 0.1)",
            color: "success.main",
            fontWeight: 600
          }}
        />
      </TableCell>
      <TableCell align="right" className="rowActions">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <AppIconButton
            tone="card"
            label={Locale.label("calendars.calendarList.manageEvents")}
            icon={<EventIcon />}
            onClick={() => navigate("/calendars/" + calendar.id)}
            data-testid={`manage-calendar-${calendar.id}`}
          />
          {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
            <AppIconButton
              tone="card"
              label={Locale.label("common.edit")}
              icon={<EditIcon />}
              onClick={() => setCurrentCalendar(calendar)}
              data-testid={`edit-calendar-${calendar.id}`}
            />
          )}
        </Stack>
      </TableCell>
    </TableRow>
  ));

  if (denied) return denied;

  return (
    <>
      <PageHeader
        icon={<CalendarIcon />}
        title={Locale.label("calendars.calendarList.title")}
        subtitle={
          calendarsQuery.data.length > 0
            ? Locale.label("calendars.calendarList.subtitleWithCount", `${calendarsQuery.data.length} ${calendarsQuery.data.length === 1 ? Locale.label("calendars.calendarList.calendar") : Locale.label("calendars.calendarList.calendars")}`)
            : Locale.label("calendars.calendarList.subtitleEmpty")
        }
      >
        {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
          <HeaderPrimaryButton
            startIcon={<AddIcon />}
            onClick={() => setCurrentCalendar({} as CuratedCalendarInterface)}
            data-testid="add-calendar"
          >
            {Locale.label("calendars.calendarList.addCalendar")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {currentCalendar && (
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
        ) : calendarsQuery.data.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon />}
            title={Locale.label("calendars.calendarList.noCalendars")}
            description={Locale.label("calendars.calendarList.createFirstCalendar")}
            action={UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCurrentCalendar({} as CuratedCalendarInterface)} data-testid="empty-state-add-calendar">
                {Locale.label("calendars.calendarList.createCalendar")}
              </Button>
            )}
          />
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    {Locale.label("calendars.calendarList.calendar")}
                  </TableCell>
                  <TableCell>
                    {Locale.label("calendars.calendarList.status")}
                  </TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>{getRows()}</TableBody>
            </Table>
          </TableContainer>
        )}

        {calendarsQuery.data.length > 0 && !currentCalendar && (
          <Card sx={{ mt: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <DescriptionIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {Locale.label("calendars.calendarList.aboutTitle")}
                  </Typography>
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
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </>
  );
};

export default CalendarsPage;
