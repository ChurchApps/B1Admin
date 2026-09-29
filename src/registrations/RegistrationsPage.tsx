import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Box,
  Stack,
  Link as MuiLink,
  LinearProgress,
  Button
} from "@mui/material";
import { HowToReg as RegIcon, CalendarMonth as CalendarIcon } from "@mui/icons-material";
import { ApiHelper, Loading, Locale, Permissions } from "@churchapps/apphelper";
import { type EventInterface } from "@churchapps/helpers";
import { AddBar, EmptyState, PageContainer, PageHeader, SearchField, StatusBadge, Surface, TextAction, tableScrollSx } from "../components/ui";
import { useRequirePermission } from "../hooks";
import { formatDateSafe } from "../helpers/DateFormatHelper";

export const RegistrationsPage = () => {
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data: EventInterface[] = await ApiHelper.get("/events/registerable", "ContentApi");
      setEvents(data || []);

      const countMap: Record<string, number> = {};
      if (data?.length > 0) {
        await Promise.all(data.map(async (event) => {
          const result = await ApiHelper.get("/registrations/event/" + event.id + "/count?churchId=" + event.churchId, "ContentApi").catch(() => null);
          countMap[event.id || ""] = result?.count || 0;
        }));
      }
      setCounts(countMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  if (denied) return denied;

  const getCapacityDisplay = (event: EventInterface) => {
    const count = counts[event.id || ""] || 0;
    if (!event.capacity) return <Typography variant="body2">{count} {Locale.label("registrations.registrationsPage.registered")}</Typography>;
    const pct = Math.min((count / event.capacity) * 100, 100);
    return (
      <Box sx={{ minWidth: 120 }}>
        <Typography variant="body2">{count} / {event.capacity}</Typography>
        <LinearProgress variant="determinate" value={pct} color={pct >= 100 ? "error" : "primary"} sx={{ mt: 0.5 }} />
      </Box>
    );
  };

  const query = search.trim().toLowerCase();
  const visibleEvents = query ? events.filter((e) => (e.title || "").toLowerCase().includes(query) || (e.tags || "").toLowerCase().includes(query)) : events;

  const getRows = () => visibleEvents.map((event) => (
    <TableRow key={event.id}>
      <TableCell>
        <MuiLink component={Link} to={"/registrations/" + event.id} underline="hover" sx={{ fontWeight: 600 }}>
          {event.title}
        </MuiLink>
      </TableCell>
      <TableCell>{formatDateSafe(event.start)}</TableCell>
      <TableCell>{getCapacityDisplay(event)}</TableCell>
      <TableCell>
        {event.tags && event.tags.split(",").map((tag) => (
          <Box key={tag} component="span" sx={{ mr: 0.5 }}><StatusBadge>{tag.trim()}</StatusBadge></Box>
        ))}
      </TableCell>
    </TableRow>
  ));

  return (
    <>
      <PageHeader title={Locale.label("registrations.registrationsPage.title")} subtitle={Locale.label("registrations.registrationsPage.subtitle")}>
        <TextAction to="/calendars" component={Link} data-testid="registrations-calendars-link">{Locale.label("helpers.secondaryMenuHelper.calendars", "Calendars")}</TextAction>
      </PageHeader>
      <PageContainer>
        {loading ? (
          <Box sx={{ p: 3, textAlign: "center" }}><Loading /></Box>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<RegIcon />}
            title={Locale.label("registrations.registrationsPage.noEvents")}
            description={Locale.label("registrations.registrationsPage.noEventsHint")}
            action={
              <Button variant="contained" startIcon={<CalendarIcon />} component={Link} to="/calendars" data-testid="empty-state-go-to-calendars">
                {Locale.label("registrations.registrationsPage.goToCalendars")}
              </Button>
            }
          />
        ) : (
          <Stack spacing={2}>
            <SearchField value={search} onChange={setSearch} data-testid="registrations-search" />
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {Locale.label("registrations.registrationsPage.enabledEvents")}: {visibleEvents.length}
            </Typography>
            <Surface disablePadding>
              <Box sx={tableScrollSx} role="region" aria-label={Locale.label("registrations.registrationsPage.enabledEvents")} tabIndex={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{Locale.label("registrations.registrationsPage.event")}</TableCell>
                      <TableCell>{Locale.label("registrations.registrationsPage.date")}</TableCell>
                      <TableCell>{Locale.label("registrations.registrationsPage.registrations")}</TableCell>
                      <TableCell>{Locale.label("registrations.registrationsPage.tags")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>{getRows()}</TableBody>
                </Table>
              </Box>
            </Surface>
          </Stack>
        )}
        {!loading && events.length > 0 && (
          <AddBar>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("registrations.registrationsPage.noEventsHint")}</Typography>
            <TextAction to="/calendars" component={Link} data-testid="registrations-add-from-calendars">{Locale.label("registrations.registrationsPage.goToCalendars")}</TextAction>
          </AddBar>
        )}
      </PageContainer>
    </>
  );
};

export default RegistrationsPage;
