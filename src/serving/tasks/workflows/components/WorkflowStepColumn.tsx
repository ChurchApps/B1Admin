import { Box, Typography, Chip, Button, Stack } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Edit as EditIcon, Add as AddIcon, CheckCircleOutline as OutcomeIcon, CallSplit as AutoIcon, ArrowRightAlt as ArrowIcon, Bolt as ActionIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../../components/ui/AppIconButton";
import { DraggableWrapper } from "../../../../components/DraggableWrapper";
import { DroppableWrapper } from "../../../../components/DroppableWrapper";
import { ContentPicker } from "../../components/ContentPicker";
import { WorkflowCard } from "./WorkflowCard";
import { type WorkflowStepInterface, type TaskInterface, type WorkflowStepRouteInterface, type WorkflowInterface } from "@churchapps/helpers";
import { type WorkflowStepActionInterface } from "../types";

interface Props {
  workflowId: string;
  step: WorkflowStepInterface;
  cards: TaskInterface[];
  routes?: WorkflowStepRouteInterface[];
  actions?: WorkflowStepActionInterface[];
  steps?: WorkflowStepInterface[];
  workflows?: WorkflowInterface[];
  canEdit: boolean;
  canManage: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (cardId: string) => void;
  onDropCard: (cardId: string, stepId: string) => void;
  onOpenCard: (card: TaskInterface) => void;
  onEditStep: (step: WorkflowStepInterface) => void;
  onChanged: () => void;
}

export const WorkflowStepColumn = (props: Props) => {
  const { step, cards } = props;
  const [showPicker, setShowPicker] = React.useState(false);

  const routes = props.routes || [];
  const actions = props.actions || [];
  const stepName = (id?: string) => props.steps?.find((s) => s.id === id)?.name;
  const workflowName = (id?: string) => props.workflows?.find((w) => w.id === id)?.name;
  const routeTarget = (r: WorkflowStepRouteInterface) =>
    r.targetWorkflowId ? (workflowName(r.targetWorkflowId) || Locale.label("tasks.workflowRouting.sendToWorkflow"))
      : r.targetStepId ? stepName(r.targetStepId)
        : Locale.label("tasks.workflowRouting.closes");
  const routeSource = (r: WorkflowStepRouteInterface) =>
    r.trigger === "onComplete" ? (r.label || Locale.label("tasks.workflowCard.outcome"))
      : r.kind === "personMatch" ? Locale.label("tasks.workflowRouting.ifMatch")
        : Locale.label("tasks.workflowRouting.always");

  const handleAddCard = async (contentType: string, contentId: string, label: string) => {
    setShowPicker(false);
    if (contentType === "person") {
      await ApiHelper.post("/tasks/addToWorkflow", { workflowId: props.workflowId, stepId: step.id, associatedWith: { type: "person", id: contentId, label } }, "DoingApi");
    } else if (contentType === "group") {
      const members: { personId?: string; person?: { name?: { display?: string } } }[] = await ApiHelper.get("/groupmembers?groupId=" + contentId, "MembershipApi");
      const people = members.filter((m) => m.personId).map((m) => ({ id: m.personId, label: m.person?.name?.display }));
      await ApiHelper.post("/tasks/bulkAddToWorkflow", { workflowId: props.workflowId, stepId: step.id, people }, "DoingApi");
    }
    props.onChanged();
  };

  return (
    <Box data-testid={"workflow-column-" + step.id} sx={{ minWidth: 280, width: 280, flexShrink: 0, backgroundColor: "action.hover", borderRadius: 2, p: 1, mr: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{step.name}</Typography>
          <Chip size="small" label={cards.length} data-testid={"step-count-" + step.id} />
        </Stack>
        {props.canManage && (
          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => props.onEditStep(step)} data-testid={"edit-step-" + step.id} />
        )}
      </Stack>

      {actions.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" data-testid={"step-actions-" + step.id} sx={{ mb: 1, px: 0.5, color: "text.secondary" }}>
          <ActionIcon sx={{ fontSize: 13 }} />
          {actions.map((a) => (
            <Chip key={a.id} size="small" variant="outlined" label={Locale.label("tasks.workflowActions.type." + a.actionType)} sx={{ height: 18, fontSize: 11 }} />
          ))}
        </Stack>
      )}

      {routes.length > 0 && (
        <Box data-testid={"step-routes-" + step.id} sx={{ mb: 1, px: 0.5 }}>
          {routes.map((r) => (
            <Stack key={r.id} direction="row" alignItems="center" spacing={0.25} data-testid={"route-annotation-" + r.id} sx={{ color: "text.secondary", py: 0.1 }}>
              {r.trigger === "onComplete" ? <OutcomeIcon sx={{ fontSize: 13 }} /> : <AutoIcon sx={{ fontSize: 13 }} />}
              <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>{routeSource(r)}</Typography>
              <ArrowIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" noWrap sx={{ fontStyle: r.targetStepId ? "normal" : "italic" }}>
                {routeTarget(r)}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}

      <DroppableWrapper accept="workflowCard" onDrop={(d: any) => props.onDropCard(d.data.id, step.id)}>
        <Box sx={{ minHeight: 60 }}>
          {cards.map((card) => (
            <DraggableWrapper key={card.id} dndType="workflowCard" data={card} onDoubleClick={() => props.onOpenCard(card)}>
              <WorkflowCard
                card={card}
                selectable={props.canEdit}
                selected={props.selectedIds.has(card.id)}
                onToggleSelect={() => props.onToggleSelect(card.id)}
                onOpen={() => props.onOpenCard(card)}
              />
            </DraggableWrapper>
          ))}
        </Box>
      </DroppableWrapper>

      {props.canEdit && (
        <Button fullWidth size="small" startIcon={<AddIcon />} data-testid={"add-card-" + step.id} onClick={() => setShowPicker(true)} sx={{ mt: 1, textTransform: "none" }}>
          {Locale.label("tasks.workflowBoard.addCard")}
        </Button>
      )}

      {showPicker && <ContentPicker onClose={() => setShowPicker(false)} onSelect={handleAddCard} />}
    </Box>
  );
};
