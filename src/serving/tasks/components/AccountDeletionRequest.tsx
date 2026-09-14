import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiHelper, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { type TaskInterface } from "@churchapps/helpers";
import { Card, CardContent, Typography, Stack, Box, Button, Alert, Link, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { PersonRemove as DeletionIcon, CheckCircle as ApproveIcon, Block as RejectIcon } from "@mui/icons-material";
import { useConfirmDelete } from "../../../hooks";

interface Props {
  task: TaskInterface;
}

const REASON_PRESETS = [
  { id: "legalRetention", text: "We are required by law to keep some of this record (for example donation or tax records)." },
  { id: "legalClaim", text: "We need this record to establish, exercise, or defend a legal claim." },
  { id: "other", text: "" }
] as const;

const parseTaskData = (raw?: string) => {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
};

// Staff review of a member's self-service account deletion request. Approving runs the GDPR
// erasure (anonymize the person + remove their login); rejecting requires a reason and tells the member.
export const AccountDeletionRequest = (props: Props) => {
  const navigate = useNavigate();
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reasonId, setReasonId] = useState<string>("legalRetention");
  const [otherReason, setOtherReason] = useState("");

  const taskData = parseTaskData(props.task.data);
  const outcome: string | undefined = taskData.outcome;
  const storedReason: string | undefined = taskData.reason;
  const isOpen = props.task.status === "Open";
  const canApprove = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const personName = props.task.associatedWithLabel || Locale.label("tasks.accountDeletion.member", "this member");
  const rejectReason = reasonId === "other" ? otherReason.trim() : (REASON_PRESETS.find((r) => r.id === reasonId)?.text || "").trim();
  const canSubmitReject = rejectReason.length >= 10;

  const decide = async (body: { outcome: "approved" | "rejected"; reason?: string }) => {
    await ApiHelper.post("/tasks/" + props.task.id + "/accountDeletionDecision", body, "DoingApi");
    navigate("/serving/tasks");
  };

  const handleApprove = async () => {
    const message = Locale.label("tasks.accountDeletion.approveConfirm", "Permanently anonymize {name}'s record and remove their login? This cannot be undone.").replace("{name}", personName);
    if (!(await confirm(message, { confirmLabel: Locale.label("tasks.accountDeletion.approve", "Approve deletion") }))) return;
    setBusy(true);
    setError("");
    try {
      await decide({ outcome: "approved" });
    } catch (e: any) {
      setError(e?.message || Locale.label("tasks.accountDeletion.approveError", "The account could not be deleted."));
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!canSubmitReject) return;
    setBusy(true);
    setError("");
    try {
      await decide({ outcome: "rejected", reason: rejectReason });
    } catch (e: any) {
      setError(e?.message || Locale.label("tasks.accountDeletion.rejectError", "The request could not be closed."));
      setBusy(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", mb: 3 }} data-testid="account-deletion-request">
      {ConfirmDialogElement}
      <Dialog open={rejectOpen} onClose={() => !busy && setRejectOpen(false)} fullWidth maxWidth="sm" data-testid="account-deletion-reject-dialog">
        <DialogTitle>{Locale.label("tasks.accountDeletion.rejectTitle", "Decline this request")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <DialogContentText>
              {Locale.label("tasks.accountDeletion.rejectHelp", "GDPR only allows refusing erasure for a legal exception. The member will be told this reason.")}
            </DialogContentText>
            <FormControl>
              <FormLabel>{Locale.label("tasks.accountDeletion.rejectReasonLabel", "Reason")}</FormLabel>
              <RadioGroup value={reasonId} onChange={(e) => setReasonId(e.target.value)} data-testid="account-deletion-reject-reason">
                <FormControlLabel value="legalRetention" control={<Radio />} label={Locale.label("tasks.accountDeletion.reasonRetention", "Legal retention (donations, tax, employment)")} />
                <FormControlLabel value="legalClaim" control={<Radio />} label={Locale.label("tasks.accountDeletion.reasonClaim", "Needed for a legal claim")} />
                <FormControlLabel value="other" control={<Radio />} label={Locale.label("tasks.accountDeletion.reasonOther", "Other (explain below)")} />
              </RadioGroup>
            </FormControl>
            {reasonId === "other" && (
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={2}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                label={Locale.label("tasks.accountDeletion.reasonDetails", "Reason the member will see")}
                data-testid="account-deletion-reject-details"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectOpen(false)} disabled={busy} sx={{ textTransform: "none" }}>{Locale.label("common.cancel", "Cancel")}</Button>
          <Button variant="contained" disableElevation onClick={handleReject} disabled={busy || !canSubmitReject} data-testid="account-deletion-reject-confirm" sx={{ textTransform: "none", fontWeight: 600 }}>
            {Locale.label("tasks.accountDeletion.rejectConfirm", "Decline and notify")}
          </Button>
        </DialogActions>
      </Dialog>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeletionIcon sx={{ color: "error.main", fontSize: 20 }} />
            <Typography variant="h6">{Locale.label("tasks.accountDeletion.title", "Account Deletion Request")}</Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" data-testid="account-deletion-description">
            {Locale.label("tasks.accountDeletion.description", "{name} asked to delete their account. This is a right-to-erasure request: approve unless a legal exception applies. Approving anonymizes their record (name, contact details, notes and photo) and removes their login. The church has 30 days to decide. Declining requires a reason, which is sent to the member.").replace("{name}", personName)}
          </Typography>

          {props.task.associatedWithId && (
            <Box>
              <Link href={"/people/" + props.task.associatedWithId} onClick={(e) => { e.preventDefault(); navigate("/people/" + props.task.associatedWithId); }} data-testid="account-deletion-person">
                {Locale.label("tasks.accountDeletion.viewPerson", "View person")}: {personName}
              </Link>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {isOpen && !canApprove && <Alert severity="warning">{Locale.label("tasks.accountDeletion.needsPeopleEdit", "Approving requires the People > Edit permission.")}</Alert>}

          {isOpen && (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" color="error" startIcon={<ApproveIcon />} onClick={handleApprove} disabled={busy || !canApprove} data-testid="account-deletion-approve" sx={{ textTransform: "none", fontWeight: 600 }}>
                {Locale.label("tasks.accountDeletion.approve", "Approve deletion")}
              </Button>
              <Button variant="outlined" startIcon={<RejectIcon />} onClick={() => setRejectOpen(true)} disabled={busy || !canApprove} data-testid="account-deletion-reject" sx={{ textTransform: "none", fontWeight: 600 }}>
                {Locale.label("tasks.accountDeletion.reject", "Decline")}
              </Button>
            </Stack>
          )}

          {!isOpen && (
            <Alert severity={outcome === "approved" ? "success" : "info"} data-testid="account-deletion-outcome">
              {outcome === "approved"
                ? Locale.label("tasks.accountDeletion.approved", "Approved: the member's record was anonymized and their login was removed.")
                : Locale.label("tasks.accountDeletion.rejected", "Declined: nothing was changed and the member was told why.") + (storedReason ? " " + storedReason : "")}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
