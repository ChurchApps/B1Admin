import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiHelper, Locale, DateHelper } from "@churchapps/apphelper";
import { type TaskInterface } from "@churchapps/helpers";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip
} from "@mui/material";
import {
  GroupAdd as JoinRequestIcon,
  CheckCircle as ApproveIcon,
  Cancel as DeclineIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  ChatBubbleOutline as MessageIcon,
  CalendarToday as CalendarIcon
} from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  task: TaskInterface;
}

export const GroupJoinRequestTask: React.FC<Props> = ({ task }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requestData = React.useMemo(() => {
    try {
      return JSON.parse(task.data || "{}");
    } catch {
      return {};
    }
  }, [task.data]);

  const requestId = requestData.requestId;
  const groupId = requestData.groupId || task.assignedToId;
  const groupName = requestData.groupName || task.assignedToLabel || "Group";
  const personId = requestData.personId || task.associatedWithId;
  const personName = requestData.personName || task.associatedWithLabel || "Requester";
  const message = requestData.message;

  const isClosed = task.status === "Closed" || task.status === Locale.label("tasks.taskPage.closed");

  console.log(requestData, '--requestData');

  const handleApprove = useCallback(async () => {
    setSubmitting(true);
    setError("");
    try {
      if (requestId) {
        await ApiHelper.post(`/groupjoinrequests/${requestId}/approve`, {}, "MembershipApi");
      }
      const updatedTask: TaskInterface = {
        ...task,
        status: "Closed",
        dateClosed: new Date()
      };
      await ApiHelper.post("/tasks", [updatedTask], "DoingApi");
      queryClient.invalidateQueries({ queryKey: ["/tasks/" + task.id, "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/tasks", "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/tasks/closed", "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/groupjoinrequests/pending", "MembershipApi"] });
      navigate("/serving/tasks");
    } catch {
      setError(Locale.label("tasks.groupJoinRequest.approveError") || "Unable to approve join request.");
    } finally {
      setSubmitting(false);
    }
  }, [requestId, task, queryClient, navigate]);

  const handleDecline = useCallback(async () => {
    setSubmitting(true);
    setError("");
    try {
      if (requestId) {
        await ApiHelper.post(`/groupjoinrequests/${requestId}/decline`, { declineReason: declineReason || undefined }, "MembershipApi");
      }
      const updatedTask: TaskInterface = {
        ...task,
        status: "Closed",
        dateClosed: new Date()
      };
      await ApiHelper.post("/tasks", [updatedTask], "DoingApi");
      setDeclineOpen(false);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["/tasks/" + task.id, "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/tasks", "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/tasks/closed", "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/groupjoinrequests/pending", "MembershipApi"] });
      navigate("/serving/tasks");
    } catch {
      setError(Locale.label("tasks.groupJoinRequest.declineError") || "Unable to decline join request.");
    } finally {
      setSubmitting(false);
    }
  }, [requestId, declineReason, task, queryClient, navigate]);

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        mb: 3,
        transition: "all 0.2s ease-in-out",
        "&:hover": { boxShadow: 2 }
      }}
      data-testid="group-join-request-task"
    >
      <CardContent>
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <JoinRequestIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {Locale.label("tasks.groupJoinRequest.title") || "Group Join Request"}
              </Typography>
              <Chip
                label={task.status}
                size="small"
                color={isClosed ? "default" : "warning"}
                sx={{ fontWeight: 600 }}
              />
            </Stack>
            {!isClosed && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  disabled={submitting}
                  onClick={handleApprove}
                  data-testid="approve-join-request-button"
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  {Locale.label("tasks.groupJoinRequest.approve") || "Approve"}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeclineIcon />}
                  disabled={submitting}
                  onClick={() => setDeclineOpen(true)}
                  data-testid="decline-join-request-button"
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  {Locale.label("tasks.groupJoinRequest.decline") || "Decline"}
                </Button>
              </Stack>
            )}
          </Box>

          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <PersonIcon sx={{ color: "primary.main", fontSize: 22 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {Locale.label("tasks.groupJoinRequest.requester") || "Requester"}:{" "}
                  {personId ? (
                    <Typography component={Link} to={`/people/${personId}`} sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
                      {personName}
                    </Typography>
                  ) : (
                    personName
                  )}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <GroupIcon sx={{ color: "secondary.main", fontSize: 22 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {Locale.label("tasks.groupJoinRequest.group") || "Group"}:{" "}
                  {groupId ? (
                    <Typography component={Link} to={`/groups/${groupId}`} sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
                      {groupName}
                    </Typography>
                  ) : (
                    groupName
                  )}
                </Typography>
              </Box>

              {task.dateCreated && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CalendarIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">
                    {Locale.label("tasks.groupJoinRequest.requestedDate") || "Requested"}: {DateHelper.getDisplayDuration(new Date(task.dateCreated))} {Locale.label("tasks.taskPage.ago")} ({new Date(task.dateCreated).toLocaleString()})
                  </Typography>
                </Box>
              )}

              {message && (
                <Box sx={{ mt: 1, p: 2, bgcolor: "action.hover", borderRadius: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <MessageIcon sx={{ fontSize: 18, color: "text.secondary", mt: 0.3 }} />
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.5 }}>
                        {Locale.label("tasks.groupJoinRequest.message") || "Message from requester"}:
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                        "{message}"
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>

          {isClosed && (
            <Box
              sx={{
                p: 2,
                backgroundColor: "action.selected",
                borderRadius: 1.5,
                textAlign: "center"
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                {Locale.label("tasks.groupJoinRequest.resolved") || "This join request task is closed."}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} fullWidth maxWidth="sm" data-testid="decline-dialog">
        <DialogTitle>{Locale.label("tasks.groupJoinRequest.declineTitle") || "Decline Join Request"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            {Locale.label("tasks.groupJoinRequest.declinePrompt") || "Optionally provide a reason for declining this join request."}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            maxRows={5}
            label={Locale.label("tasks.groupJoinRequest.reasonOptional") || "Reason (optional)"}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            data-testid="decline-reason-input"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeclineOpen(false); setDeclineReason(""); }} disabled={submitting}>
            {Locale.label("common.cancel") || "Cancel"}
          </Button>
          <Button onClick={handleDecline} variant="contained" color="error" disabled={submitting} data-testid="confirm-decline-button">
            {Locale.label("tasks.groupJoinRequest.decline") || "Decline"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
