import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiHelper, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { type TaskInterface } from "@churchapps/helpers";
import { Card, CardContent, Typography, Stack, Box, Button, Alert, Link } from "@mui/material";
import { PersonRemove as DeletionIcon, CheckCircle as ApproveIcon, Block as RejectIcon } from "@mui/icons-material";
import { useConfirmDelete } from "../../../hooks";

interface Props {
  task: TaskInterface;
}

// Staff review of a member's self-service account deletion request. Approving runs the GDPR
// erasure (anonymize the person + remove their login); rejecting closes the task untouched.
export const AccountDeletionRequest = (props: Props) => {
  const navigate = useNavigate();
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const outcome: string | undefined = (() => {
    try { return JSON.parse(props.task.data || "{}").outcome; } catch { return undefined; }
  })();
  const isOpen = props.task.status === "Open";
  const canApprove = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const personName = props.task.associatedWithLabel || Locale.label("tasks.accountDeletion.member", "this member");

  const closeTask = async (result: "approved" | "rejected") => {
    const task: TaskInterface = { ...props.task, status: "Closed", dateClosed: new Date(), data: JSON.stringify({ outcome: result }) };
    await ApiHelper.post("/tasks", [task], "DoingApi");
    navigate("/serving/tasks");
  };

  const handleApprove = async () => {
    const message = Locale.label("tasks.accountDeletion.approveConfirm", "Permanently anonymize {name}'s record and remove their login? This cannot be undone.").replace("{name}", personName);
    if (!(await confirm(message, { confirmLabel: Locale.label("tasks.accountDeletion.approve", "Approve deletion") }))) return;
    setBusy(true);
    setError("");
    try {
      await ApiHelper.delete("/gdpr/people/" + props.task.associatedWithId + "/anonymize", "MembershipApi");
      await closeTask("approved");
    } catch (e: any) {
      setError(e?.message || Locale.label("tasks.accountDeletion.approveError", "The account could not be deleted."));
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    setError("");
    try {
      await closeTask("rejected");
    } catch (e: any) {
      setError(e?.message || Locale.label("tasks.accountDeletion.rejectError", "The request could not be closed."));
      setBusy(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", mb: 3 }} data-testid="account-deletion-request">
      {ConfirmDialogElement}
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeletionIcon sx={{ color: "error.main", fontSize: 20 }} />
            <Typography variant="h6">{Locale.label("tasks.accountDeletion.title", "Account Deletion Request")}</Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {Locale.label("tasks.accountDeletion.description", "{name} asked to delete their account. Approving anonymizes their record across the church (name, contact details, notes and photo) and removes their login. This cannot be undone. Rejecting leaves everything as it is.").replace("{name}", personName)}
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
              <Button variant="outlined" startIcon={<RejectIcon />} onClick={handleReject} disabled={busy} data-testid="account-deletion-reject" sx={{ textTransform: "none", fontWeight: 600 }}>
                {Locale.label("tasks.accountDeletion.reject", "Reject")}
              </Button>
            </Stack>
          )}

          {!isOpen && (
            <Alert severity={outcome === "approved" ? "success" : "info"} data-testid="account-deletion-outcome">
              {outcome === "approved"
                ? Locale.label("tasks.accountDeletion.approved", "Approved: the member's record was anonymized and their login was removed.")
                : Locale.label("tasks.accountDeletion.rejected", "Request rejected: nothing was changed and the member keeps their account.")}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
