import React, { useEffect, useState } from "react";
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
import { ApiHelper, Loading, PageHeader } from "@churchapps/apphelper";
import { type EventInterface } from "@churchapps/helpers";

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

  const getCapacityDisplay = (event: EventInterface) => {
    const count = counts[event.id] || 0;
    if (!event.capacity) return <Typography variant="body2">{count} registered</Typography>;
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
      <PageHeader icon={<RegIcon />} title="Event Registrations" subtitle="Manage event registration settings and view registrants" />
      <Box sx={{ p: 3 }}>
        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <RegIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                Events with Registration Enabled
              </Typography>
            </Stack>
          </Box>
          {loading ? (
            <Box sx={{ p: 3, textAlign: "center" }}><Loading /></Box>
          ) : events.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <RegIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No events have registration enabled yet.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Enable registration on an event through the event edit settings.
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Event</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Registrations</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
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
