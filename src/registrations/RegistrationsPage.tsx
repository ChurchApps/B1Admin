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
  Chip,
  LinearProgress
} from "@mui/material";
import { HowToReg as RegIcon } from "@mui/icons-material";
import { ApiHelper, Loading, Locale, PageHeader, Permissions } from "@churchapps/apphelper";
import { type EventInterface } from "@churchapps/helpers";
import { CountChip, CardWithHeader } from "../components/ui";
import { useRequirePermission } from "../hooks";
import { formatDateSafe } from "../helpers/DateFormatHelper";

export const RegistrationsPage = () => {
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

  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  if (denied) return denied;

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
    <TableRow key={event.id} hover>
      <TableCell>
        <Typography component={Link} to={"/registrations/" + event.id} variant="body2" fontWeight={500} sx={{ textDecoration: "none", color: "var(--link)" }}>
          {event.title}
        </Typography>
      </TableCell>
      <TableCell>{formatDateSafe(event.start)}</TableCell>
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
      <PageHeader icon={<RegIcon />} title={Locale.label("registrations.registrationsPage.title")} subtitle={Locale.label("registrations.registrationsPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <CardWithHeader
          title={Locale.label("registrations.registrationsPage.enabledEvents")}
          icon={<RegIcon sx={{ color: "primary.main", fontSize: 20 }} />}
          actions={events.length > 0 ? <CountChip count={events.length} /> : undefined}>
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
          )}
        </CardWithHeader>
      </Box>
    </>
  );
};

export default RegistrationsPage;
