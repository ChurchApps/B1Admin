import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Card,
  Box,
  Stack,
  Chip,
  LinearProgress
} from "@mui/material";
import { HowToReg as RegIcon } from "@mui/icons-material";
import { ApiHelper, Loading, Locale, PageHeader, UserHelper, Permissions } from "@churchapps/apphelper";
import { type EventInterface } from "@churchapps/helpers";
import { PermissionDenied } from "../components";
import { CountChip } from "../components/ui";

export const RegistrationsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data: EventInterface[] = await ApiHelper.get("/events/registerable", "ContentApi");
    setEvents(data || []);

    // Load registration counts for each event
    const countMap: Record<string, number> = {};
    if (data?.length > 0) {
      await Promise.all(data.map(async (event) => {
        const result = await ApiHelper.get("/registrations/event/" + event.id + "/count?churchId=" + event.churchId, "ContentApi");
        countMap[event.id] = result?.count || 0;
      }));
    }
    setCounts(countMap);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  const getCapacityDisplay = (event: EventInterface) => {
    const count = counts[event.id] || 0;
    if (!event.capacity) return <Typography variant="body2">{count} {Locale.label("registrations.registrationsPage.registered")}</Typography>;
    const pct = Math.min((count / event.capacity) * 100, 100);
    return (
      <Box sx={{ minWidth: 120 }}>
        <Typography variant="body2">{count} / {event.capacity}</Typography>
        <LinearProgress variant="determinate" value={pct} color={pct >= 100 ? "error" : "primary"} sx={{ mt: 0.5 }} />
      </Box>
    );
  };

  const getRows = () => events.map((event) => (
    <TableRow key={event.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate("/registrations/" + event.id)}>
      <TableCell><Typography variant="body2" fontWeight={500}>{event.title}</Typography></TableCell>
      <TableCell>{event.start ? new Date(event.start).toLocaleDateString() : ""}</TableCell>
      <TableCell>{getCapacityDisplay(event)}</TableCell>
      <TableCell>
        {event.tags && event.tags.split(",").map((tag) => (
          <Chip key={tag} label={tag.trim()} size="small" sx={{ mr: 0.5 }} />
        ))}
      </TableCell>
    </TableRow>
  ));

  return (
    <>
      <PageHeader title={Locale.label("registrations.registrationsPage.title")} subtitle={Locale.label("registrations.registrationsPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <RegIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6">
                {Locale.label("registrations.registrationsPage.enabledEvents")}
              </Typography>
              {events.length > 0 && <CountChip count={events.length} />}
            </Stack>
          </Box>
          {loading ? (
            <Box sx={{ p: 3, textAlign: "center" }}><Loading /></Box>
          ) : events.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <RegIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {Locale.label("registrations.registrationsPage.noEvents")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Locale.label("registrations.registrationsPage.noEventsHint")}
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead sx={{ backgroundColor: "var(--bg-sub)" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationsPage.event")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationsPage.date")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationsPage.registrations")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationsPage.tags")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{getRows()}</TableBody>
            </Table>
          )}
        </Card>
      </Box>
    </>
  );
};

export default RegistrationsPage;
