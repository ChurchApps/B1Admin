import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Typography, Table, TableBody, TableRow, TableCell, TableHead, Box, Chip, LinearProgress } from "@mui/material";
import { HowToReg as RegIcon } from "@mui/icons-material";
import { ApiHelper, Loading, Locale, Permissions } from "@churchapps/apphelper";
import { type EventInterface } from "@churchapps/helpers";
import { EmptyState } from "../components/ui";
import { useRequirePermission } from "../hooks";
import { formatDateSafe } from "../helpers/DateFormatHelper";
import { AddBlock, DirectoryPage, FindField, Verb, plainTableSx } from "./components/plate";

export const RegistrationsPage = () => {
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [find, setFind] = useState("");

  const loadData = async () => {
    setLoading(true);
    const data: EventInterface[] = await ApiHelper.get("/events/registerable", "ContentApi");
    setEvents(data || []);

    const countMap: Record<string, number> = {};
    if (data?.length > 0) {
      await Promise.all(data.map(async (event) => {
        const result = await ApiHelper.get("/registrations/event/" + event.id + "/count?churchId=" + event.churchId, "ContentApi");
        countMap[event.id || ""] = result?.count || 0;
      }));
    }
    setCounts(countMap);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  if (denied) return denied;

  const filtered = events.filter((event) => {
    const q = find.toLowerCase();
    return !q || (event.title || "").toLowerCase().includes(q) || (event.tags || "").toLowerCase().includes(q);
  });

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

  return (
    <DirectoryPage
      title={Locale.label("registrations.registrationsPage.title")}
      lede={Locale.label("registrations.registrationsPage.subtitle")}
      headerVerbs={<Verb to="/calendars">{Locale.label("helpers.secondaryMenuHelper.calendars")}</Verb>}
      find={<FindField value={find} onChange={setFind} placeholder={Locale.label("common.search")} />}>
      {loading ? (
        <Box sx={{ p: 3, textAlign: "center" }}><Loading /></Box>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<RegIcon />}
          title={Locale.label("registrations.registrationsPage.noEvents")}
          description={Locale.label("registrations.registrationsPage.noEventsHint")}
          action={
            <Verb to="/calendars" testId="empty-state-go-to-calendars">{Locale.label("registrations.registrationsPage.goToCalendars")}</Verb>
          }
        />
      ) : (
        <Table sx={plainTableSx}>
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("registrations.registrationsPage.event")}</TableCell>
              <TableCell>{Locale.label("registrations.registrationsPage.date")}</TableCell>
              <TableCell>{Locale.label("registrations.registrationsPage.registrations")}</TableCell>
              <TableCell>{Locale.label("registrations.registrationsPage.tags")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((event) => (
              <TableRow key={event.id}>
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
            ))}
          </TableBody>
        </Table>
      )}
      <AddBlock>
        <Verb to="/calendars">{Locale.label("registrations.registrationsPage.goToCalendars")}</Verb>
      </AddBlock>
    </DirectoryPage>
  );
};

export default RegistrationsPage;
