import { Box, Typography, Stack, Chip } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { Bolt as ActionIcon, Edit as EditIcon, Snooze as SnoozeIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../../components/ui/AppIconButton";
import { type WorkflowStepInterface, type TaskInterface } from "@churchapps/helpers";
import { type WorkflowStepActionInterface } from "../types";

interface Props {
  step: WorkflowStepInterface;
  actions: WorkflowStepActionInterface[];
  cards: TaskInterface[]; // cards parked here (a delay waiting to wake)
  canManage: boolean;
  onEditStep: (step: WorkflowStepInterface) => void;
}

// Action steps are rendered as a thin connector between human columns — cards pass
// through them rather than resting there, so the board stays a "who owes what" view.
export const WorkflowActionConnector = (props: Props) => {
  const { step, actions, cards } = props;

  const summarize = (a: WorkflowStepActionInterface) => Locale.label("tasks.workflowActions.type." + (a.actionType || ""));

  return (
    <Box data-testid={"workflow-connector-" + step.id} sx={{ alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 140, width: 140, flexShrink: 0, mr: 2 }}>
      <Box sx={{ border: "1px dashed", borderColor: "primary.light", borderRadius: 2, p: 1, backgroundColor: "background.paper" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <ActionIcon sx={{ fontSize: 16, color: "primary.main" }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>{step.name}</Typography>
          </Stack>
          {props.canManage && <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon sx={{ fontSize: 14 }} />} onClick={() => props.onEditStep(step)} data-testid={"edit-step-" + step.id} />}
        </Stack>
        <Stack spacing={0.25}>
          {actions.map((a, i) => (
            <Typography key={a.id || i} variant="caption" color="text.secondary" noWrap data-testid={"connector-action-" + step.id + "-" + i}>• {summarize(a)}</Typography>
          ))}
          {actions.length === 0 && <Typography variant="caption" color="text.disabled" fontStyle="italic">{Locale.label("tasks.workflowActions.none")}</Typography>}
        </Stack>
        {cards.length > 0 && (
          <Chip size="small" icon={<SnoozeIcon sx={{ fontSize: 13 }} />} label={cards.length} data-testid={"connector-waiting-" + step.id} sx={{ mt: 0.5 }} />
        )}
      </Box>
    </Box>
  );
};
