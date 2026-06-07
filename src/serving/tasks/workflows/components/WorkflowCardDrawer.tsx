import { Drawer, Box, Typography, Stack, Button, Divider, MenuItem, Select, Menu } from "@mui/material";
import React, { useContext } from "react";
import { ApiHelper, type ConversationInterface, Notes, Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../../../components/ui/AppIconButton";
import { Close as CloseIcon, Person as PersonIcon, CheckCircle as CompleteIcon, Snooze as SnoozeIcon, SkipNext as SkipIcon, Undo as SendBackIcon, PushPin as PinIcon } from "@mui/icons-material";
import UserContext from "../../../../UserContext";
import { ContentPicker } from "../../components/ContentPicker";
import { type WorkflowStepInterface, type TaskInterface, type WorkflowStepRouteInterface } from "@churchapps/helpers";
import { canEditCard } from "../permissions";

interface Props {
  card: TaskInterface;
  steps: WorkflowStepInterface[];
  routes?: WorkflowStepRouteInterface[];
  onClose: () => void;
  onChanged: () => void;
}

export const WorkflowCardDrawer = (props: Props) => {
  const { card, steps } = props;
  // Outcome buttons configured for the card's current step.
  const outcomes = (props.routes || []).filter((r) => r.stepId === card.stepId && r.trigger === "onComplete");
  // Automated-action events recorded on the card by action steps (stored in data JSON).
  const history: { date?: string; message?: string }[] = (() => {
    if (!card.data) return [];
    try {
      const parsed = JSON.parse(card.data);
      return Array.isArray(parsed?.history) ? parsed.history : [];
    } catch {
      return [];
    }
  })();
  const context = useContext(UserContext);
  const [showPicker, setShowPicker] = React.useState(false);
  const [snoozeAnchor, setSnoozeAnchor] = React.useState<null | HTMLElement>(null);
  const editable = canEditCard(card);

  const reassign = async (contentType: string, contentId: string, label: string) => {
    setShowPicker(false);
    await ApiHelper.post("/tasks/" + card.id + "/reassign", { assignedToType: contentType, assignedToId: contentId, assignedToLabel: label }, "DoingApi");
    props.onChanged();
  };

  const moveStep = async (stepId: string) => {
    await ApiHelper.post("/tasks/" + card.id + "/moveStep", { stepId }, "DoingApi");
    props.onChanged();
  };

  const move = async (direction: "skip" | "sendBack") => {
    await ApiHelper.post("/tasks/" + card.id + "/" + direction, {}, "DoingApi");
    props.onChanged();
  };

  const togglePin = async () => {
    await ApiHelper.post("/tasks/" + card.id + "/pin", { pinned: !card.pinnedAssignment }, "DoingApi");
    props.onChanged();
  };

  const complete = async (routeId?: string) => {
    await ApiHelper.post("/tasks/" + card.id + "/complete", routeId ? { routeId } : {}, "DoingApi");
    props.onChanged();
    props.onClose();
  };

  const snooze = async (days: number) => {
    setSnoozeAnchor(null);
    await ApiHelper.post("/tasks/" + card.id + "/snooze", { days }, "DoingApi");
    props.onChanged();
  };

  const handleCreateConversation = async () => {
    const conv: ConversationInterface = {
      allowAnonymousPosts: false,
      contentType: "workflowCard",
      contentId: card.id,
      title: "Card " + card.id + " Notes",
      visibility: "hidden"
    };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");
    card.conversationId = result[0].id;
    await ApiHelper.post("/tasks", [card], "DoingApi");
    props.onChanged();
    return card.conversationId;
  };

  return (
    <Drawer anchor="right" open={true} onClose={props.onClose} sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }} PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}>
      <Box sx={{ p: 2 }} data-testid="workflow-card-drawer">
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{card.title || card.associatedWithLabel}</Typography>
          <AppIconButton label={Locale.label("common.close")} icon={<CloseIcon />} onClick={props.onClose} />
        </Stack>
        <Typography variant="body2" color="text.secondary">{Locale.label("tasks.workflowCard.assignedTo")}: {card.assignedToLabel || Locale.label("tasks.workflowBoard.unassigned")}</Typography>
        {card.pinnedAssignment && <Typography variant="caption" color="primary" data-testid="card-pinned-note">{Locale.label("tasks.workflowCard.pinnedNote")}</Typography>}

        <Stack spacing={2} sx={{ mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">{Locale.label("tasks.workflowBoard.step")}</Typography>
            <Select fullWidth size="small" value={card.stepId || ""} disabled={!editable} data-testid="card-step-select" onChange={(e) => moveStep(e.target.value)}>
              {steps.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </Box>

          {editable && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" startIcon={<SendBackIcon />} data-testid="card-sendback-button" onClick={() => move("sendBack")}>{Locale.label("tasks.workflowCard.sendBack")}</Button>
              <Button variant="outlined" size="small" startIcon={<SkipIcon />} data-testid="card-skip-button" onClick={() => move("skip")}>{Locale.label("tasks.workflowCard.skip")}</Button>
              <Button variant={card.pinnedAssignment ? "contained" : "outlined"} size="small" startIcon={<PinIcon />} data-testid="card-pin-button" onClick={togglePin}>{Locale.label("tasks.workflowCard.pin")}</Button>
            </Stack>
          )}

          {editable && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" startIcon={<PersonIcon />} onClick={() => setShowPicker(true)}>{Locale.label("tasks.workflowCard.assign")}</Button>
              <Button variant="outlined" size="small" startIcon={<SnoozeIcon />} data-testid="card-snooze-button" onClick={(e) => setSnoozeAnchor(e.currentTarget)}>{Locale.label("tasks.workflowCard.snooze")}</Button>
              {outcomes.length === 0 && (
                <Button variant="contained" size="small" color="success" startIcon={<CompleteIcon />} data-testid="card-complete-button" onClick={() => complete()}>{Locale.label("tasks.workflowCard.complete")}</Button>
              )}
            </Stack>
          )}

          {/* Outcome routing: completing via a named outcome can move the card on (or close it). */}
          {editable && outcomes.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">{Locale.label("tasks.workflowCard.outcome")}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {outcomes.map((o) => (
                  <Button key={o.id} variant="contained" size="small" color="success" startIcon={<CompleteIcon />} data-testid={"card-outcome-" + o.id} onClick={() => complete(o.id)}>{o.label}</Button>
                ))}
              </Stack>
            </Box>
          )}

          <Menu anchorEl={snoozeAnchor} open={Boolean(snoozeAnchor)} onClose={() => setSnoozeAnchor(null)}>
            <MenuItem onClick={() => snooze(1)} data-testid="snooze-1">{Locale.label("tasks.workflowCard.snooze1Day")}</MenuItem>
            <MenuItem onClick={() => snooze(3)}>{Locale.label("tasks.workflowCard.snooze3Days")}</MenuItem>
            <MenuItem onClick={() => snooze(7)}>{Locale.label("tasks.workflowCard.snooze1Week")}</MenuItem>
          </Menu>

          {history.length > 0 && (
            <Box data-testid="card-history">
              <Typography variant="caption" color="text.secondary">{Locale.label("tasks.workflowCard.history")}</Typography>
              <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                {history.map((h, i) => (
                  <Typography key={i} variant="caption" data-testid={"history-entry-" + i}>• {h.message}</Typography>
                ))}
              </Stack>
            </Box>
          )}

          <Divider />
          <Notes context={context} conversationId={card.conversationId} createConversation={handleCreateConversation} />
        </Stack>
      </Box>
      {showPicker && <ContentPicker onClose={() => setShowPicker(false)} onSelect={reassign} />}
    </Drawer>
  );
};
