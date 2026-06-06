import { Box, Typography, Chip, IconButton, Button, Stack } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Edit as EditIcon, Add as AddIcon, CheckCircleOutline as OutcomeIcon, CallSplit as AutoIcon, ArrowRightAlt as ArrowIcon } from "@mui/icons-material";
import { DraggableWrapper } from "../../../../components/DraggableWrapper";
import { DroppableWrapper } from "../../../../components/DroppableWrapper";
import { ContentPicker } from "../../components/ContentPicker";
import { WorkflowCard } from "./WorkflowCard";
import { type WorkflowStepInterface, type WorkflowCardInterface, type WorkflowStepRouteInterface } from "../interfaces";

interface Props {
  workflowId: string;
  step: WorkflowStepInterface;
  cards: WorkflowCardInterface[];
  routes?: WorkflowStepRouteInterface[];
  steps?: WorkflowStepInterface[];
  canEdit: boolean;
  canManage: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (cardId: string) => void;
  onDropCard: (cardId: string, stepId: string) => void;
  onOpenCard: (card: WorkflowCardInterface) => void;
  onEditStep: (step: WorkflowStepInterface) => void;
  onChanged: () => void;
}

export const WorkflowStepColumn = (props: Props) => {
  const { step, cards } = props;
  const [showPicker, setShowPicker] = React.useState(false);

  // Make the step's conditional routes legible on the board itself: each route
  // reads "<outcome / condition> → <target step or close>" under the header, so
  // the branch structure is visible even though columns lay out linearly.
  const routes = props.routes || [];
  const stepName = (id?: string) => props.steps?.find((s) => s.id === id)?.name;
  const routeSource = (r: WorkflowStepRouteInterface) =>
    r.trigger === "onComplete" ? (r.label || Locale.label("tasks.workflowCard.outcome"))
      : r.kind === "personMatch" ? Locale.label("tasks.workflowRouting.ifMatch")
        : Locale.label("tasks.workflowRouting.always");

  const handleAddCard = async (contentType: string, contentId: string, label: string) => {
    setShowPicker(false);
    if (contentType === "person") {
      // Drop the card directly on this column's step (not the workflow's first step).
      await ApiHelper.post("/tasks/addToWorkflow", { workflowId: props.workflowId, stepId: step.id, associatedWith: { type: "person", id: contentId, label } }, "DoingApi");
    } else if (contentType === "group") {
      // Adding a group expands to its members — one bulk request creates a card per person on this step.
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
          <IconButton size="small" onClick={() => props.onEditStep(step)} data-testid={"edit-step-" + step.id} aria-label={Locale.label("tasks.workflowStepEdit.editStep")}><EditIcon fontSize="small" /></IconButton>
        )}
      </Stack>

      {routes.length > 0 && (
        <Box data-testid={"step-routes-" + step.id} sx={{ mb: 1, px: 0.5 }}>
          {routes.map((r) => (
            <Stack key={r.id} direction="row" alignItems="center" spacing={0.25} data-testid={"route-annotation-" + r.id} sx={{ color: "text.secondary", py: 0.1 }}>
              {r.trigger === "onComplete" ? <OutcomeIcon sx={{ fontSize: 13 }} /> : <AutoIcon sx={{ fontSize: 13 }} />}
              <Typography variant="caption" noWrap sx={{ fontWeight: 600 }}>{routeSource(r)}</Typography>
              <ArrowIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" noWrap sx={{ fontStyle: r.targetStepId ? "normal" : "italic" }}>
                {r.targetStepId ? stepName(r.targetStepId) : Locale.label("tasks.workflowRouting.closes")}
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
