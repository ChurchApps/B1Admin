import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
  Grid
} from "@mui/material";
import {
  HowToReg as RegIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon
} from "@mui/icons-material";
import { ApiHelper, Loading, PageHeader } from "@churchapps/apphelper";
import { type EventInterface, type RegistrationInterface } from "@churchapps/helpers";
import { RegistrationSettingsEdit } from "./components/RegistrationSettingsEdit";

export const RegistrationDetailsPage = () => {
  const params = useParams();
  const eventId = params.eventId;
  const [event, setEvent] = useState<EventInterface | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const loadData = async () => {
    if (!eventId) return;
    setLoading(true);
    const [eventData, regsData] = await Promise.all([
      ApiHelper.get("/events/" + eventId, "ContentApi"),
      ApiHelper.get("/registrations/event/" + eventId, "ContentApi")
    ]);
    setEvent(eventData);
    setRegistrations(regsData || []);
    setCount((regsData || []).filter((r: RegistrationInterface) => r.status !== "cancelled").length);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [eventId]);

  const handleCancel = async (regId: string) => {
    if (!confirm("Cancel this registration?")) return;
    await ApiHelper.post("/registrations/" + regId + "/cancel", {}, "ContentApi");
    loadData();
  };

  const handleDelete = async (regId: string) => {
    if (!confirm("Permanently delete this registration?")) return;
    await ApiHelper.delete("/registrations/" + regId, "ContentApi");
    loadData();
  };

  const handleExportCSV = () => {
    const rows = [["Name", "Members", "Status", "Date"]];
    registrations.forEach((reg) => {
      const members = reg.members?.map((m) => `${m.firstName} ${m.lastName}`).join("; ") || "";
      rows.push([
        reg.personId || "Guest",
        members,
        reg.status || "",
        reg.registeredDate ? new Date(reg.registeredDate).toLocaleDateString() : ""
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${event?.title || eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusChip = (status: string) => {
    const colorMap: Record<string, "success" | "warning" | "error" | "default"> = {
      confirmed: "success",
      pending: "warning",
      cancelled: "error",
      waitlisted: "default"
    };
    return <Chip label={status} size="small" color={colorMap[status] || "default"} />;
  };

  const getRows = () => registrations.map((reg) => (
    <TableRow key={reg.id}>
      <TableCell>
        {reg.members && reg.members.length > 0
          ? reg.members.map((m) => `${m.firstName} ${m.lastName}`).join(", ")
          : reg.personId || "Unknown"
        }
      </TableCell>
      <TableCell>{reg.members?.length || 0}</TableCell>
      <TableCell>{getStatusChip(reg.status)}</TableCell>
      <TableCell>{reg.registeredDate ? new Date(reg.registeredDate).toLocaleDateString() : ""}</TableCell>
      <TableCell align="right">
        {reg.status !== "cancelled" && (
          <Tooltip title="Cancel Registration" arrow>
            <IconButton size="small" onClick={() => handleCancel(reg.id)} color="warning"><CancelIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
        <Tooltip title="Delete" arrow>
          <IconButton size="small" onClick={() => handleDelete(reg.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  ));

  if (loading) return <Box sx={{ p: 3, textAlign: "center" }}><Loading /></Box>;
  if (!event) return <Typography>Event not found</Typography>;

  const capacityPct = event.capacity ? Math.min((count / event.capacity) * 100, 100) : 0;

  return (
    <>
      <PageHeader icon={<RegIcon />} title={event.title || "Event Registrations"} subtitle="Manage registrations for this event" />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <RegIcon sx={{ color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                      Registrations ({count}{event.capacity ? ` / ${event.capacity}` : ""})
                    </Typography>
                  </Stack>
                  <Button startIcon={<DownloadIcon />} size="small" onClick={handleExportCSV}>Export CSV</Button>
                </Stack>
                {event.capacity && (
                  <LinearProgress variant="determinate" value={capacityPct} color={capacityPct >= 100 ? "error" : "primary"} sx={{ mt: 1 }} />
                )}
              </Box>
              {registrations.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">No registrations yet.</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Members</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>{getRows()}</TableBody>
                </Table>
              )}
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <RegistrationSettingsEdit event={event} onUpdate={loadData} />
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default RegistrationDetailsPage;
