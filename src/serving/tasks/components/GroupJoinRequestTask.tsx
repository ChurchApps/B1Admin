import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type TaskInterface } from "@churchapps/helpers";
import { Typography, Stack, Box, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { CheckCircle as ApproveIcon, Cancel as DeclineIcon } from "@mui/icons-material";
import { Surface } from "../../../components/ui";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  task: TaskInterface;
}

interface RequestData {
  requestId?: string;
  groupId?: string;
  groupName?: string;
  personId?: string;
  personName?: string;
  message?: string;
}

export const GroupJoinRequestTask = (props: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const data: RequestData = (() => {
    try { return JSON.parse(props.task.data || "{}"); } catch { return {}; }
  })();
  const isOpen = props.task.status === "Open";
  const personName = data.personName || props.task.associatedWithLabel || Locale.label("tasks.groupJoinRequest.requester", "Requester");
  const groupName = data.groupName || props.task.assignedToLabel || Locale.label("tasks.groupJoinRequest.group", "Group");
  const requestId = data.requestId;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/tasks/" + props.task.id, "DoingApi"] });
    queryClient.invalidateQueries({ queryKey: ["/tasks", "DoingApi"] });
    queryClient.invalidateQueries({ queryKey: ["/tasks/closed", "DoingApi"] });
    queryClient.invalidateQueries({ queryKey: ["/groupjoinrequests/pending", "MembershipApi"] });
  };

  const handleApprove = async () => {
    if (!requestId) {
      setError(Locale.label("tasks.groupJoinRequest.approveError", "Unable to approve join request."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await ApiHelper.post(`/groupjoinrequests/${requestId}/approve`, {}, "MembershipApi");
      refresh();
      navigate("/serving/tasks");
    } catch {
      setError(Locale.label("tasks.groupJoinRequest.approveError", "Unable to approve join request."));
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!requestId) {
      setError(Locale.label("tasks.groupJoinRequest.declineError", "Unable to decline join request."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await ApiHelper.post(`/groupjoinrequests/${requestId}/decline`, { declineReason: declineReason || undefined }, "MembershipApi");
      setDeclineOpen(false);
      refresh();
      navigate("/serving/tasks");
    } catch {
      setError(Locale.label("tasks.groupJoinRequest.declineError", "Unable to decline join request."));
      setBusy(false);
    }
  };

  return (
    <Surface sx={{ mb: 3 }} data-testid="group-join-request-task">
      <Stack spacing={2}>
        <Typography variant="h3" component="h2">{Locale.label("tasks.groupJoinRequest.title", "Group Join Request")}</Typography>

        <Typography variant="body2" color="text.secondary">
          {Locale.label("tasks.groupJoinRequest.description", "{name} asked to join {group}. Approving adds them to the group. Declining leaves them out.").replace("{name}", personName).replace("{group}", groupName)}
        </Typography>

        <Box>
          <Typography variant="body2">
            {Locale.label("tasks.groupJoinRequest.requester", "Requester")}:{" "}
            {data.personId
              ? <Typography component={Link} to={"/people/" + data.personId} sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>{personName}</Typography>
              : personName}
          </Typography>
          <Typography variant="body2">
            {Locale.label("tasks.groupJoinRequest.group", "Group")}:{" "}
            {data.groupId
              ? <Typography component={Link} to={"/groups/" + data.groupId} sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>{groupName}</Typography>
              : groupName}
          </Typography>
        </Box>

        {data.message
          ? (
            <Alert severity="info" icon={false} data-testid="group-join-request-message">
              {Locale.label("tasks.groupJoinRequest.message", "Message from requester")}: "{data.message}"
            </Alert>
          )
          : null}

        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

        {isOpen && (
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<ApproveIcon />} onClick={handleApprove} disabled={busy} data-testid="group-join-request-approve">
              {Locale.label("tasks.groupJoinRequest.approve", "Approve")}
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeclineIcon />} onClick={() => setDeclineOpen(true)} disabled={busy} data-testid="group-join-request-decline">
              {Locale.label("tasks.groupJoinRequest.decline", "Decline")}
            </Button>
          </Stack>
        )}

        {!isOpen && (
          <Alert severity="info" data-testid="group-join-request-resolved">
            {Locale.label("tasks.groupJoinRequest.resolved", "This join request task is closed.")}
          </Alert>
        )}
      </Stack>

      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} fullWidth maxWidth="sm" data-testid="group-join-request-decline-dialog">
        <DialogTitle>{Locale.label("tasks.groupJoinRequest.declineTitle", "Decline Join Request")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            {Locale.label("tasks.groupJoinRequest.declinePrompt", "Optionally provide a reason for declining this join request.")}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            maxRows={5}
            label={Locale.label("tasks.groupJoinRequest.reasonOptional", "Reason (optional)")}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            data-testid="group-join-request-decline-reason"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeclineOpen(false); setDeclineReason(""); }} disabled={busy}>{Locale.label("common.cancel", "Cancel")}</Button>
          <Button onClick={handleDecline} variant="contained" color="error" disabled={busy} data-testid="group-join-request-decline-confirm">
            {Locale.label("tasks.groupJoinRequest.decline", "Decline")}
          </Button>
        </DialogActions>
      </Dialog>
    </Surface>
  );
};
