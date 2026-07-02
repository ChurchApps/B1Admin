import { useEffect, useState } from "react";
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
  LinearProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from "@mui/material";
import {
  HowToReg as RegIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  PersonAdd as PersonAddIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { ApiHelper, Loading, Locale, PageHeader, UserHelper, Permissions, PersonHelper } from "@churchapps/apphelper";
import { type EventInterface, type RegistrationInterface, type PersonInterface } from "@churchapps/helpers";
import { PermissionDenied, PersonAdd, FormSubmission } from "../components";
import { RegistrationSettingsEdit } from "./components/RegistrationSettingsEdit";
import { AppIconButton } from "../components/ui/AppIconButton";
import { EventReminderEdit } from "../calendars/components/EventReminderEdit";

const parseErrorMessage = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.status === "full") return Locale.label("registrations.registrationDetailsPage.eventFull");
    return parsed?.error || raw;
  } catch {
    return raw;
  }
};

export const RegistrationDetailsPage = () => {
  const params = useParams();
  const eventId = params.eventId;
  const [event, setEvent] = useState<EventInterface | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [addError, setAddError] = useState("");
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [viewSubmissionId, setViewSubmissionId] = useState("");

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
    if (!confirm(Locale.label("registrations.registrationDetailsPage.cancelConfirm"))) return;
    await ApiHelper.post("/registrations/" + regId + "/cancel", {}, "ContentApi");
    loadData();
  };

  const handleDelete = async (regId: string) => {
    if (!confirm(Locale.label("registrations.registrationDetailsPage.deleteConfirm"))) return;
    await ApiHelper.delete("/registrations/" + regId, "ContentApi");
    loadData();
  };

  const handleAddAttendee = async (person: PersonInterface) => {
    if (!event) return;
    setAddError("");
    try {
      await ApiHelper.post("/registrations/register", { churchId: event.churchId, eventId: event.id, personId: person.id }, "ContentApi");
      setShowAddAttendee(false);
      loadData();
    } catch (err: any) {
      setAddError(parseErrorMessage(err?.message || "") || Locale.label("registrations.registrationDetailsPage.addAttendeeError"));
    }
  };

  const handleExportCSV = () => {
    const rows = [[Locale.label("registrations.registrationDetailsPage.csvName"), Locale.label("registrations.registrationDetailsPage.csvMembers"), Locale.label("registrations.registrationDetailsPage.csvStatus"), Locale.label("registrations.registrationDetailsPage.csvDate")]];
    registrations.forEach((reg) => {
      const members = reg.members?.map((m) => `${m.firstName} ${m.lastName}`).join("; ") || "";
      rows.push([
        reg.personId || Locale.label("registrations.registrationDetailsPage.guest"),
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

  const visibleRegistrations = event?.formId && unansweredOnly ? registrations.filter((r) => !r.formSubmissionId) : registrations;

  const getRows = () => visibleRegistrations.map((reg) => (
    <TableRow key={reg.id}>
      <TableCell>
        {reg.members && reg.members.length > 0
          ? reg.members.map((m) => `${m.firstName} ${m.lastName}`).join(", ")
          : reg.personId || Locale.label("registrations.registrationDetailsPage.unknown")
        }
      </TableCell>
      <TableCell>{reg.members?.length || 0}</TableCell>
      <TableCell>{getStatusChip(reg.status)}</TableCell>
      <TableCell>{reg.registeredDate ? new Date(reg.registeredDate).toLocaleDateString() : ""}</TableCell>
      <TableCell align="right" className="rowActions">
        {event?.formId && reg.formSubmissionId && (
          <AppIconButton label={Locale.label("registrations.registrationDetailsPage.viewAnswers")} icon={<DescriptionIcon />} onClick={() => setViewSubmissionId(reg.formSubmissionId)} />
        )}
        {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
          <>
            {reg.status !== "cancelled" && (
              <AppIconButton label={Locale.label("registrations.registrationDetailsPage.cancelRegistration")} icon={<CancelIcon />} onClick={() => handleCancel(reg.id)} />
            )}
            <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => handleDelete(reg.id)} />
          </>
        )}
      </TableCell>
    </TableRow>
  ));

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;
  if (loading) return <Box sx={{ p: 3, textAlign: "center" }}><Loading /></Box>;
  if (!event) return <Typography>{Locale.label("registrations.registrationDetailsPage.eventNotFound")}</Typography>;

  const capacityPct = event.capacity ? Math.min((count / event.capacity) * 100, 100) : 0;

  return (
    <>
      <PageHeader title={event.title || Locale.label("registrations.registrationDetailsPage.eventRegistrations")} subtitle={Locale.label("registrations.registrationDetailsPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <RegIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="h6">
                      {Locale.label("registrations.registrationDetailsPage.registrations")} ({count}{event.capacity ? ` / ${event.capacity}` : ""})
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
                      <Button startIcon={<PersonAddIcon />} size="small" variant="outlined" onClick={() => setShowAddAttendee(true)}>{Locale.label("registrations.registrationDetailsPage.addAttendee")}</Button>
                    )}
                    <Button startIcon={<DownloadIcon />} size="small" onClick={handleExportCSV}>{Locale.label("registrations.registrationDetailsPage.exportCsv")}</Button>
                  </Stack>
                </Stack>
                {event.capacity && (
                  <LinearProgress variant="determinate" value={capacityPct} color={capacityPct >= 100 ? "error" : "primary"} sx={{ mt: 1 }} />
                )}
                {event.formId && (
                  <Chip
                    label={Locale.label("registrations.registrationDetailsPage.unansweredOnly")}
                    size="small"
                    color={unansweredOnly ? "primary" : "default"}
                    variant={unansweredOnly ? "filled" : "outlined"}
                    onClick={() => setUnansweredOnly(!unansweredOnly)}
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
              {visibleRegistrations.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">{Locale.label("registrations.registrationDetailsPage.noRegistrations")}</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead sx={{ backgroundColor: "var(--bg-sub)" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationDetailsPage.name")}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationDetailsPage.members")}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationDetailsPage.status")}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationDetailsPage.date")}</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>{getRows()}</TableBody>
                </Table>
              )}
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <RegistrationSettingsEdit event={event} onUpdate={loadData} />
            <Box sx={{ mt: 2 }}>
              <EventReminderEdit eventId={event.id} hasRegistration={event.registrationEnabled} />
            </Box>
          </Grid>
        </Grid>
      </Box>
      {showAddAttendee && (
        <Dialog open onClose={() => setShowAddAttendee(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{Locale.label("registrations.registrationDetailsPage.addAttendee")}</DialogTitle>
          <DialogContent>
            {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}
            <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handleAddAttendee} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddAttendee(false)}>{Locale.label("common.cancel")}</Button>
          </DialogActions>
        </Dialog>
      )}
      {viewSubmissionId && (
        <Dialog open onClose={() => setViewSubmissionId("")} maxWidth="md" fullWidth>
          <DialogTitle>{Locale.label("registrations.registrationDetailsPage.viewAnswers")}</DialogTitle>
          <DialogContent>
            <FormSubmission formSubmissionId={viewSubmissionId} editFunction={() => {}} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewSubmissionId("")}>{Locale.label("common.close")}</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default RegistrationDetailsPage;
