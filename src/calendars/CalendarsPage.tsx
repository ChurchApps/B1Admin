import { useState, useEffect } from "react";
import { ApiHelper, UserHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface } from "@churchapps/helpers";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TableContainer,
  Paper,
  Tooltip
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Event as EventIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { CalendarEdit } from "./components";

export const CalendarsPage = () => {
  const [calendars, setCalendars] = useState<CuratedCalendarInterface[]>([]);
  const [currentCalendar, setCurrentCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    ApiHelper.get("/curatedCalendars", "ContentApi").then((data: any) => {
      setCalendars(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

  const getRows = () => calendars.map((calendar) => (
    <TableRow
      key={calendar.id}
      sx={{
        '&:hover': {
          backgroundColor: 'action.hover',
          cursor: 'pointer'
        },
        transition: 'background-color 0.2s ease'
      }}
      onClick={() => navigate("/calendars/" + calendar.id)}
    >
      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              borderRadius: 1,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 40,
              height: 40
            }}
          >
            <CalendarIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
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
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            fontWeight: 600
          }}
        />
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title={Locale.label("calendars.calendarList.manageEvents")} arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/calendars/" + calendar.id);
              }}
              sx={{
                color: 'primary.main',
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
              data-testid={`manage-calendar-${calendar.id}`}
            >
              <EventIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
            <Tooltip title={Locale.label("calendars.calendarList.edit")} arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentCalendar(calendar);
                }}
                sx={{
                  color: 'primary.main',
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
                data-testid={`edit-calendar-${calendar.id}`}
              >
                <EditIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  ));

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <PageHeader
        icon={<CalendarIcon />}
        title={Locale.label("calendars.calendarList.title")}
        subtitle={
          calendars.length > 0
            ? Locale.label("calendars.calendarList.subtitleWithCount", `${calendars.length} ${calendars.length === 1 ? Locale.label("calendars.calendarList.calendar") : Locale.label("calendars.calendarList.calendars")}`)
            : Locale.label("calendars.calendarList.subtitleEmpty")
        }
      >
        {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCurrentCalendar({} as CuratedCalendarInterface)}
            sx={{
              color: "#FFF",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": {
                borderColor: "#FFF",
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
            data-testid="add-calendar"
          >
            {Locale.label("calendars.calendarList.addCalendar")}
          </Button>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {!currentCalendar ? (
          <>
            {loading ? (
              <Loading data-testid="calendars-loading" />
            ) : calendars.length === 0 ? (
              <Paper
                sx={{
                  p: 6,
                  textAlign: "center",
                  backgroundColor: "var(--bg-sub)",
                  border: "1px dashed",
                  borderColor: "var(--border-main)",
                  borderRadius: 2,
                }}
              >
                <CalendarIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {Locale.label("calendars.calendarList.noCalendars")}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {Locale.label("calendars.calendarList.createFirstCalendar")}
                </Typography>
                {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCurrentCalendar({} as CuratedCalendarInterface)}
                    data-testid="empty-state-add-calendar"
                  >
                    {Locale.label("calendars.calendarList.createCalendar")}
                  </Button>
                )}
              </Paper>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "var(--border-light)",
                }}
              >
                <Table>
                  <TableHead sx={{ backgroundColor: "var(--bg-card)" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                        {Locale.label("calendars.calendarList.calendar")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                        {Locale.label("calendars.calendarList.status")}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary" }}>
                        {Locale.label("calendars.calendarList.actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>{getRows()}</TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        ) : (
          <Grid container spacing={3} sx={{ width: "100%" }}>
            <Grid size={{ xs: 12, md: 8 }}>
              {loading ? (
                <Loading data-testid="calendars-loading" />
              ) : (
                <TableContainer
                  component={Paper}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "var(--border-light)",
                  }}
                >
                  <Table>
                    <TableHead sx={{ backgroundColor: "var(--bg-card)" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                          {Locale.label("calendars.calendarList.calendar")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                          {Locale.label("calendars.calendarList.status")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          {Locale.label("calendars.calendarList.actions")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>{getRows()}</TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <CalendarEdit
                calendar={currentCalendar}
                updatedCallback={() => {
                  setCurrentCalendar(null);
                  loadData();
                }}
              />
            </Grid>
          </Grid>
        )}

        {calendars.length > 0 && !currentCalendar && (
          <Card sx={{ mt: 3, borderRadius: 2, border: "1px solid", borderColor: "var(--border-light)" }}>
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
