import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
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
  Description as DescriptionIcon,
  ReceiptLong as ReceiptIcon,
  ArrowUpward as PromoteIcon
} from "@mui/icons-material";
import { ApiHelper, Loading, Locale, PageHeader, UserHelper, Permissions, PersonHelper, CurrencyHelper } from "@churchapps/apphelper";
import { type PersonInterface } from "@churchapps/helpers";
import { PersonAdd, FormSubmission } from "../components";
import { useRequirePermission } from "../hooks";
import { RegistrationSettingsEdit } from "./components/RegistrationSettingsEdit";
import { RegistrationDetailDialog } from "./components/RegistrationDetailDialog";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CardWithHeader } from "../components/ui";
import { EventReminderEdit } from "../calendars/components/EventReminderEdit";
import { type CommerceEventInterface, type CommerceRegistrationInterface, type RegistrationTypeInterface, type RegistrationSelectionInterface } from "./registrationCommerce";

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
  const [event, setEvent] = useState<CommerceEventInterface | null>(null);
  const [registrations, setRegistrations] = useState<CommerceRegistrationInterface[]>([]);
  const [types, setTypes] = useState<RegistrationTypeInterface[]>([]);
  const [selections, setSelections] = useState<RegistrationSelectionInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [addError, setAddError] = useState("");
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [viewSubmissionId, setViewSubmissionId] = useState("");
  const [viewDetailId, setViewDetailId] = useState("");
  const [currency, setCurrency] = useState("usd");

  const loadData = async () => {
    if (!eventId) return;
    setLoading(true);
    const eventData: CommerceEventInterface = await ApiHelper.get("/events/" + eventId, "ContentApi");
    const [regsData, typesData, selData] = await Promise.all([
      ApiHelper.get("/registrations/event/" + eventId, "ContentApi"),
      ApiHelper.get(`/registrations/types/event/${eventId}?churchId=${eventData.churchId}`, "ContentApi"),
      ApiHelper.get(`/registrations/selections/event/${eventId}?churchId=${eventData.churchId}`, "ContentApi")
    ]);
    setEvent(eventData);
    setRegistrations(regsData || []);
    setTypes(typesData || []);
    setSelections(selData || []);
    setCount((regsData || []).filter((r: CommerceRegistrationInterface) => r.status !== "cancelled").length);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [eventId]);
  useEffect(() => { CurrencyHelper.loadCurrency().then(setCurrency); }, []);

  const denied = useRequirePermission(Permissions.contentApi.content.edit);

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

  const handlePromote = async (regId: string) => {
    await ApiHelper.post("/registrations/" + regId + "/promote", {}, "ContentApi");
    loadData();
  };

  const money = (n: number | null | undefined) => CurrencyHelper.formatCurrencyWithLocale(Number(n) || 0, currency);

  const typeMap = new Map<string, RegistrationTypeInterface>(types.map((t) => [t.id as string, t]));
  const selMap = new Map<string, RegistrationSelectionInterface>(selections.map((s) => [s.id as string, s]));

  const getTypeNames = (reg: CommerceRegistrationInterface) => {
    const names = new Set<string>();
    reg.members?.forEach((m) => { if (m.registrationTypeId && typeMap.get(m.registrationTypeId)) names.add(typeMap.get(m.registrationTypeId)!.name || ""); });
    return Array.from(names).filter(Boolean).join(", ");
  };

  const getTypeCounts = () => {
    const counts = new Map<string, number>();
    registrations.filter((r) => r.status !== "cancelled").forEach((r) => r.members?.forEach((m) => {
      if (m.registrationTypeId) counts.set(m.registrationTypeId, (counts.get(m.registrationTypeId) || 0) + 1);
    }));
    return counts;
  };

  const waitlistOrder = registrations.filter((r) => r.status === "waitlisted").sort((a, b) => new Date(a.registeredDate || 0).getTime() - new Date(b.registeredDate || 0).getTime());
  const waitlistPos = new Map<string, number>(waitlistOrder.map((r, i) => [r.id as string, i + 1]));

  const handleExportCSV = async () => {
    const detailMap = new Map<string, any>();
    const answerMap = new Map<string, Record<string, string>>();
    const questionTitles: string[] = [];
    const seenQ = new Set<string>();
    await Promise.all(registrations.map(async (reg) => {
      const detail = await ApiHelper.get(`/registrations/${reg.id}`, "ContentApi").catch(() => null);
      if (detail) detailMap.set(reg.id as string, detail);
      if (reg.formSubmissionId) {
        const sub = await ApiHelper.get(`/formsubmissions/${reg.formSubmissionId}/?include=questions,answers`, "MembershipApi").catch(() => null);
        if (sub) {
          const qById = new Map<string, string>((sub.questions || []).map((q: any) => [q.id, q.title]));
          (sub.questions || []).forEach((q: any) => { if (!seenQ.has(q.title)) { seenQ.add(q.title); questionTitles.push(q.title); } });
          const map: Record<string, string> = {};
          (sub.answers || []).forEach((a: any) => { const t = qById.get(a.questionId); if (t) map[t] = a.value; });
          answerMap.set(reg.id as string, map);
        }
      }
    }));

    const L = (k: string) => Locale.label("registrations." + k);
    const header = [
      L("registrationDetailsPage.csvName"),
      L("registrationDetailsPage.csvMembers"),
      L("commerce.attendeeTypes"),
      L("commerce.selections"),
      L("commerce.paid"),
      L("commerce.total"),
      L("commerce.balance"),
      L("registrationDetailsPage.csvStatus"),
      L("registrationDetailsPage.csvDate"),
      ...questionTitles
    ];
    const rows = [header];
    registrations.forEach((reg) => {
      const members = reg.members?.map((m) => `${m.firstName} ${m.lastName}`).join("; ") || "";
      const detail = detailMap.get(reg.id as string);
      const selText = (detail?.selectionChoices || []).map((c: any) => {
        const sel = selMap.get(c.selectionId);
        return `${sel?.name || c.selectionId}${(c.quantity || 1) > 1 ? ` x${c.quantity}` : ""}`;
      }).join("; ");
      const total = Number(reg.totalAmount) || 0;
      const paid = Number(reg.amountPaid) || 0;
      const answers = answerMap.get(reg.id as string) || {};
      rows.push([
        reg.personId || Locale.label("registrations.registrationDetailsPage.guest"),
        members,
        getTypeNames(reg),
        selText,
        money(paid),
        money(total),
        money(Math.max(0, total - paid)),
        reg.status || "",
        reg.registeredDate ? new Date(reg.registeredDate).toLocaleDateString() : "",
        ...questionTitles.map((t) => answers[t] || "")
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
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

  const getRows = () => visibleRegistrations.map((reg) => {
    const total = Number(reg.totalAmount) || 0;
    const paid = Number(reg.amountPaid) || 0;
    const balance = Math.max(0, total - paid);
    return (
      <TableRow key={reg.id} data-testid="registration-row">
        <TableCell>
          {reg.members && reg.members.length > 0
            ? reg.members.map((m) => `${m.firstName} ${m.lastName}`).join(", ")
            : reg.personId || Locale.label("registrations.registrationDetailsPage.unknown")
          }
        </TableCell>
        <TableCell align="right">{reg.members?.length || 0}</TableCell>
        <TableCell>{getTypeNames(reg)}</TableCell>
        <TableCell align="right">
          {total > 0 ? (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
              <Typography variant="body2">{money(paid)} / {money(total)}</Typography>
              {balance > 0 && <Chip size="small" color="warning" label={money(balance)} />}
            </Stack>
          ) : ""}
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {getStatusChip(reg.status)}
            {reg.status === "waitlisted" && waitlistPos.get(reg.id) && (
              <Typography variant="caption" color="text.secondary">#{waitlistPos.get(reg.id)}</Typography>
            )}
          </Stack>
        </TableCell>
        <TableCell>{reg.registeredDate ? new Date(reg.registeredDate).toLocaleDateString() : ""}</TableCell>
        <TableCell align="right" className="rowActions">
          <AppIconButton label={Locale.label("registrations.commerce.registrationDetails")} icon={<ReceiptIcon />} onClick={() => setViewDetailId(reg.id)} />
          {event?.formId && reg.formSubmissionId && (
            <AppIconButton label={Locale.label("registrations.registrationDetailsPage.viewAnswers")} icon={<DescriptionIcon />} onClick={() => setViewSubmissionId(reg.formSubmissionId)} />
          )}
          {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
            <>
              {reg.status === "waitlisted" && (
                <AppIconButton intent="add" label={Locale.label("registrations.commerce.promote")} icon={<PromoteIcon />} onClick={() => handlePromote(reg.id)} />
              )}
              {reg.status !== "cancelled" && (
                <AppIconButton label={Locale.label("registrations.registrationDetailsPage.cancelRegistration")} icon={<CancelIcon />} onClick={() => handleCancel(reg.id)} />
              )}
              <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => handleDelete(reg.id)} />
            </>
          )}
        </TableCell>
      </TableRow>
    );
  });

  if (denied) return denied;
  if (loading) return <Box sx={{ p: 3, textAlign: "center" }}><Loading /></Box>;
  if (!event) return <Typography>{Locale.label("registrations.registrationDetailsPage.eventNotFound")}</Typography>;

  const capacityPct = event.capacity ? Math.min((count / event.capacity) * 100, 100) : 0;

  return (
    <>
      <PageHeader icon={<RegIcon />} title={event.title || Locale.label("registrations.registrationDetailsPage.eventRegistrations")} subtitle={Locale.label("registrations.registrationDetailsPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <CardWithHeader
              title={`${Locale.label("registrations.registrationDetailsPage.registrations")} (${count}${event.capacity ? ` / ${event.capacity}` : ""})`}
              icon={<RegIcon sx={{ color: "primary.main", fontSize: 20 }} />}
              actions={(
                <Stack direction="row" spacing={1} alignItems="center">
                  {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
                    <Button startIcon={<PersonAddIcon />} size="small" variant="outlined" onClick={() => setShowAddAttendee(true)}>{Locale.label("registrations.registrationDetailsPage.addAttendee")}</Button>
                  )}
                  <Button startIcon={<DownloadIcon />} size="small" onClick={handleExportCSV}>{Locale.label("registrations.registrationDetailsPage.exportCsv")}</Button>
                </Stack>
              )}>
              {event.capacity ? (
                <LinearProgress variant="determinate" value={capacityPct} color={capacityPct >= 100 ? "error" : "primary"} sx={{ mb: 1 }} />
              ) : null}
              {types.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }} data-testid="type-counts">
                  {types.map((t) => (
                    <Chip key={t.id} size="small" variant="outlined" label={`${t.name}: ${getTypeCounts().get(t.id as string) || 0}`} />
                  ))}
                </Stack>
              )}
              {event.formId && (
                <Chip
                  label={Locale.label("registrations.registrationDetailsPage.unansweredOnly")}
                  size="small"
                  color={unansweredOnly ? "primary" : "default"}
                  variant={unansweredOnly ? "filled" : "outlined"}
                  onClick={() => setUnansweredOnly(!unansweredOnly)}
                  sx={{ mb: 1 }}
                />
              )}
              {visibleRegistrations.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">{Locale.label("registrations.registrationDetailsPage.noRegistrations")}</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{Locale.label("registrations.registrationDetailsPage.name")}</TableCell>
                      <TableCell align="right">{Locale.label("registrations.registrationDetailsPage.members")}</TableCell>
                      <TableCell>{Locale.label("registrations.commerce.type")}</TableCell>
                      <TableCell align="right">{Locale.label("registrations.commerce.paidTotal")}</TableCell>
                      <TableCell>{Locale.label("registrations.registrationDetailsPage.status")}</TableCell>
                      <TableCell>{Locale.label("registrations.registrationDetailsPage.date")}</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>{getRows()}</TableBody>
                </Table>
              )}
            </CardWithHeader>
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
      {viewDetailId && (
        <RegistrationDetailDialog registrationId={viewDetailId} typeMap={typeMap} selMap={selMap} onClose={() => setViewDetailId("")} />
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
