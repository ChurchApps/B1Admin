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
    <Box
      data-testid={"workflow-column-" + step.id}
      sx={{
        minWidth: 290,
        width: 290,
        flexShrink: 0,
        backgroundColor: (theme) => theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
        backgroundImage: (theme) => theme.palette.mode === "dark" ? "linear-gradient(rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03))" : "none",
        borderRadius: 3,
        p: 2,
        mr: 2.5,
        border: "1px solid",
        borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)"
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, px: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary" }}>{step.name}</Typography>
          <Chip
            size="small"
            label={cards.length}
            data-testid={"step-count-" + step.id}
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              height: 20,
              minWidth: 20,
              backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0, 0, 0, 0.06)",
              color: "text.primary",
              "& .MuiChip-label": { px: 1 }
            }}
          />
        </Stack>
        {props.canManage && (
          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon sx={{ fontSize: 18 }} />} onClick={() => props.onEditStep(step)} data-testid={"edit-step-" + step.id} />
        )}
      </Stack>

      {actions.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" data-testid={"step-actions-" + step.id} sx={{ mb: 1.5, px: 0.5, color: "text.secondary" }}>
          <ActionIcon sx={{ fontSize: 13 }} />
          {actions.map((a) => (
            <Chip key={a.id} size="small" variant="outlined" label={Locale.label("tasks.workflowActions.type." + a.actionType)} sx={{ height: 18, fontSize: 11 }} />
          ))}
        </Stack>
      )}

      {routes.length > 0 && (
        <Box data-testid={"step-routes-" + step.id} sx={{ mb: 1.5, px: 0.5 }}>
          {routes.map((r) => (
            <Stack
              key={r.id}
              direction="row"
              alignItems="center"
              spacing={0.5}
              data-testid={"route-annotation-" + r.id}
              sx={{
                color: "text.secondary",
                py: 0.5,
                px: 1,
                mb: 0.5,
                borderRadius: 1,
                backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                border: "1px solid",
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"
              }}
            >
              {r.trigger === "onComplete" ? <OutcomeIcon sx={{ fontSize: 14, color: "success.main" }} /> : <AutoIcon sx={{ fontSize: 14, color: "info.main" }} />}
              <Typography variant="caption" noWrap sx={{ fontWeight: 600, fontSize: "0.7rem" }}>{routeSource(r)}</Typography>
              <ArrowIcon sx={{ fontSize: 12, color: "text.disabled" }} />
              <Typography variant="caption" noWrap sx={{ fontStyle: r.targetStepId ? "normal" : "italic", fontSize: "0.7rem", color: "text.primary", fontWeight: 500 }}>
                {routeTarget(r)}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}

      <DroppableWrapper accept="workflowCard" onDrop={(d: any) => props.onDropCard(d.data.id, step.id || "")}>
        <Box sx={{ minHeight: 60 }}>
          {cards.map((card) => (
            <DraggableWrapper key={card.id} dndType="workflowCard" data={card} onDoubleClick={() => props.onOpenCard(card)}>
              <WorkflowCard
                card={card}
                selectable={props.canEdit}
                selected={props.selectedIds.has(card.id || "")}
                onToggleSelect={() => props.onToggleSelect(card.id || "")}
                onOpen={() => props.onOpenCard(card)}
              />
            </DraggableWrapper>
          ))}
        </Box>
      </DroppableWrapper>

      {props.canEdit && (
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon />}
          data-testid={"add-card-" + step.id}
          onClick={() => setShowPicker(true)}
          sx={{
            mt: 1.5,
            py: 0.75,
            textTransform: "none",
            fontWeight: 500,
            borderRadius: 2,
            color: "primary.main",
            backgroundColor: "transparent",
            border: "1px dashed",
            borderColor: "rgba(25, 118, 210, 0.3)",
            "&:hover": {
              backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(25, 118, 210, 0.08)" : "rgba(25, 118, 210, 0.04)",
              borderColor: "primary.main"
            }
          }}
        >
          {Locale.label("tasks.workflowBoard.addCard")}
        </Button>
      )}

      {showPicker && <ContentPicker onClose={() => setShowPicker(false)} onSelect={handleAddCard} />}
    </Box>
  );
};
